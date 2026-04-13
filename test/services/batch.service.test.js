// 1. KHỞI TẠO CÁC HÀM GIẢ (MOCKS) TRƯỚC TIÊN
const mockSendToR2 = jest.fn();
const mockPdfSave = jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
const mockEmbedJpg = jest.fn().mockResolvedValue({ width: 100, height: 100 });
const mockEmbedPng = jest.fn().mockResolvedValue({ width: 100, height: 100 });
const mockAddPage = jest.fn().mockReturnValue({ drawImage: jest.fn() });

// Mock prisma util
jest.mock("../../src/utils/prisma.util", () => ({
	batchDocument: {
		create: jest.fn(),
		findMany: jest.fn(),
		findFirst: jest.fn(),
		update: jest.fn(),
		delete: jest.fn(),
	},
	note: { findMany: jest.fn() },
	folder: { findFirst: jest.fn() },
	batchItem: { createMany: jest.fn() },
	$transaction: jest.fn(),
}));

// Mock cloudflare service
jest.mock("../../src/services/cloudflare.service", () => ({
	uploadBufferToR2: mockSendToR2,
}));

// Mock pdf-lib
jest.mock("pdf-lib", () => ({
	PDFDocument: {
		create: jest.fn().mockResolvedValue({
			embedJpg: mockEmbedJpg,
			embedPng: mockEmbedPng,
			addPage: mockAddPage,
			save: mockPdfSave,
		}),
	},
}));

// 2. REQUIRE SERVICE VÀ UTILS
const batchService = require("../../src/services/batch.service");
const prisma = require("../../src/utils/prisma.util");

// Giấu log rác trong terminal
beforeAll(() => {
	jest.spyOn(console, "error").mockImplementation(() => {});
	jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterAll(() => {
	console.error.mockRestore();
	console.warn.mockRestore();
});

describe("Batch Service Tests", () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	// ==========================================
	// TEST: createPDFFromUploads
	// ==========================================
	describe("createPDFFromUploads", () => {
		test("Nên ném lỗi 400 nếu không có file nào được gửi lên", async () => {
			await expect(
				batchService.createPDFFromUploads("u1", [], "Title"),
			).rejects.toThrow("ít nhất một hình ảnh");
		});

		test("Nên ném lỗi 422 nếu tất cả file đều không phải ảnh hợp lệ (Magic Bytes fail)", async () => {
			const badFiles = [{ buffer: Buffer.from([0, 0, 0, 0]) }]; // File rác
			await expect(
				batchService.createPDFFromUploads("u1", badFiles, "Title"),
			).rejects.toThrow("Không có hình ảnh hợp lệ");
		});

		test("Nên tạo PDF thành công từ JPG và PNG hợp lệ", async () => {
			const validFiles = [
				{
					buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
					originalname: "a.jpg",
				}, // Giả lập JPG
				{
					buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
					originalname: "b.png",
				}, // Giả lập PNG
			];
			mockSendToR2.mockResolvedValue("https://r2.com/file.pdf");
			prisma.batchDocument.create.mockResolvedValue({
				id: "b1",
				title: "Scan",
			});

			const result = await batchService.createPDFFromUploads(
				"u1",
				validFiles,
				"Scan Title",
			);

			expect(mockEmbedJpg).toHaveBeenCalled();
			expect(mockEmbedPng).toHaveBeenCalled();
			expect(mockSendToR2).toHaveBeenCalled();
			expect(prisma.batchDocument.create).toHaveBeenCalled();
			expect(result.id).toBe("b1");
		});
	});

	// ==========================================
	// TEST: generatePDF (Gộp Note có sẵn)
	// ==========================================
	describe("generatePDF", () => {
		test("Nên ném lỗi 404 nếu không tìm thấy note hợp lệ", async () => {
			prisma.note.findMany.mockResolvedValue([]);
			await expect(
				batchService.generatePDF("u1", ["n1"], "Title"),
			).rejects.toThrow("Không tìm thấy ghi chú");
		});

		test("Nên tạo Batch qua Transaction thành công", async () => {
			const mockNotes = [
				{ id: "n1", images: [{ id: "img1" }] },
				{ id: "n2", images: [{ id: "img2" }] },
			];
			prisma.note.findMany.mockResolvedValue(mockNotes);

			// Giả lập luồng Transaction của Prisma
			prisma.$transaction.mockImplementation(async (callback) => {
				const txMock = {
					batchDocument: {
						create: jest.fn().mockResolvedValue({ id: "batch123" }),
					},
					batchItem: { createMany: jest.fn().mockResolvedValue({}) },
				};
				return await callback(txMock);
			});

			const result = await batchService.generatePDF(
				"u1",
				["n1", "n2"],
				"Gộp tài liệu",
			);

			expect(result.id).toBe("batch123");
			expect(prisma.$transaction).toHaveBeenCalled();
		});
	});

	// ==========================================
	// TEST: updateBatch & deleteBatch
	// ==========================================
	describe("updateBatch & deleteBatch", () => {
		test("Update: Nên ném lỗi 404 nếu không tìm thấy hoặc sai chủ", async () => {
			prisma.batchDocument.findFirst.mockResolvedValue(null);
			await expect(batchService.updateBatch("b1", "u1", {})).rejects.toThrow(
				"Không tìm thấy",
			);
		});

		test("Update: Nên ném lỗi 400 nếu folderId đích không tồn tại", async () => {
			prisma.batchDocument.findFirst.mockResolvedValue({ id: "b1" });
			prisma.folder.findFirst.mockResolvedValue(null); // Folder fake
			await expect(
				batchService.updateBatch("b1", "u1", { folderId: "f99" }),
			).rejects.toThrow("Thư mục đích không tồn tại");
		});

		test("Delete: Nên thực hiện xóa thành công", async () => {
			prisma.batchDocument.findFirst.mockResolvedValue({ id: "b1" });
			prisma.batchDocument.delete.mockResolvedValue({});

			const result = await batchService.deleteBatch("b1", "u1");
			expect(result.message).toContain("thành công");
			expect(prisma.batchDocument.delete).toHaveBeenCalledWith({
				where: { id: "b1" },
			});
		});
	});

	// ==========================================
	// TEST: getUserBatches
	// ==========================================
	test("getUserBatches nên trả về danh sách", async () => {
		prisma.batchDocument.findMany.mockResolvedValue([{ id: "b1" }]);
		const results = await batchService.getUserBatches("u1");
		expect(results.length).toBe(1);
	});
});
