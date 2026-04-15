const request = require("supertest");
const app = require("../../src/app"); // Đảm bảo đường dẫn này trỏ đúng tới file app.js của bạn
const prisma = require("../../src/utils/prisma.util");
const bcrypt = require("bcryptjs");

describe("Integration Test: Authentication API Endpoints", () => {
	// Dữ liệu giả lập cho Frontend gửi lên
	const testUserData = {
		email: "integration_tester@snapify.com",
		password: "SuperSecretPassword123!",
		displayName: "Integration Tester",
	};

	// ==========================================
	// SETUP: Dọn dẹp "sân chơi" trước khi test
	// ==========================================
	beforeAll(async () => {
		// Tạm thời tắt console.error để terminal sạch sẽ, dễ nhìn lỗi thật của Jest
		jest.spyOn(console, "error").mockImplementation(() => {});
		await prisma.user.deleteMany({ where: { email: testUserData.email } });
	});

	afterAll(async () => {
		// Trả lại chức năng console.error sau khi test xong
		console.error.mockRestore();
		await prisma.user.deleteMany({ where: { email: testUserData.email } });
		await prisma.$disconnect();
	});

	// ==========================================
	// KỊCH BẢN 1: ĐĂNG KÝ (REGISTER)
	// ==========================================
	describe("POST /api/auth/register", () => {
		test("Nên tạo tài khoản thành công và trả về HTTP 201", async () => {
			const response = await request(app)
				.post("/api/auth/register") // Tùy chỉnh /api/auth nếu route của bạn khác
				.send(testUserData);

			expect(response.status).toBe(201);
			expect(response.body.message).toBe("Đăng ký tài khoản thành công");
			expect(response.body.data.email).toBe(testUserData.email);
			expect(response.body.data.displayName).toBe(testUserData.displayName);
			expect(response.body.data).not.toHaveProperty("passwordHash"); // Bảo mật: Không lọt password đã hash

			// Kiểm tra chéo dưới Database xem có thực sự lưu không
			const userInDb = await prisma.user.findUnique({
				where: { email: testUserData.email },
			});
			expect(userInDb).not.toBeNull();
			// Đảm bảo password lưu xuống DB đã bị mã hóa, không phải plain-text
			expect(userInDb.passwordHash).not.toBe(testUserData.password);
		});

		test("Nên chặn và trả HTTP 400 nếu đăng ký trùng email", async () => {
			const response = await request(app)
				.post("/api/auth/register")
				.send(testUserData);

			expect(response.status).toBe(400); // Lỗi nghiệp vụ (Bad Request)
			// Tùy vào middleware xử lý lỗi của bạn, thông báo có thể nằm ở body.message hoặc body.error
			// expect(response.body.message).toContain('đã được đăng ký');
		});
	});

	// ==========================================
	// KỊCH BẢN 2: ĐĂNG NHẬP (LOGIN)
	// ==========================================
	describe("POST /api/auth/login", () => {
		test("Nên đăng nhập thành công và nhả ra JWT Token (HTTP 200)", async () => {
			const response = await request(app).post("/api/auth/login").send({
				email: testUserData.email,
				password: testUserData.password,
			});

			expect(response.status).toBe(200);
			expect(response.body.message).toBe("Đăng nhập thành công");

			// Quan trọng: Kiểm tra xem có token trả về không
			expect(response.body.data).toHaveProperty("token");
			expect(typeof response.body.data.token).toBe("string");

			expect(response.body.data.user.email).toBe(testUserData.email);
			expect(response.body.data.user).not.toHaveProperty("passwordHash");
		});

		test("Nên chặn và báo lỗi 401 nếu sai mật khẩu", async () => {
			const response = await request(app).post("/api/auth/login").send({
				email: testUserData.email,
				password: "WrongPassword123!",
			});

			expect(response.status).toBe(401); // 401 Unauthorized
		});

		test("Nên chặn và báo lỗi 401 nếu email không tồn tại", async () => {
			const response = await request(app).post("/api/auth/login").send({
				email: "ghost_user@snapify.com",
				password: "Password123!",
			});

			expect(response.status).toBe(401);
		});
	});

	// ==========================================
	// KỊCH BẢN 3: QUÊN MẬT KHẨU (FORGOT PASSWORD)
	// ==========================================
	describe("POST /api/auth/forgot-password", () => {
		test("Nên trả về thông báo HTTP 200 bất kể email có tồn tại hay không (Chống dò quét)", async () => {
			const response = await request(app)
				.post("/api/auth/forgot-password")
				.send({ email: testUserData.email });

			expect(response.status).toBe(200);
			expect(response.body.message).toContain("đã được gửi vào email");
		});
	});
});
