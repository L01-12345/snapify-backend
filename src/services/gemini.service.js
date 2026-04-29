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
// Add backup model if AI analyzed failed
const generateNoteFromImage = async (imageBuffer, imageMimeType) => {
	// 1. Chuẩn bị dữ liệu và Prompt một lần duy nhất để tái sử dụng
	const imagePart = {
		inlineData: {
			data: imageBuffer.toString("base64"),
			mimeType: imageMimeType,
		},
	};

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

	// 2. DANH SÁCH MODEL ƯU TIÊN (Primary -> Backup 1 -> Backup 2...)
	const modelsToTry = [
		"gemini-2.5-flash",
		"gemini-3-flash-preview", // Lốp dự phòng 1: Model mới hơn, chịu tải tốt khi model 1.5 bị nghẽn
	];

	let lastError = null;

	// 3. VÒNG LẶP FALLBACK TỰ ĐỘNG
	for (const modelName of modelsToTry) {
		try {
			console.log(`[AI OCR] Đang thử phân tích ảnh với model: ${modelName}...`);
			const model = genAI.getGenerativeModel({ model: modelName });

			const result = await model.generateContent([prompt, imagePart]);
			const response = await result.response;
			const text = response.text();

			// Parse dữ liệu JSON trả về
			const cleanJsonString = text
				.replace(/```json/g, "")
				.replace(/```/g, "")
				.trim();
			const noteData = JSON.parse(cleanJsonString);

			console.log(`[AI OCR] Thành công với model: ${modelName}`);

			// Nếu thành công, trả về kết quả và THOÁT KHỎI vòng lặp ngay lập tức
			return {
				title: noteData.title || "Ghi chú từ hình ảnh",
				content: noteData.content || text,
			};
		} catch (error) {
			// Bắt lỗi (như 503, 429) và lưu lại để thử model tiếp theo
			console.warn(
				`[AI OCR Warning] Model ${modelName} thất bại: ${error.message}. Chuyển sang model dự phòng...`,
			);
			lastError = error;
		}
	}

	// 4. EDGE CASE CUỐI CÙNG: Nếu tất cả các model trong mảng đều sập
	console.error(
		"[AI OCR Critical Error] Tất cả các model dự phòng đều thất bại. Lỗi cuối cùng:",
		lastError?.message,
	);

	return {
		title: `Lỗi phân tích ảnh (${Date.now()})`,
		content:
			"Hệ thống AI tạm thời không thể phân tích hình ảnh này do quá tải mạng. Vui lòng tự chỉnh sửa nội dung.",
	};
};
// const generateNoteFromImage = async (imageBuffer, imageMimeType) => {
// 	try {
// 		// 1. Chọn mô hình Gemini 1.5 Flash (nhanh, multimodal, có free tier tốt)
// 		const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" }); //gemini-2.5-flash

// 		// 2. Chuẩn bị dữ liệu ảnh theo định dạng Gemini yêu cầu
// 		const imagePart = {
// 			inlineData: {
// 				data: imageBuffer.toString("base64"), // Chuyển Buffer thành base64 string
// 				mimeType: imageMimeType,
// 			},
// 		};

// 		// 3. Viết Prompt kỹ thuật để ép AI trả về dữ liệu chuẩn JSON cho Title và Content
// 		const prompt = `
//       You are an expert OCR and document analysis AI.
//       Analyze the attached image of a note.
//       Your tasks are:
//       1. Extract all readable text accurately.
//       2. Detect the primary language (likely Vietnamese).
//       3. Format the extracted text beautifully using Markdown.
//       4. Suggest a concise, relevant title for this note in the detected language.
//       5. Fix minor spelling or grammar errors if possible while maintaining original meaning.

//       Return the result strictly in this JSON format:
//       {
//         "title": "Suggested Note Title",
//         "content": "Formatted Markdown Content..."
//       }
//     `;

// 		// 4. Gọi API AI
// 		const result = await model.generateContent([prompt, imagePart]);
// 		const response = await result.response;
// 		const text = response.text();

// 		// 5. Parse dữ liệu JSON trả về từ AI (chú ý: AI đôi khi bao JSON bằng ```json ... ```)
// 		const cleanJsonString = text
// 			.replace(/```json/g, "")
// 			.replace(/```/g, "")
// 			.trim();
// 		const noteData = JSON.parse(cleanJsonString);

