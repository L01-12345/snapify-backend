// MOCK THƯ VIỆN GOOGLE GENERATIVE AI
const mockGenerateContent = jest.fn();
jest.mock("@google/generative-ai", () => {
	return {
		GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
			getGenerativeModel: jest.fn().mockReturnValue({
				generateContent: mockGenerateContent,
			}),
		})),
	};
});

const geminiService = require("../../src/services/gemini.service");

// Chặn console.error để terminal sạch sẽ khi test catch block
beforeAll(() => {
	jest.spyOn(console, "error").mockImplementation(() => {});
});
afterAll(() => {
	console.error.mockRestore();
});

describe("Gemini AI Service Tests", () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	// ==========================================
	// TEST: generateNoteFromImage
	// ==========================================
	describe("generateNoteFromImage", () => {
		const mockBuffer = Buffer.from("fake-image");

		test("Nên parse JSON thành công từ chuỗi Markdown", async () => {
			// Dùng Backtick bọc ngoài, và thêm \ trước các backtick bên trong để tránh xung đột
			const fakeAiResponse = `\`\`\`json\n{\n  "title": "Bill",\n  "content": "$100"\n}\n\`\`\``;

			mockGenerateContent.mockResolvedValue({
				response: { text: () => fakeAiResponse },
			});

			const result = await geminiService.generateNoteFromImage(
				mockBuffer,
				"image/jpeg",
			);
			expect(result.title).toBe("Bill");
			expect(result.content).toBe("$100");
		});

		test("Nên rơi vào fallback nếu AI sập hoặc gọi API lỗi", async () => {
			mockGenerateContent.mockRejectedValue(new Error("AI Rate Limit"));

			const result = await geminiService.generateNoteFromImage(
				mockBuffer,
				"image/png",
			);
			expect(result.title).toContain("Lỗi phân tích");
			expect(result.content).toContain("tạm thời không thể phân tích");
		});
	});

	// ==========================================
	// TEST: suggestFolderForNote
	// ==========================================
	describe("suggestFolderForNote", () => {
		const folders = [{ id: "1", name: "A" }];

		test("Nên trả về object JSON chuẩn", async () => {
			const fakeAiResponse = '{"action": "USE_EXISTING", "folderId": "1"}';
			mockGenerateContent.mockResolvedValue({
				response: { text: () => fakeAiResponse },
			});

			const result = await geminiService.suggestFolderForNote(
				"Nội dung",
				folders,
			);
			expect(result.action).toBe("USE_EXISTING");
		});

		test("Nên trả về null nếu AI lỗi (để Service chính tự xử lý)", async () => {
			mockGenerateContent.mockRejectedValue(new Error("AI Failed"));
			const result = await geminiService.suggestFolderForNote(
				"Nội dung",
				folders,
			);
			expect(result).toBeNull();
		});
	});
});
