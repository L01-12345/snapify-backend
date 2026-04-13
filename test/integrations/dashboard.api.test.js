const request = require("supertest");
const app = require("../../src/app"); // Đảm bảo file này export Express app (không có app.listen)
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();

describe("Integration Test: GET /api/dashboard/metrics", () => {
	let testUserId;
	let validToken;

	// ==========================================
	// SETUP: Dọn dẹp và nạp dữ liệu trước khi Test
	// ==========================================
	beforeAll(async () => {
		// 1. Xóa sạch dữ liệu cũ (Dọn rác từ các lần test trước)
		await prisma.note.deleteMany();
		await prisma.user.deleteMany();

		// 2. Tạo một User thật dưới DB
		const testUser = await prisma.user.create({
			data: {
				email: "test_dashboard@example.com",
				displayName: "Test User",
				passwordHash: "hashed_password_123", // Không cần mã hóa thật vì ta không test hàm login ở đây
			},
		});
		testUserId = testUser.id; // Nếu schema của bạn dùng @map("user_id"), id vẫn là id trong object JS

		// 3. Ký một Token thật để vượt qua authMiddleware
		validToken = jwt.sign(
			{ user_id: testUserId }, // Payload phải khớp với những gì authMiddleware đang đọc
			process.env.JWT_SECRET || "snapify_secret_key_development",
		);

		// 4. Tạo 3 Note thật dưới DB để test logic đếm
		await prisma.note.createMany({
			data: [
				{ userId: testUserId, title: "Note 1", status: "PENDING" },
				{ userId: testUserId, title: "Note 2", status: "PENDING" },
				{ userId: testUserId, title: "Note 3", status: "ARCHIVED" },
			],
		});
	});

	// ==========================================
	// TEARDOWN: Dọn dẹp trả lại sự trong sạch cho DB sau khi Test xong
	// ==========================================
	afterAll(async () => {
		await prisma.note.deleteMany();
		await prisma.user.deleteMany();
		await prisma.$disconnect(); // Ngắt kết nối để Jest có thể thoát tiến trình
	});

	// ==========================================
	// KỊCH BẢN 1: Thành công (Happy Path)
	// ==========================================
	test("Nên trả về HTTP 200 và đếm đúng số lượng khi có Token hợp lệ", async () => {
		// Gọi API qua Supertest
		const response = await request(app)
			.get("/api/dashboard/metrics")
			.set("Authorization", `Bearer ${validToken}`); // Gắn token vào header

		// Assert các kết quả mong đợi
		expect(response.status).toBe(200);
		expect(response.body.status).toBe("success");
		expect(response.body.data).toEqual({
			total: 3,
			pending: 2,
			actioned: 0,
			archived: 1,
		});
	});

	// ==========================================
	// KỊCH BẢN 2: Lỗi bảo mật (Edge Case)
	// ==========================================
	test("Nên chặn lại và trả về HTTP 401 nếu không có Token", async () => {
		const response = await request(app).get("/api/dashboard/metrics"); // Cố tình không set Authorization header

		expect(response.status).toBe(401);
		// Tùy thuộc vào middleware auth của bạn trả về message gì, bạn expect cái đó
		expect(response.body.status).toBe("error");
	});

	test("Nên chặn lại và trả về HTTP 401 nếu Token sai hoặc hết hạn", async () => {
		const response = await request(app)
			.get("/api/dashboard/metrics")
			.set("Authorization", `Bearer token_fake_vo_van_123`);

		expect(response.status).toBe(401);
	});
});