// 		return {
// 			title: noteData.title || "Ghi chú từ hình ảnh",
// 			content: noteData.content || text, // Fallback nếu parse lỗi
// 		};
// 	} catch (error) {
// 		console.error("Lỗi khi gọi Gemini API:", error);
// 		// Trong trường hợp lỗi AI, ta vẫn nên trả về tiêu đề mặc định và nội dung trống hoặc lỗi
// 		return {
// 			title: `Lỗi phân tích ảnh (${Date.now()})`,
// 			content:
// 				"Hệ thống AI tạm thời không thể phân tích hình ảnh này. Vui lòng tự chỉnh sửa nội dung.",
// 		};
// 	}
// };

// const suggestFolderForNote = async (noteContent, existingFolders) => {
// 	try {
// 		const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

// 		// Rút gọn data thư mục để tối ưu token gửi cho AI
// 		const simplifiedFolders = existingFolders.map((f) => ({
// 			id: f.id,
// 			name: f.name,
// 		}));

// 		const prompt = `
//       Bạn là một trợ lý ảo thông minh giúp phân loại ghi chú.
//       Dưới đây là nội dung của một ghi chú:
//       """${noteContent}"""

//       Và đây là danh sách các thư mục hiện có của người dùng:
//       ${JSON.stringify(simplifiedFolders)}

//       NHIỆM VỤ CỦA BẠN:
//       1. Đọc nội dung ghi chú.
//       2. So sánh với danh sách thư mục hiện có.
//       3. NẾU có thư mục phù hợp: Chọn "USE_EXISTING" và trả về ID của thư mục đó.
//       4. NẾU KHÔNG CÓ thư mục nào phù hợp với chủ đề (ví dụ ghi chú là Hóa học nhưng chỉ có thư mục Toán): Chọn "CREATE_NEW", tự nghĩ ra một tên thư mục ngắn gọn (dưới 30 ký tự) và một mô tả ngắn gọn.

//       TRẢ VỀ KẾT QUẢ DƯỚI DẠNG JSON TUYỆT ĐỐI THEO FORMAT SAU (Không kèm text nào khác):
//       Trường hợp 1: { "action": "USE_EXISTING", "folderId": "id-cua-thu-muc" }
//       Trường hợp 2: { "action": "CREATE_NEW", "newFolderName": "Tên thư mục mới", "newFolderDescription": "Mô tả..." }
//     `;

// 		const result = await model.generateContent(prompt);
// 		const text = result.response.text();

// 		// Xử lý dọn dẹp JSON
// 		const cleanJsonString = text
// 			.replace(/```json/g, "")
// 			.replace(/```/g, "")
// 			.trim();
// 		return JSON.parse(cleanJsonString);
// 	} catch (error) {
// 		console.error("Lỗi AI khi phân loại:", error);
// 		// Fallback: Nếu AI lỗi, trả về null để service tự xử lý
// 		return null;
// 	}
// };

// const extractSmartActions = async (text) => {
// 	// Prompt hướng dẫn AI (System Prompt)
// 	const prompt = `
//     Phân tích đoạn văn bản sau và trích xuất các hành động/thông tin quan trọng.
//     Trả về ĐÚNG định dạng JSON là một mảng các object. Tuyệt đối không giải thích gì thêm.
//     Mỗi object có cấu trúc: { "type": "PHONE" | "EMAIL" | "URL" | "DATE" | "TODO", "value": "nội dung trích xuất" }

//     Văn bản: "${text}"
//     `;

// 	try {
// 		const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" }); //gemini-2.5-flash
// 		const result = await model.generateContent(prompt);
// 		const responseText = result.response.text();

// 		// Cắt bỏ các ký tự Markdown rác (như ```json và ```) để parse thành object thật
// 		const cleanJsonString = responseText
// 			.replace(/```json/g, "")
// 			.replace(/```/g, "")
// 			.trim();
// 		return JSON.parse(cleanJsonString);
// 	} catch (error) {
// 		throw new Error(`Lỗi Gemini API: ${error.message}`);
// 	}
// };

