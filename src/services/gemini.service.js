// src/services/gemini.service.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Khởi tạo SDK với API Key từ file .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Gửi ảnh chụp ghi chú sang Gemini AI để trích xuất văn bản và định dạng lại
 * @param {Buffer} imageBuffer - Dữ liệu nhị phân của ảnh (từ Multer)
 * @param {String} imageMimeType - Định dạng ảnh (image/jpeg, image/png...)
 * @returns {Promise<Object>} - Trả về { title, content }
 */
const generateNoteFromImage = async (imageBuffer, imageMimeType) => {
	try {
		// 1. Chọn mô hình Gemini 1.5 Flash (nhanh, multimodal, có free tier tốt)
		const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

		// 2. Chuẩn bị dữ liệu ảnh theo định dạng Gemini yêu cầu
		const imagePart = {
			inlineData: {
				data: imageBuffer.toString("base64"), // Chuyển Buffer thành base64 string
				mimeType: imageMimeType,
			},
		};

		// 3. Viết Prompt kỹ thuật để ép AI trả về dữ liệu chuẩn JSON cho Title và Content
		const prompt = `
      You are an expert OCR and document analysis AI. 
      Analyze the attached image of a note. 
      Your tasks are:
      1. Extract all readable text accurately.
      2. Detect the primary language (likely Vietnamese).
      3. Format the extracted text beautifully using Markdown.
      4. Suggest a concise, relevant title for this note in the detected language.
      5. Fix minor spelling or grammar errors if possible while maintaining original meaning.
      
      Return the result strictly in this JSON format:
      {
        "title": "Suggested Note Title",
        "content": "Formatted Markdown Content..."
      }
    `;

		// 4. Gọi API AI
		const result = await model.generateContent([prompt, imagePart]);
		const response = await result.response;
		const text = response.text();

		// 5. Parse dữ liệu JSON trả về từ AI (chú ý: AI đôi khi bao JSON bằng ```json ... ```)
		const cleanJsonString = text
			.replace(/```json/g, "")
			.replace(/```/g, "")
			.trim();
		const noteData = JSON.parse(cleanJsonString);

		return {
			title: noteData.title || "Ghi chú từ hình ảnh",
			content: noteData.content || text, // Fallback nếu parse lỗi
		};
	} catch (error) {
		console.error("Lỗi khi gọi Gemini API:", error);
		// Trong trường hợp lỗi AI, ta vẫn nên trả về tiêu đề mặc định và nội dung trống hoặc lỗi
		return {
			title: `Lỗi phân tích ảnh (${Date.now()})`,
			content:
				"Hệ thống AI tạm thời không thể phân tích hình ảnh này. Vui lòng tự chỉnh sửa nội dung.",
		};
	}
};

module.exports = {
	generateNoteFromImage,
};
