const request = require("supertest");
const app = require("../../src/app");
const prisma = require("../../src/utils/prisma.util");
const jwt = require("jsonwebtoken");

describe("Integration Test: Note API Endpoints", () => {
	let testUserId;
	let validToken;
	let createdNoteId; // Lưu lại ID của Note để dùng cho các bài test Update/Delete

	// ==========================================
	// SETUP: Chuẩn bị User và Token hợp lệ
	// ==========================================
	beforeAll(async () => {
		// 1. Dọn dẹp Database
		await prisma.note.deleteMany();
		await prisma.user.deleteMany({
			where: { email: "note_integration@snapify.com" },
		});

		// 2. Tạo User thật dưới DB
		const testUser = await prisma.user.create({
			data: {
				email: "note_integration@snapify.com",
				displayName: "Note Tester",
				passwordHash: "hashed_password", // Không quan trọng vì ta tự ký token
			},
		});
		testUserId = testUser.id;

		// 3. Tự ký JWT Token hợp lệ
		const secretKey =
			process.env.JWT_SECRET || "snapify_secret_key_development";
		validToken = jwt.sign(
			{ id: testUserId, email: testUser.email },
			secretKey,
			{ expiresIn: "1h" },
		);
	});

	afterAll(async () => {
		await prisma.note.deleteMany();
		await prisma.user.deleteMany({
			where: { email: "note_integration@snapify.com" },
		});
		await prisma.$disconnect();
	});

	// ==========================================
	// KỊCH BẢN 1: KIỂM TRA BẢO MẬT (AUTH GUARD)
	// ==========================================
	describe("Bảo mật Middleware", () => {
		test("Nên chặn (401) nếu gọi API Note mà không có Token", async () => {
			const response = await request(app).get("/api/notes");
			expect(response.status).toBe(401);
		});
	});

	// ==========================================
	// KỊCH BẢN 2: TẠO GHI CHÚ THỦ CÔNG (POST /)
	// ==========================================
	describe("POST /api/notes", () => {
		test("Nên tạo ghi chú thành công và lưu vào DB", async () => {
			const response = await request(app)
				.post("/api/notes")
				.set("Authorization", `Bearer ${validToken}`)
				.send({
					title: "Ghi chú Integration Test",
					content: "Nội dung test luồng dữ liệu thật",
				});

			expect(response.status).toBe(201);
			expect(response.body.data.title).toBe("Ghi chú Integration Test");
			expect(response.body.data.status).toBe("ACTIONED"); // Theo logic trong service

			// Lưu lại ID để test tiếp
			createdNoteId = response.body.data.id;
		});
		test("Nên tạo ghi chú bằng imageUrl truyền qua body (Phục hồi khi OCR lỗi)", async () => {
			const response = await request(app)
				.post("/api/notes")
				.set("Authorization", `Bearer ${validToken}`)
				.send({
					title: "Ghi chú từ URL ảnh cũ",
					content: "Người dùng tự nhập tay",
					imageUrl: "http://old-image.com/img.jpg",
				});

			expect(response.status).toBe(201);
			expect(response.body.data.title).toBe("Ghi chú từ URL ảnh cũ");
		});

		test("Nên tạo ghi chú thủ công có đính kèm file ảnh upload mới (multipart/form-data)", async () => {
			// Mock dịch vụ Cloudflare để không up file thật
			const cloudflareService = require("../../src/services/cloudflare.service");
			jest
				.spyOn(cloudflareService, "uploadFileToR2")
				.mockResolvedValue("http://r2-image-url.com/img.jpg");

			const response = await request(app)
				.post("/api/notes")
				.set("Authorization", `Bearer ${validToken}`)
				.field("title", "Ghi chú có file ảnh")
				.field("content", "Nội dung ghi chú")
				.attach("image", Buffer.from("fake-image"), "test.jpg");

			expect(response.status).toBe(201);
			expect(response.body.data.title).toBe("Ghi chú có file ảnh");

			// Đảm bảo hàm upload ảnh đã được gọi
			expect(cloudflareService.uploadFileToR2).toHaveBeenCalled();

			// Dọn dẹp mock
			cloudflareService.uploadFileToR2.mockRestore();
		});
	});

	// ==========================================
	// KỊCH BẢN 3: TÌM KIẾM GHI CHÚ (GET /search)
	// ==========================================
	describe("GET /api/notes/search", () => {
		test("Nên tìm thấy ghi chú vừa tạo", async () => {
			const response = await request(app)
				.get("/api/notes/search?q=Integration")
				.set("Authorization", `Bearer ${validToken}`);

			expect(response.status).toBe(200);
			expect(response.body.data).toBeInstanceOf(Array);
			expect(response.body.data.length).toBeGreaterThan(0);
			expect(response.body.data[0].title).toContain("Integration Test");
		});

		test("Nên trả về mảng rỗng nếu từ khóa không tồn tại", async () => {
			const response = await request(app)
				.get("/api/notes/search?q=KhongCoTuKhoaNayDau")
				.set("Authorization", `Bearer ${validToken}`);

			expect(response.status).toBe(200);
			expect(response.body.data).toHaveLength(0);
		});
	});

	// ==========================================
	// KỊCH BẢN 4: LẤY CHI TIẾT 1 GHI CHÚ (GET /:id)
	// ==========================================
	describe("GET /api/notes/:id", () => {
		test("Nên lấy đúng chi tiết ghi chú của mình", async () => {
			const response = await request(app)
				.get(`/api/notes/${createdNoteId}`)
				.set("Authorization", `Bearer ${validToken}`);

			expect(response.status).toBe(200);
			expect(response.body.data.id).toBe(createdNoteId);
		});

		test("Nên báo lỗi 404 nếu ghi chú không tồn tại", async () => {
			const response = await request(app)
				.get("/api/notes/fake-id-123")
				.set("Authorization", `Bearer ${validToken}`);

			expect(response.status).toBe(404);
		});
	});

	// ==========================================
	// KỊCH BẢN 5: CẬP NHẬT GHI CHÚ (PUT /:id)
	// ==========================================
	describe("PUT /api/notes/:id", () => {
		test("Nên cập nhật thành công tiêu đề và trạng thái", async () => {
			const response = await request(app)
				.put(`/api/notes/${createdNoteId}`)
				.set("Authorization", `Bearer ${validToken}`)
				.send({
					title: "Tiêu đề đã được Update",
					status: "ARCHIVED", // Mảng validStatuses trong controller có chứa ARCHIVED
				});

			expect(response.status).toBe(200);
			expect(response.body.data.title).toBe("Tiêu đề đã được Update");

			// Xác minh DB đã thực sự thay đổi
			const noteInDb = await prisma.note.findUnique({
				where: { id: createdNoteId },
			});
			expect(noteInDb.status).toBe("ARCHIVED");
		});
	});

	// ==========================================
	// KỊCH BẢN 8: CÁC TÍNH NĂNG SMART (Actions & Categorize)
	// ==========================================
	describe("AI Features (Mocked in Integration)", () => {
		test("Nên trả về danh sách actions thông minh", async () => {
			const response = await request(app)
				.get(`/api/notes/${createdNoteId}/actions`)
				.set("Authorization", `Bearer ${validToken}`);

			expect(response.status).toBe(200);
		}, 15000);

		test("Nên phân loại tự động thành công mà không tốn tiền API thật", async () => {
			// Dùng tuyệt chiêu Mock dịch vụ Gemini ngay trong Integration Test
			const geminiService = require("../../src/services/gemini.service");
			jest.spyOn(geminiService, "suggestFolderForNote").mockResolvedValue({
				action: "CREATE_NEW",
				newFolderName: "Thư mục Auto-Test",
			});

			const response = await request(app)
				.post(`/api/notes/${createdNoteId}/categorize`)
				.set("Authorization", `Bearer ${validToken}`);

			expect(response.status).toBe(200);

			// Dọn dẹp Mock trả lại như cũ
			geminiService.suggestFolderForNote.mockRestore();
		});
	});

	// ==========================================
	// KỊCH BẢN 6: XÓA GHI CHÚ (DELETE /:id)
	// ==========================================
	describe("DELETE /api/notes/:id", () => {
		test("Nên xóa ghi chú thành công", async () => {
			const response = await request(app)
				.delete(`/api/notes/${createdNoteId}`)
				.set("Authorization", `Bearer ${validToken}`);

			expect(response.status).toBe(200);
			expect(response.body.message).toContain("thành công");

			// Kiểm tra lại dưới DB xem còn không
			const noteInDb = await prisma.note.findUnique({
				where: { id: createdNoteId },
			});
			expect(noteInDb).toBeNull();
		});
	});
	// ==========================================
	// KỊCH BẢN 7: LẤY DANH SÁCH & PHÂN TRANG (GET /)
	// ==========================================
	describe("GET /api/notes", () => {
		test("Nên lấy danh sách ghi chú thành công có phân trang", async () => {
			const response = await request(app)
				.get("/api/notes?page=1&limit=10")
				.set("Authorization", `Bearer ${validToken}`);

			expect(response.status).toBe(200);
			expect(response.body.data).toHaveProperty("notes");
			expect(response.body.data).toHaveProperty("pagination");
		});
	});
	// ==========================================
	// KỊCH BẢN 8: TẠO GHI CHÚ BẰNG AI (POST /snap)
	// ==========================================
	describe("POST /api/notes/snap", () => {
		test("Nên trả về 202 Accepted và ID bản nháp ngay lập tức (Fire & Forget)", async () => {
			// Mock AI và Cloudflare để không gọi thật (Tránh tốn tiền và lỗi Timeout khi test)
			const cloudflareService = require("../../src/services/cloudflare.service");
			const geminiService = require("../../src/services/gemini.service");
			jest
				.spyOn(cloudflareService, "uploadFileToR2")
				.mockResolvedValue("http://mock-url.com/image.jpg");
			jest
				.spyOn(geminiService, "generateNoteFromImage")
				.mockResolvedValue({ title: "Mock AI", content: "Nội dung AI" });

			const response = await request(app)
				.post("/api/notes/snap")
				.set("Authorization", `Bearer ${validToken}`)
				.attach("image", Buffer.from("fake-image-content"), "test.jpg"); // Giả lập gửi file ảnh

			expect(response.status).toBe(202);
			expect(response.body.data).toHaveProperty("id");
			expect(response.body.message).toContain("đang xử lý");

			// Dọn dẹp mock
			cloudflareService.uploadFileToR2.mockRestore();
			geminiService.generateNoteFromImage.mockRestore();
		});

		test("Nên trả về lỗi 500 và nhảy vào next(error) nếu Database sập lúc tạo bản nháp", async () => {
			// Giả lập DB bị lỗi ngay lúc tạo bản nháp PENDING
			jest
				.spyOn(prisma.note, "create")
				.mockRejectedValue(new Error("Database Timeout"));

			const response = await request(app)
				.post("/api/notes/snap")
				.set("Authorization", `Bearer ${validToken}`)
				.attach("image", Buffer.from("fake-image"), "test.jpg");

			expect(response.status).toBe(500);
			prisma.note.create.mockRestore(); // Trả lại DB bình thường
		});

		test("Nên bắt và log lỗi ngầm (.catch) nếu service Background bị crash cứng", async () => {
			// Giả lập việc hàm Background bị ném lỗi cứng
			const noteService = require("../../src/services/note.service");
			jest
				.spyOn(noteService, "processImageToNoteBackground")
				.mockRejectedValue(new Error("Crash Background"));

			// Tắt console.error tạm thời để màn hình test không bị rác
			const consoleSpy = jest
				.spyOn(console, "error")
				.mockImplementation(() => {});

			const response = await request(app)
				.post("/api/notes/snap")
				.set("Authorization", `Bearer ${validToken}`)
				.attach("image", Buffer.from("fake-image"), "test.jpg");

			// Frontend VẪN NHẬN ĐƯỢC 202 vì lỗi xảy ra ở luồng chạy ngầm
			expect(response.status).toBe(202);
			expect(consoleSpy).toHaveBeenCalled(); // Xác nhận log lỗi đã chạy

			noteService.processImageToNoteBackground.mockRestore();
			consoleSpy.mockRestore();
		});
	});
});