// Add backup model if AI analyzed failed
const suggestFolderForNote = async (noteContent, existingFolders) => {
	// 1. Chuẩn bị dữ liệu và Prompt
	const simplifiedFolders = existingFolders.map((f) => ({
		id: f.id,
		name: f.name,
	}));

	const prompt = `
      Bạn là một trợ lý ảo thông minh giúp phân loại ghi chú.
      Dưới đây là nội dung của một ghi chú:
      """${noteContent}"""

      Và đây là danh sách các thư mục hiện có của người dùng:
      ${JSON.stringify(simplifiedFolders)}

      NHIỆM VỤ CỦA BẠN:
      1. Đọc nội dung ghi chú.
      2. So sánh với danh sách thư mục hiện có.
      3. NẾU có thư mục phù hợp: Chọn "USE_EXISTING" và trả về ID của thư mục đó.
      4. NẾU KHÔNG CÓ thư mục nào phù hợp với chủ đề: Chọn "CREATE_NEW", tự nghĩ ra một tên thư mục ngắn gọn (dưới 30 ký tự) và một mô tả ngắn gọn.

      TRẢ VỀ KẾT QUẢ DƯỚI DẠNG JSON TUYỆT ĐỐI THEO FORMAT SAU (Không kèm text nào khác):
      Trường hợp 1: { "action": "USE_EXISTING", "folderId": "id-cua-thu-muc" }
      Trường hợp 2: { "action": "CREATE_NEW", "newFolderName": "Tên thư mục mới", "newFolderDescription": "Mô tả..." }
    `;

	// 2. Danh sách Model ưu tiên (2.5 flash làm core, 3 flash làm dự phòng)
	const modelsToTry = ["gemini-2.5-flash", "gemini-3-flash-preview"];
	let lastError = null;

	// 3. Vòng lặp Fallback
	for (const modelName of modelsToTry) {
		try {
			const model = genAI.getGenerativeModel({ model: modelName });
			const result = await model.generateContent(prompt);
			const text = result.response.text();

			// Xử lý dọn dẹp JSON
			const cleanJsonString = text
				.replace(/```json/g, "")
				.replace(/```/g, "")
				.trim();

			return JSON.parse(cleanJsonString); // Thành công thì thoát ngay
		} catch (error) {
			console.warn(
				`[AI Suggest Folder Warning] Model ${modelName} thất bại: ${error.message}. Chuyển model...`,
			);
			lastError = error;
		}
	}

	// 4. Đường cùng: Tất cả model đều lỗi
	console.error(
		"[AI Suggest Folder Critical] Đã thử hết model nhưng vẫn lỗi:",
		lastError?.message,
	);
	// Fallback: Trả về null để service tự xử lý (không phân loại)
	return null;
};

const extractSmartActions = async (text) => {
	// 1. Chuẩn bị Prompt
	const prompt = `
    Phân tích đoạn văn bản sau và trích xuất các hành động/thông tin quan trọng.
    Trả về ĐÚNG định dạng JSON là một mảng các object. Tuyệt đối không giải thích gì thêm.
    Mỗi object có cấu trúc: { "type": "PHONE" | "EMAIL" | "URL" | "DATE" | "TODO", "value": "nội dung trích xuất" }
    
    Văn bản: "${text}"
    `;

	// 2. Danh sách Model ưu tiên
	const modelsToTry = ["gemini-2.5-flash", "gemini-3-flash-preview"];
	let lastError = null;

	// 3. Vòng lặp Fallback
	for (const modelName of modelsToTry) {
		try {
			const model = genAI.getGenerativeModel({ model: modelName });
			const result = await model.generateContent(prompt);
			const responseText = result.response.text();

			// Cắt bỏ Markdown rác
			const cleanJsonString = responseText
				.replace(/```json/g, "")
				.replace(/```/g, "")
				.trim();

			return JSON.parse(cleanJsonString); // Thành công thì thoát ngay
		} catch (error) {
			console.warn(
				`[AI Extract Actions Warning] Model ${modelName} thất bại: ${error.message}. Chuyển model...`,
			);
			lastError = error;
		}
	}

	// 4. Đường cùng: Tất cả model đều lỗi
	console.error(
		"[AI Extract Actions Critical] Đã thử hết model nhưng vẫn lỗi:",
		lastError?.message,
	);
	// Khác với hàm trên, hàm này cần throw lỗi ra ngoài để Service bắt lấy
	throw new Error(
		`Lỗi Gemini API (Đã thử hết các model): ${lastError?.message}`,
	);
};

module.exports = {
	generateNoteFromImage,
	suggestFolderForNote,
	extractSmartActions,
};
