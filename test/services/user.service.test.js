// 1. KHỞI TẠO MOCK CHO PRISMA
const prisma = require("../../src/utils/prisma.util");

jest.mock("../../src/utils/prisma.util", () => ({
	user: {
		findUnique: jest.fn(),
		update: jest.fn(),
	},
}));

// 2. REQUIRE SERVICE SAU KHI MOCK ĐÃ SẴN SÀNG
const userService = require("../../src/services/user.service");

// Giấu log lỗi để terminal sạch sẽ khi test case 404
beforeAll(() => {
	jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
	console.error.mockRestore();
});

describe("User Service Tests", () => {
	afterEach(() => {
		jest.clearAllMocks(); // Xóa lịch sử gọi mock sau mỗi bài test
	});

	// ==========================================
	// TEST: getUserById
	// ==========================================
	describe("getUserById", () => {
		test("Nên trả về thông tin user thành công nếu tồn tại", async () => {
			const mockUser = {
				id: "user-123",
				email: "test@snapify.com",
				displayName: "Test User",
				avatarUrl: "https://avatar.com/1.jpg",
				createdAt: new Date(),
			};

			// Giả lập DB tìm thấy user
			prisma.user.findUnique.mockResolvedValue(mockUser);

			const result = await userService.getUserById("user-123");

			expect(result.id).toBe("user-123");
			expect(result.email).toBe("test@snapify.com");
			// Đảm bảo hàm findUnique được gọi đúng với ID truyền vào
			expect(prisma.user.findUnique).toHaveBeenCalledWith({
				where: { id: "user-123" },
				select: expect.any(Object), // Không cần test cứng phần select, chỉ cần biết nó có truyền object select là được
			});
		});

		test("Nên ném lỗi 404 nếu không tìm thấy người dùng", async () => {
			// Giả lập DB trả về null (Không tìm thấy)
			prisma.user.findUnique.mockResolvedValue(null);

			await expect(userService.getUserById("ghost-id")).rejects.toThrow(
				"Không tìm thấy người dùng",
			);
		});
	});

	// ==========================================
	// TEST: updateUserProfile
	// ==========================================
	describe("updateUserProfile", () => {
		test("Nên cập nhật và trả về thông tin profile mới", async () => {
			const updateData = {
				displayName: "New Name",
				avatarUrl: "https://new-avatar.com/1.jpg",
			};
			const mockUpdatedUser = { id: "user-123", ...updateData };

			// Giả lập DB update thành công
			prisma.user.update.mockResolvedValue(mockUpdatedUser);

			const result = await userService.updateUserProfile(
				"user-123",
				updateData,
			);

			expect(result.displayName).toBe("New Name");
			expect(result.avatarUrl).toBe("https://new-avatar.com/1.jpg");

			// Kiểm tra xem lệnh gọi DB có đúng tham số không
			expect(prisma.user.update).toHaveBeenCalledWith({
				where: { id: "user-123" },
				data: updateData,
				select: expect.any(Object),
			});
		});
	});
});
