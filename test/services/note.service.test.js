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
	// Giấu console.error đi để màn hình test xanh mướt, không bị in lỗi đỏ
	beforeAll(() => {
		jest.spyOn(console, "error").mockImplementation(() => {});
		jest.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterAll(() => {
		console.error.mockRestore();
		console.warn.mockRestore();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	// ==========================================
	// TEST: processImageToNote
	// ==========================================
	describe("processImageToNote", () => {
		const mockFile = { buffer: "buffer", mimetype: "image/jpeg" };

		test("Nên báo lỗi (throw error) nếu upload lên Cloudflare R2 thất bại", async () => {
			cloudflareService.uploadFileToR2.mockRejectedValue(new Error("CF Down"));
			geminiService.generateNoteFromImage.mockResolvedValue({
				title: "Mock",
				content: "Mock",
			});

			await expect(
				noteService.processImageToNote("user-123", mockFile),
			).rejects.toThrow("Không thể tạo ghi chú từ hình ảnh lúc này.");
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

			// ĐÃ SỬA: Cập nhật status ACTIONED và thêm 2 cột NoAccent
			expect(prisma.note.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						title: "Bill",
						content: "100$",
						status: "ACTIONED",
						titleNoAccent: "Bill",
						contentNoAccent: "100$",
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
			expect(await noteService.searchUserNotes("u1", "###%^")).toEqual([]);
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
			prisma.note.findFirst.mockResolvedValue({ id: "n1" });
		});

		test("Nên ném lỗi 400 nếu Status sai chuẩn", async () => {
			await expect(
				noteService.updateNoteData("n1", "u1", { status: "INVALID" }),
			).rejects.toThrow("Trạng thái cập nhật không hợp lệ");
		});

		test("Nên ném lỗi 400 nếu truyền sai FolderId (Bảo mật)", async () => {
			prisma.folder.findFirst.mockResolvedValue(null);
			await expect(
				noteService.updateNoteData("n1", "u1", { folderId: "f2" }),
			).rejects.toThrow("Thư mục đích không tồn tại");
		});

		test("Nên update thành công và lọc bỏ trường nhạy cảm", async () => {
			prisma.folder.findFirst.mockResolvedValue({ id: "f2" });
			prisma.note.update.mockResolvedValue({ id: "n1", title: "New" });

			await noteService.updateNoteData("n1", "u1", {
				id: "hack",
				userId: "hack",
				title: "New",
				folderId: "f2",
			});

			expect(prisma.note.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: { title: "New", folderId: "f2" },
				}),
			);
		});
	});

	// ==========================================
	// TEST: categorizeNoteWithAI
	// ==========================================
	describe("categorizeNoteWithAI", () => {
		test("Nên trả về nguyên gốc nếu AI chập chờn (Edge Case 2)", async () => {
			prisma.note.findUnique.mockResolvedValue({
				id: "n1",
				userId: "u1",
				content: "abc",
			});
			geminiService.suggestFolderForNote.mockResolvedValue(null);

			const result = await noteService.categorizeNoteWithAI("n1");
			expect(result.id).toBe("n1");
			expect(prisma.note.update).not.toHaveBeenCalled();
		});

		test("Nên tự sửa lỗi Hallucination của AI (Edge Case 3)", async () => {
			prisma.note.findUnique.mockResolvedValue({ id: "n1", userId: "u1" });
			prisma.folder.findMany.mockResolvedValue([{ id: "f1" }]);

			geminiService.suggestFolderForNote.mockResolvedValue({
				action: "USE_EXISTING",
				folderId: "f999",
			});
			prisma.folder.create.mockResolvedValue({ id: "smart-f1" });

			await noteService.categorizeNoteWithAI("n1");

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
			await noteService.createManualNote("u1", { title: "  A  " });

			expect(prisma.note.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						title: "A",
						status: "ACTIONED",
						folderId: null,
					}),
				}),
			);
		});
		test("Nên tạo Note thành công và đính kèm ảnh nếu có imageUrl (Trường hợp OCR lỗi)", async () => {
			prisma.note.create.mockResolvedValue({
				id: "n2",
				images: [{ imageUrl: "http://mock.url" }],
			});

			await noteService.createManualNote("u1", {
				title: "Note có ảnh",
				imageUrl: "http://mock.url",
			});

			// Kỳ vọng Prisma được gọi với lệnh tạo nested table (images: { create: ... })
			expect(prisma.note.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						title: "Note có ảnh",
						images: {
							create: {
								imageUrl: "http://mock.url",
								orderIndex: 0,
							},
						},
					}),
				}),
			);
		});
	});
	// ==========================================
	// TEST: processImageToNoteBackground (Background Job)
	// ==========================================
	describe("processImageToNoteBackground", () => {
		const mockFile = { buffer: "buffer", mimetype: "image/jpeg" };

		test("Nên update Note thành ACTIONED nếu AI và Cloudflare xử lý thành công", async () => {
			cloudflareService.uploadFileToR2.mockResolvedValue("http://mock.url");
			geminiService.generateNoteFromImage.mockResolvedValue({
				title: "Bill",
				content: "100$",
			});
			prisma.note.update.mockResolvedValue({}); // Mock DB update thành công

			// Chạy hàm ngầm
			await noteService.processImageToNoteBackground(
				"note-1",
				"user-1",
				mockFile,
			);

			// Kỳ vọng Prisma update đúng trạng thái ACTIONED
			expect(prisma.note.update).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: "note-1" },
					data: expect.objectContaining({
						status: "ACTIONED",
						title: "Bill",
						content: "100$",
					}),
				}),
			);
		});

		test("Nên update Note thành ARCHIVED/FAILED nếu AI hoặc R2 văng lỗi ngầm", async () => {
			// Giả lập Cloudflare sập
			cloudflareService.uploadFileToR2.mockRejectedValue(new Error("Lỗi mạng"));
			prisma.note.update.mockResolvedValue({});

			// Chạy hàm ngầm (nó sẽ rơi vào khối catch bên trong service)
			await noteService.processImageToNoteBackground(
				"note-1",
				"user-1",
				mockFile,
			);

			// Kỳ vọng Prisma update thành trạng thái báo lỗi (ARCHIVED hoặc FAILED tùy code của bạn)
			expect(prisma.note.update).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: "note-1" },
					data: expect.objectContaining({ status: "ARCHIVED" }),
				}),
			);
		});
	});
});
