const noteService = require("../../src/services/note.service");
const prisma = require("../../src/utils/prisma.util");
const cloudflareService = require("../../src/services/cloudflare.service");
const geminiService = require("../../src/services/gemini.service");

// LÀM GIẢ CÁC DEPENDENCIES
jest.mock("../../src/utils/prisma.util", () => ({
	note: {
		create: jest.fn(),
		findMany: jest.fn(),
		count: jest.fn(),
		findFirst: jest.fn(),
		update: jest.fn(),
		findUnique: jest.fn(),
		delete: jest.fn(),
	},
	searchHistory: { create: jest.fn() },
	folder: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
}));
jest.mock("../../src/services/cloudflare.service");
jest.mock("../../src/services/gemini.service");

describe("Note Service Tests", () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	// ==========================================
	// TEST: processImageToNote
	// ==========================================
	describe("processImageToNote", () => {
		const mockFile = { buffer: "buffer", mimetype: "image/jpeg" };

		test("Nên ném lỗi 500 nếu Cloudflare upload thất bại", async () => {
			cloudflareService.uploadFileToR2.mockRejectedValue(new Error("CF Down"));
			await expect(
				noteService.processImageToNote("user-1", mockFile),
			).rejects.toThrow("Không thể tạo ghi chú");
		});

		test("Nên lưu Note rỗng nếu AI văng lỗi (Edge Case 1)", async () => {
			cloudflareService.uploadFileToR2.mockResolvedValue("http://image.url");
			geminiService.generateNoteFromImage.mockRejectedValue(
				new Error("AI Overloaded"),
			);
			prisma.note.create.mockResolvedValue({
				id: "note-1",
				title: "Lỗi trích xuất (Cần cập nhật)",
			});

			const result = await noteService.processImageToNote("user-1", mockFile);
			expect(result.title).toBe("Lỗi trích xuất (Cần cập nhật)");
		});

		test("Nên tạo Note thành công nếu AI chạy tốt", async () => {
			cloudflareService.uploadFileToR2.mockResolvedValue("http://image.url");
			geminiService.generateNoteFromImage.mockResolvedValue({
				title: "Bill",
				content: "100$",
			});
			prisma.note.create.mockResolvedValue({ id: "note-1", title: "Bill" });

			const result = await noteService.processImageToNote("user-1", mockFile);
			expect(prisma.note.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						title: "Bill",
						content: "100$",
						status: "PENDING",
					}),
				}),
			);
		});
	});

	// ==========================================
	// TEST: searchUserNotes
	// ==========================================
	describe("searchUserNotes", () => {
		test("Nên trả về rỗng nếu keyword null hoặc rác", async () => {
			expect(await noteService.searchUserNotes("u1", null)).toEqual([]);
			expect(await noteService.searchUserNotes("u1", "   ")).toEqual([]);
			expect(await noteService.searchUserNotes("u1", "###%^")).toEqual([]); // Edge case kí tự đặc biệt
			// Đảm bảo không gọi DB
			expect(prisma.note.findMany).not.toHaveBeenCalled();
		});

		test("Nên tìm kiếm và LƯU lịch sử nếu có kết quả", async () => {
			prisma.note.findMany.mockResolvedValue([{ id: "1", title: "React" }]);
			await noteService.searchUserNotes("u1", "React");

			expect(prisma.note.findMany).toHaveBeenCalledTimes(1);
			expect(prisma.searchHistory.create).toHaveBeenCalledWith({
				data: { userId: "u1", keyword: "React" },
			});
		});

		test("Nên tìm kiếm nhưng KHÔNG lưu lịch sử nếu rỗng", async () => {
			prisma.note.findMany.mockResolvedValue([]);
			await noteService.searchUserNotes("u1", "NoResult");
			expect(prisma.searchHistory.create).not.toHaveBeenCalled();
		});
	});

	// ==========================================
	// TEST: getNoteDetails & deleteNote
	// ==========================================
	describe("getNoteDetails & deleteNote", () => {
		test("Nên ném lỗi 404 nếu không tìm thấy (Chống xem trộm)", async () => {
			prisma.note.findFirst.mockResolvedValue(null);
			await expect(noteService.getNoteDetails("n1", "u1")).rejects.toThrow(
				"không có quyền truy cập",
			);
			await expect(noteService.deleteNote("n1", "u1")).rejects.toThrow(
				"không có quyền xóa",
			);
		});

		test("Nên hoạt động đúng nếu đúng chủ sở hữu", async () => {
			prisma.note.findFirst.mockResolvedValue({ id: "n1", userId: "u1" });
			prisma.note.delete.mockResolvedValue({});

			const note = await noteService.getNoteDetails("n1", "u1");
			expect(note.id).toBe("n1");

			const delResult = await noteService.deleteNote("n1", "u1");
			expect(delResult.message).toBe("Đã xóa ghi chú thành công");
		});
	});

	// ==========================================
	// TEST: updateNoteData
	// ==========================================
	describe("updateNoteData", () => {
		beforeEach(() => {
			prisma.note.findFirst.mockResolvedValue({ id: "n1" }); // Bypass check quyền
		});

		test("Nên ném lỗi 400 nếu Status sai chuẩn", async () => {
			await expect(
				noteService.updateNoteData("n1", "u1", { status: "INVALID" }),
			).rejects.toThrow("Trạng thái cập nhật không hợp lệ");
		});

		test("Nên ném lỗi 400 nếu truyền sai FolderId (Bảo mật)", async () => {
			prisma.folder.findFirst.mockResolvedValue(null); // Giả lập Folder không thuộc về user
			await expect(
				noteService.updateNoteData("n1", "u1", { folderId: "f2" }),
			).rejects.toThrow("Thư mục đích không tồn tại");
		});

		test("Nên update thành công và lọc bỏ trường nhạy cảm", async () => {
			prisma.folder.findFirst.mockResolvedValue({ id: "f2" }); // Folder hợp lệ
			prisma.note.update.mockResolvedValue({ id: "n1", title: "New" });

			// Cố tình gửi userId, id, createdAt để xem service có xóa đi không
			await noteService.updateNoteData("n1", "u1", {
				id: "hack",
				userId: "hack",
				title: "New",
				folderId: "f2",
			});

			expect(prisma.note.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: { title: "New", folderId: "f2" }, // Đã biến mất id, userId
				}),
			);
		});
	});

	// ==========================================
	// TEST: categorizeNoteWithAI (Rất nhiều nhánh)
	// ==========================================
	describe("categorizeNoteWithAI", () => {
		test("Nên trả về nguyên gốc nếu AI chập chờn (Edge Case 2)", async () => {
			prisma.note.findUnique.mockResolvedValue({
				id: "n1",
				userId: "u1",
				content: "abc",
			});
			geminiService.suggestFolderForNote.mockResolvedValue(null); // AI lỗi

			const result = await noteService.categorizeNoteWithAI("n1");
			expect(result.id).toBe("n1");
			expect(prisma.note.update).not.toHaveBeenCalled();
		});

		test("Nên tự sửa lỗi Hallucination của AI (Edge Case 3)", async () => {
			prisma.note.findUnique.mockResolvedValue({ id: "n1", userId: "u1" });
			prisma.folder.findMany.mockResolvedValue([{ id: "f1" }]); // Có mỗi folder f1

			// AI bịa ra ID f999
			geminiService.suggestFolderForNote.mockResolvedValue({
				action: "USE_EXISTING",
				folderId: "f999",
			});
			prisma.folder.create.mockResolvedValue({ id: "smart-f1" });

			await noteService.categorizeNoteWithAI("n1");

			// Đảm bảo nó phát hiện f999 là xạo, và chuyển sang tự tạo folder mới
			expect(prisma.folder.create).toHaveBeenCalled();
			expect(prisma.note.update).toHaveBeenCalledWith(
				expect.objectContaining({ data: { folderId: "smart-f1" } }),
			);
		});
	});

	// ==========================================
	// TEST: createManualNote
	// ==========================================
	describe("createManualNote", () => {
		test("Nên chặn tạo nếu thư mục sai", async () => {
			prisma.folder.findFirst.mockResolvedValue(null);
			await expect(
				noteService.createManualNote("u1", { folderId: "fake" }),
			).rejects.toThrow("Thư mục không tồn tại");
		});

		test("Nên tạo thành công Note tự do (không truyền folderId)", async () => {
			prisma.note.create.mockResolvedValue({ id: "n1" });
			await noteService.createManualNote("u1", { title: "  A  " }); // Cố tình truyền dư khoảng trắng

			expect(prisma.note.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						title: "A",
						status: "ACTIONED",
						folderId: null,
					}), // Đã trim() khoảng trắng
				}),
			);
		});
	});
});
