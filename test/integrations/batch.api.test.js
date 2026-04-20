const request = require("supertest");
const app = require("../../src/app");
const prisma = require("../../src/utils/prisma.util");
const jwt = require("jsonwebtoken");

// Require batchService để thực hiện Mock hàm xử lý file phức tạp
const batchService = require("../../src/services/batch.service");

describe("Integration Test: Batch API Endpoints", () => {
	let testUserId;
	let validToken;
	let createdBatchId;
	let testFolderId;

	// ==========================================
	// SETUP: Chuẩn bị Môi trường
	// ==========================================
	beforeAll(async () => {
		jest.spyOn(console, "error").mockImplementation(() => {});

		// Dọn dẹp dữ liệu cũ (Xóa có mục tiêu để tránh Race Condition)
		await prisma.batchDocument.deleteMany();
		await prisma.user.deleteMany({
			where: { email: "batch_integration@snapify.com" },
		});

		// 1. Tạo User
		const testUser = await prisma.user.create({
			data: {
				email: "batch_integration@snapify.com",
				displayName: "Batch Tester",
				passwordHash: "hashed_password",
			},
		});
		testUserId = testUser.id;

		// 2. Tạo một Thư mục để test tính năng di chuyển PDF
		const testFolder = await prisma.folder.create({
			data: { userId: testUserId, name: "Thư mục PDF", type: "MANUAL" },
		});
		testFolderId = testFolder.id;

		// 3. Ký Token
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
		await prisma.batchDocument.deleteMany();
		await prisma.folder.deleteMany({ where: { userId: testUserId } });
		await prisma.user.deleteMany({
			where: { email: "batch_integration@snapify.com" },
		});
		await prisma.$disconnect();
	});

	// ==========================================
	// KỊCH BẢN 1: SCAN VÀ TẠO PDF (POST /scan)
	// ==========================================
	describe("POST /api/batches/scan", () => {
		test("Nên nhận diện request upload file và gọi Service tạo PDF thành công", async () => {
			// Dùng tuyệt chiêu Mock chặn đứng việc sinh PDF thật và gọi Cloudflare
			jest.spyOn(batchService, "createPDFFromUploads").mockResolvedValue({
				id: "mock_generated_batch_id",
				userId: testUserId,
				title: "Tài liệu Scan (Mock)",
				pdfUrl: "https://mock-storage.com/test-scan.pdf",
			});

			// Supertest giả lập hành vi Frontend upload 1 file ảnh
			const response = await request(app)
				.post("/api/batches/scan")
				.set("Authorization", `Bearer ${validToken}`)
				.field("title", "Tài liệu Scan (Mock)") // Gửi body text
				.attach(
					"images",
					Buffer.from("fake image binary data"),
					"test_image.jpg",
				); // Gửi file

			expect(response.status).toBe(201);
			expect(response.body.data.title).toBe("Tài liệu Scan (Mock)");
			expect(response.body.data.pdfUrl).toBeDefined();

			// Dọn dẹp Mock trả lại hàm gốc cho hệ thống
			batchService.createPDFFromUploads.mockRestore();
		});
	});

	// ==========================================
	// KỊCH BẢN 2: LẤY DANH SÁCH PDF (GET /)
	// ==========================================
	describe("GET /api/batches", () => {
		test("Nên lấy danh sách tài liệu PDF của user", async () => {
			// Bơm một dữ liệu thật vào DB để test các API Get/Update/Delete
			const realBatch = await prisma.batchDocument.create({
				data: {
					userId: testUserId,
					title: "Tài liệu Bách Khoa",
					pdfUrl: "https://real-cloudflare-link.com/document.pdf",
				},
			});
			createdBatchId = realBatch.id; // Giữ lại ID thật này cho kịch bản sau

			const response = await request(app)
				.get("/api/batches")
				.set("Authorization", `Bearer ${validToken}`);

			expect(response.status).toBe(200);
			expect(response.body.data).toBeInstanceOf(Array);
			expect(response.body.data.length).toBeGreaterThan(0);
		});
	});

	// ==========================================
	// KỊCH BẢN 3: CẬP NHẬT TÀI LIỆU (PUT /:id)
	// ==========================================
	describe("PUT /api/batches/:id", () => {
		test("Nên cập nhật tên và di chuyển PDF vào Thư mục thành công", async () => {
			const response = await request(app)
				.put(`/api/batches/${createdBatchId}`)
				.set("Authorization", `Bearer ${validToken}`)
				.send({
					title: "Tài liệu Bách Khoa (Đã Sửa)",
					folderId: testFolderId, // Di chuyển vào thư mục
				});

			expect(response.status).toBe(200);
			expect(response.body.data.title).toBe("Tài liệu Bách Khoa (Đã Sửa)");
			expect(response.body.data.folderId).toBe(testFolderId);
		});
	});

	// ==========================================
	// KỊCH BẢN 4: XÓA TÀI LIỆU (DELETE /:id)
	// ==========================================
	describe("DELETE /api/batches/:id", () => {
		test("Nên xóa tài liệu PDF thành công", async () => {
			const response = await request(app)
				.delete(`/api/batches/${createdBatchId}`)
				.set("Authorization", `Bearer ${validToken}`);

			expect(response.status).toBe(200);
			expect(response.body.message).toContain("thành công");

			// Xác minh DB đã thực sự bị xóa
			const checkDb = await prisma.batchDocument.findUnique({
				where: { id: createdBatchId },
			});
			expect(checkDb).toBeNull();
		});
	});
});
