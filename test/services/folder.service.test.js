const folderService = require("../../src/services/folder.service");
const prisma = require("../../src/utils/prisma.util");

// MOCK PRISMA
jest.mock("../../src/utils/prisma.util", () => ({
	folder: {
		findMany: jest.fn(),
		findFirst: jest.fn(),
		create: jest.fn(),
		update: jest.fn(),
		delete: jest.fn(),
	},
	note: { updateMany: jest.fn() },
	$transaction: jest.fn(),
}));

describe("Folder Service Tests", () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	// ==========================================
	// TEST: getUserFolders
	// ==========================================
	describe("getUserFolders", () => {
		test("Nên lấy danh sách thư mục thành công", async () => {
			prisma.folder.findMany.mockResolvedValue([{ id: "f1", name: "Học tập" }]);
			const result = await folderService.getUserFolders("user-1");
			expect(result.length).toBe(1);
			expect(prisma.folder.findMany).toHaveBeenCalled();
		});
	});

	// ==========================================
	// TEST: getFolderById
	// ==========================================
	describe("getFolderById", () => {
		test("Nên ném lỗi 404 nếu không tìm thấy hoặc sai chủ", async () => {
			prisma.folder.findFirst.mockResolvedValue(null);
			await expect(folderService.getFolderById("f1", "user-1")).rejects.toThrow(
				"không có quyền truy cập",
			);
		});

		test("Nên trả về thư mục nếu hợp lệ", async () => {
			prisma.folder.findFirst.mockResolvedValue({ id: "f1", name: "Test" });
			const folder = await folderService.getFolderById("f1", "user-1");
			expect(folder.id).toBe("f1");
		});
	});

	// ==========================================
	// TEST: createNewFolder
	// ==========================================
	describe("createNewFolder", () => {
		test("Nên ném lỗi 400 nếu tên thư mục rỗng", async () => {
			await expect(
				folderService.createNewFolder("u1", { name: "   " }),
			).rejects.toThrow("Tên thư mục không được để trống");
		});

		test("Nên ném lỗi 400 nếu trùng tên", async () => {
			prisma.folder.findFirst.mockResolvedValue({ id: "f1", name: "Toán" });
			await expect(
				folderService.createNewFolder("u1", { name: "Toán" }),
			).rejects.toThrow("đã tồn tại");
		});

		test("Nên tạo thư mục thành công", async () => {
			prisma.folder.findFirst.mockResolvedValue(null);
			prisma.folder.create.mockResolvedValue({ id: "f2", name: "Lý" });
			const result = await folderService.createNewFolder("u1", {
				name: "Lý",
				description: "Học lý",
			});
			expect(result.name).toBe("Lý");
		});
	});

	// ==========================================
	// TEST: updateFolder
	// ==========================================
	describe("updateFolder", () => {
		beforeEach(() => {
			prisma.folder.findFirst.mockResolvedValueOnce({ id: "f1" });
		}); // Bypass check quyền

		test("Nên ném lỗi 400 nếu tên update rỗng", async () => {
			await expect(
				folderService.updateFolder("f1", "u1", { name: "" }),
			).rejects.toThrow("không được để trống");
		});

		test("Nên ném lỗi 400 nếu đổi tên trùng với thư mục khác", async () => {
			// Mock lần 2 cho check trùng tên
			prisma.folder.findFirst.mockResolvedValueOnce({ id: "f2", name: "Hóa" });
			await expect(
				folderService.updateFolder("f1", "u1", { name: "Hóa" }),
			).rejects.toThrow("đã được sử dụng");
		});

		test("Nên cập nhật thành công", async () => {
			prisma.folder.findFirst.mockResolvedValueOnce(null); // Không trùng tên
			prisma.folder.update.mockResolvedValue({ id: "f1", name: "Văn" });
			const result = await folderService.updateFolder("f1", "u1", {
				name: "Văn",
			});
			expect(result.name).toBe("Văn");
		});
	});

	// ==========================================
	// TEST: deleteFolder
	// ==========================================
	describe("deleteFolder", () => {
		test("Nên xóa thư mục và chạy Transaction an toàn", async () => {
			prisma.folder.findFirst.mockResolvedValue({ id: "f1" });
			prisma.$transaction.mockResolvedValue([{}, {}]); // Mock transaction thành công

			const result = await folderService.deleteFolder("f1", "u1");

			expect(result.message).toContain("an toàn");
			expect(prisma.$transaction).toHaveBeenCalled(); // Đảm bảo transaction được gọi
		});
	});
});
