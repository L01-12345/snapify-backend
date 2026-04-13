const {
	registerUser,
	loginUser,
	processForgotPassword,
} = require("../../src/services/auth.service");
const prisma = require("../../src/utils/prisma.util");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// 1. LÀM GIẢ (MOCK) CÁC THƯ VIỆN
jest.mock("../../src/utils/prisma.util", () => ({
	user: {
		findUnique: jest.fn(),
		create: jest.fn(),
	},
}));
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");

describe("Auth Service Tests", () => {
	afterEach(() => {
		jest.clearAllMocks(); // Dọn dẹp sau mỗi test
	});

	// ==========================================
	// TEST HÀM: registerUser
	// ==========================================
	describe("registerUser", () => {
		const mockData = {
			email: "test@mail.com",
			password: "123",
			displayName: "Test",
		};

		test("Nên ném lỗi 400 nếu email đã tồn tại", async () => {
			// Giả lập DB trả về user có sẵn
			prisma.user.findUnique.mockResolvedValue({
				id: "1",
				email: mockData.email,
			});

			await expect(registerUser(mockData)).rejects.toThrow(
				"Email này đã được đăng ký!",
			);
			// Kiểm tra xem HTTP code có đúng 400 không
			await expect(registerUser(mockData)).rejects.toHaveProperty(
				"statusCode",
				400,
			);
		});

		test("Nên tạo user mới thành công và ẩn passwordHash", async () => {
			prisma.user.findUnique.mockResolvedValue(null); // Email chưa tồn tại
			bcrypt.genSalt.mockResolvedValue("randomSalt");
			bcrypt.hash.mockResolvedValue("hashedPassword");

			prisma.user.create.mockResolvedValue({
				id: "1",
				email: mockData.email,
				passwordHash: "hashedPassword",
				displayName: mockData.displayName,
			});

			const result = await registerUser(mockData);

			expect(prisma.user.create).toHaveBeenCalledTimes(1);
			expect(result).not.toHaveProperty("passwordHash"); // Đảm bảo đã xóa passwordHash
			expect(result.email).toBe(mockData.email);
		});
	});

	// ==========================================
	// TEST HÀM: loginUser
	// ==========================================
	describe("loginUser", () => {
		const mockUser = {
			id: "1",
			email: "test@mail.com",
			passwordHash: "hashed123",
		};

		test("Nên ném lỗi 401 nếu không tìm thấy User", async () => {
			prisma.user.findUnique.mockResolvedValue(null);
			await expect(loginUser("wrong@mail.com", "123")).rejects.toThrow(
				"Email hoặc mật khẩu không chính xác",
			);
		});

		test("Nên ném lỗi 401 nếu sai mật khẩu", async () => {
			prisma.user.findUnique.mockResolvedValue(mockUser);
			bcrypt.compare.mockResolvedValue(false); // Báo sai mật khẩu
			await expect(loginUser(mockUser.email, "wrongpass")).rejects.toThrow(
				"Email hoặc mật khẩu không chính xác",
			);
		});

		test("Nên trả về token và user nếu đúng thông tin", async () => {
			prisma.user.findUnique.mockResolvedValue(mockUser);
			bcrypt.compare.mockResolvedValue(true);
			jwt.sign.mockReturnValue("mocked_jwt_token");

			const result = await loginUser(mockUser.email, "123");

			expect(result.token).toBe("mocked_jwt_token");
			expect(result.user).not.toHaveProperty("passwordHash");
		});
	});

	// ==========================================
	// TEST HÀM: processForgotPassword
	// ==========================================
	describe("processForgotPassword", () => {
		test("Nên kết thúc im lặng nếu email không tồn tại (Chống dò quét)", async () => {
			prisma.user.findUnique.mockResolvedValue(null);
			const result = await processForgotPassword("ghost@mail.com");
			expect(result).toBeUndefined();
		});

		test("Nên xử lý gửi email nếu user tồn tại", async () => {
			prisma.user.findUnique.mockResolvedValue({
				id: "1",
				email: "test@mail.com",
			});
			// Ở đây có console.log, ta có thể mock console để xem nó có chạy không
			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			await processForgotPassword("test@mail.com");

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("Đã gửi link reset"),
			);
			consoleSpy.mockRestore();
		});
	});
});
