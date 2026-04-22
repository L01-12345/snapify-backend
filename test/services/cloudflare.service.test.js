// 1. THIẾT LẬP BIẾN MÔI TRƯỜNG TRƯỚC TIÊN
process.env.R2_BUCKET_NAME = "test-bucket";
process.env.R2_PUBLIC_URL = "https://cdn.test.com";

// 2. KHỞI TẠO MOCK
const mockSend = jest.fn();
jest.mock("@aws-sdk/client-s3", () => ({
	S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
	PutObjectCommand: jest.fn(),
	HeadObjectCommand: jest.fn(),
}));

// 3. REQUIRE SERVICE SAU KHI MOCK VÀ ENV ĐÃ SẴN SÀNG
const cloudflareService = require("../../src/services/cloudflare.service");

// Giấu log để terminal sạch sẽ
beforeAll(() => {
	jest.spyOn(console, "log").mockImplementation(() => {});
	jest.spyOn(console, "error").mockImplementation(() => {});
});
afterAll(() => {
	console.log.mockRestore();
	console.error.mockRestore();
});

describe("Cloudflare Service Tests", () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	const mockFile = {
		buffer: Buffer.from("test"),
		originalname: "image.jpg",
		mimetype: "image/jpeg",
	};

	// ==========================================
	// TEST: uploadFileToR2 (Có Deduplication)
	// ==========================================
	describe("uploadFileToR2", () => {
		test("Nên tái sử dụng URL nếu ảnh ĐÃ tồn tại (Deduplication)", async () => {
			// Mock lệnh HeadObjectCommand chạy thành công
			mockSend.mockResolvedValueOnce({});

			const url = await cloudflareService.uploadFileToR2(mockFile);

			expect(url).toContain("https://cdn.test.com/uploads/");
			expect(url).toContain(".jpg");
			expect(mockSend).toHaveBeenCalledTimes(1);
		});

		test("Nên tiến hành Upload nếu ảnh CHƯA tồn tại", async () => {
			// Mock lệnh HeadObjectCommand ném lỗi NotFound
			const notFoundError = new Error("Not Found");
			notFoundError.name = "NotFound";
			mockSend.mockRejectedValueOnce(notFoundError);

			// Mock lệnh PutObjectCommand chạy thành công
			mockSend.mockResolvedValueOnce({});

			const url = await cloudflareService.uploadFileToR2(mockFile);

			expect(url).toContain("https://cdn.test.com/uploads/");
			expect(mockSend).toHaveBeenCalledTimes(2);
		});

		test("Nên văng lỗi 502 nếu AWS SDK bị lỗi kết nối mạng", async () => {
			mockSend.mockRejectedValueOnce(new Error("Network Error"));
			await expect(cloudflareService.uploadFileToR2(mockFile)).rejects.toThrow(
				"Không thể tải ảnh lên",
			);
		});
	});

	// ==========================================
	// TEST: uploadBufferToR2
	// ==========================================
	describe("uploadBufferToR2", () => {
		test("Nên upload buffer và trả về URL", async () => {
			mockSend.mockResolvedValueOnce({});
			const url = await cloudflareService.uploadBufferToR2(
				Buffer.from("pdf"),
				"application/pdf",
				"pdf",
			);

			expect(url).toContain("https://cdn.test.com/batches/snapify-batch-");
			expect(url).toContain(".pdf");
		});

		test("Nên văng lỗi nếu upload buffer thất bại", async () => {
			mockSend.mockRejectedValueOnce(new Error("S3 Down"));
			await expect(
				cloudflareService.uploadBufferToR2(
					Buffer.from("pdf"),
					"app/pdf",
					"pdf",
				),
			).rejects.toThrow("Không thể tải file PDF");
		});
	});
});
