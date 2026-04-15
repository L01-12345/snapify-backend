const request = require("supertest");
const app = require("../../src/app");
const prisma = require("../../src/utils/prisma.util");
const jwt = require("jsonwebtoken");

describe("Integration Test: Folder API Endpoints", () => {
	let testUserId;
	let validToken;
	let createdFolderId;
	let secondaryFolderId;

	// ==========================================
	// SETUP: Chuẩn bị Môi trường & User
	// ==========================================
	beforeAll(async () => {
		// Tạm thời tắt log lỗi để terminal sạch sẽ khi test các case 400/404
		jest.spyOn(console, "error").mockImplementation(() => {});

		// Dọn dẹp Database
		await prisma.note.deleteMany();
		await prisma.folder.deleteMany();
		await prisma.user.deleteMany({
			where: { email: "folder_integration@snapify.com" },
		});

		// Tạo User giả lập
		const testUser = await prisma.user.create({
			data: {
				email: "folder_integration@snapify.com",
				displayName: "Folder Tester",
				passwordHash: "hashed_password",
			},
		});
		testUserId = testUser.id;

		// Tự ký JWT Token
		const secretKey =
			process.env.JWT_SECRET || "snapify_secret_key_development";
		validToken = jwt.sign(
			{ id: testUserId, email: testUser.email },
			secretKey,
			{ expiresIn: "1h" },
		);
	});

	afterAll(async () => {
		console.error.mockRestore();
		await prisma.note.deleteMany();
		await prisma.folder.deleteMany();
		await prisma.user.deleteMany({
			where: { email: "folder_integration@snapify.com" },
		});
		await prisma.$disconnect();
	});

	// ==========================================
	// KỊCH BẢN 1: BẢO MẬT (AUTH GUARD)
	// ==========================================
	describe("Bảo mật Middleware", () => {
		test("Nên chặn (401) nếu không có Token", async () => {
			const response = await request(app).get("/api/folders");
			expect(response.status).toBe(401);
		});
	});

	// ==========================================
	// KỊCH BẢN 2: TẠO THƯ MỤC (POST /)
	// ==========================================
	describe("POST /api/folders", () => {
		test("Nên tạo thư mục thành công", async () => {
			const response = await request(app)
				.post("/api/folders")
				.set("Authorization", `Bearer ${validToken}`)
				.send({
					name: "Tài liệu Học tập",
					description: "Lưu trữ tài liệu trên trường",
				});

			expect(response.status).toBe(201);
			expect(response.body.data.name).toBe("Tài liệu Học tập");
			expect(response.body.data.type).toBe("MANUAL");

			createdFolderId = response.body.data.id;
		});

		test("Nên chặn (400) nếu tạo thư mục trùng tên", async () => {
			const response = await request(app)
				.post("/api/folders")
				.set("Authorization", `Bearer ${validToken}`)
				.send({ name: "Tài liệu Học tập" });

			expect(response.status).toBe(400);
			expect(response.body.message).toContain("đã tồn tại");
		});

		test("Nên chặn (400) nếu tên thư mục rỗng", async () => {
			const response = await request(app)
				.post("/api/folders")
				.set("Authorization", `Bearer ${validToken}`)
				.send({ name: "   " });

			expect(response.status).toBe(400);
			expect(response.body.message).toContain("không được để trống");
		});
	});

	// ==========================================
	// KỊCH BẢN 3: LẤY DANH SÁCH THƯ MỤC (GET /)
	// ==========================================
	describe("GET /api/folders", () => {
		test("Nên lấy danh sách thư mục kèm số lượng notes", async () => {
			const response = await request(app)
				.get("/api/folders")
				.set("Authorization", `Bearer ${validToken}`);

			expect(response.status).toBe(200);
			expect(response.body.data).toBeInstanceOf(Array);
			expect(response.body.data.length).toBeGreaterThan(0);
			expect(response.body.data[0]).toHaveProperty("_count");
		});
	});

	// ==========================================
	// KỊCH BẢN 4: LẤY CHI TIẾT THƯ MỤC (GET /:id)
	// ==========================================
	describe("GET /api/folders/:id", () => {
		test("Nên lấy chi tiết thư mục thành công", async () => {
			const response = await request(app)
				.get(`/api/folders/${createdFolderId}`)
				.set("Authorization", `Bearer ${validToken}`);

			expect(response.status).toBe(200);
			expect(response.body.data.id).toBe(createdFolderId);
		});

		test("Nên báo lỗi 404 nếu ID thư mục không tồn tại", async () => {
			const response = await request(app)
				.get("/api/folders/fake-id-123")
				.set("Authorization", `Bearer ${validToken}`);

			expect(response.status).toBe(404);
		});
	});

	// ==========================================
	// KỊCH BẢN 5: CẬP NHẬT THƯ MỤC (PUT /:id)
	// ==========================================
	describe("PUT /api/folders/:id", () => {
		test("Nên cập nhật tên thư mục thành công", async () => {
			const response = await request(app)
				.put(`/api/folders/${createdFolderId}`)
				.set("Authorization", `Bearer ${validToken}`)
				.send({ name: "Tài liệu Đồ án" });

			expect(response.status).toBe(200);
			expect(response.body.data.name).toBe("Tài liệu Đồ án");
		});

		test("Nên chặn cập nhật nếu tên mới bị trùng với thư mục khác", async () => {
			// 1. Tạo thêm thư mục thứ 2
			const folder2 = await prisma.folder.create({
				data: { userId: testUserId, name: "Tài liệu Cá nhân", type: "MANUAL" },
			});
			secondaryFolderId = folder2.id;

			// 2. Cố tình đổi tên thư mục 1 thành tên của thư mục 2
			const response = await request(app)
				.put(`/api/folders/${createdFolderId}`)
				.set("Authorization", `Bearer ${validToken}`)
				.send({ name: "Tài liệu Cá nhân" });

			expect(response.status).toBe(400);
		});
	});

	// ==========================================
	// KỊCH BẢN 6: XÓA THƯ MỤC & TOÀN VẸN DỮ LIỆU (DELETE /:id)
	// ==========================================
	describe("DELETE /api/folders/:id", () => {
		test("Nên xóa thư mục và đẩy các Ghi chú bên trong ra ngoài an toàn", async () => {
			// 1. Tạo một Ghi chú và nhét nó vào thư mục secondaryFolderId
			const testNote = await prisma.note.create({
				data: {
					userId: testUserId,
					title: "Ghi chú cần bảo vệ",
					content: "Nội dung test",
					status: "ACTIONED",
					folderId: secondaryFolderId,
				},
			});

			// 2. Gọi API xóa thư mục
			const response = await request(app)
				.delete(`/api/folders/${secondaryFolderId}`)
				.set("Authorization", `Bearer ${validToken}`);

			expect(response.status).toBe(200);
			expect(response.body.message).toContain(
				"di chuyển các ghi chú ra ngoài an toàn",
			);

			// 3. XÁC MINH CỰC KỲ QUAN TRỌNG: Kiểm tra Ghi chú xem có bị xóa mất không?
			const noteInDb = await prisma.note.findUnique({
				where: { id: testNote.id },
			});
			expect(noteInDb).not.toBeNull(); // Ghi chú vẫn phải còn tồn tại
			expect(noteInDb.folderId).toBeNull(); // Nhưng folderId phải bị set về null (Chưa phân loại)
		});
	});
});
