// src/services/note.service.js
const prisma = require("../utils/prisma.util");
const cloudflareService = require("../services/cloudflare.service");
const geminiService = require("../services/gemini.service");
const removeVietnameseTones = require("../utils/string.util");

const processImageToNote = async (userId, file) => {
	let imageUrl = null;

	try {
		// 1. Upload ảnh lên Cloudflare (Nếu lỗi sẽ văng ra catch luôn)
		// imageUrl = await cloudflareService.uploadFileToR2(file, "notes");

		// // 2. Gọi AI OCR
		// let noteTitle = "Ghi chú chưa có tiêu đề";
		// let noteContent = "";

		// try {
		// 	const aiGeneratedData = await geminiService.generateNoteFromImage(
		// 		file.buffer,
		// 		file.mimetype,
		// 	);
		// 	noteTitle = aiGeneratedData.title || noteTitle;
		// 	noteContent = aiGeneratedData.content || "";
		// } catch (aiError) {
		// 	console.error("AI OCR Failed, saving image anyway:", aiError);
		// 	// EDGE CASE 1: AI sập, nhưng ảnh đã lưu trên R2 -> Vẫn tạo Note rỗng cho user tự gõ
		// 	noteTitle = "Lỗi trích xuất (Cần cập nhật)";
		// 	noteContent = "Hệ thống AI đang bận, bạn vui lòng tự nhập nội dung nhé.";
		// }
		const [imageUrl, aiGeneratedData] = await Promise.all([
			cloudflareService.uploadFileToR2(file, "notes"),
			geminiService
				.generateNoteFromImage(file.buffer, file.mimetype)
				.catch((aiError) => {
					console.error("AI OCR Failed:", aiError);
					return {
						title: "Lỗi trích xuất (Cần cập nhật)",
						content: "Hệ thống AI đang bận, bạn vui lòng tự nhập nội dung.",
					};
				}),
		]);

		// 3. Tạo Note
		const newNote = await prisma.note.create({
			data: {
				userId,
				title: aiGeneratedData.title,
				content: aiGeneratedData.content,
				status: "PENDING",
				// folderId: KHÔNG ĐIỀN Ở ĐÂY, để nguyên là Chưa phân loại
				images: {
					create: {
						imageUrl: imageUrl,
						orderIndex: 0,
					},
				},
				titleNoAccent: removeVietnameseTones(title),
				contentNoAccent: removeVietnameseTones(content),
			},
			include: {
				images: true,
			},
		});

		return newNote;
	} catch (error) {
		console.error("Lỗi processImageToNote:", error);
		const err = new Error("Không thể tạo ghi chú từ hình ảnh lúc này.");
		err.statusCode = 500;
		throw err;
	}
};

const searchUserNotes = async (userId, keyword) => {
	// 1. EDGE CASE: Người dùng gửi lên từ khóa rỗng, null, hoặc chỉ toàn dấu cách
	if (!keyword || typeof keyword !== "string") {
		return []; // Trả về mảng rỗng ngay lập tức, không gọi DB làm chậm hệ thống
	}

	// 2. LÀM SẠCH DỮ LIỆU (Sanitization) bằng Regular Expression
	// - Lọc bỏ các ký tự đặc biệt có thể làm sai lệch kết quả tìm kiếm (như %, #, *, [, ], v.v.)
	// - trim() để xóa khoảng trắng thừa ở 2 đầu
	const sanitizedKeyword = keyword.replace(/[#%^*_\[\]{}|<>\\]/g, "").trim();
	const noAccentKeyword = removeVietnameseTones(sanitizedKeyword);

	// EDGE CASE: Sau khi lọc sạch ký tự rác mà từ khóa bị rỗng (VD: user nhập "###")
	if (!sanitizedKeyword) {
		return [];
	}

	// 3. Thực hiện truy vấn tìm kiếm
	const notes = await prisma.note.findMany({
		where: {
			userId,
			OR: [
				// Nhóm 1: Tìm chính xác từ có dấu
				{ title: { contains: sanitizedKeyword, mode: "insensitive" } },
				{ content: { contains: sanitizedKeyword, mode: "insensitive" } },

				// Nhóm 2: Tìm theo không dấu
				{ titleNoAccent: { contains: noAccentKeyword, mode: "insensitive" } },
				{ contentNoAccent: { contains: noAccentKeyword, mode: "insensitive" } },
			],
		},
		include: { folder: true },
		orderBy: { updatedAt: "desc" },
	});

	// 4. LƯU LỊCH SỬ TÌM KIẾM THÔNG MINH
	// Chỉ lưu nếu người dùng thực sự tìm ra kết quả, tránh việc lưu rác vào DB
	// khi user gõ sai hoặc gõ lung tung.
	if (notes.length > 0) {
		// Tùy chọn nâng cao: Có thể kiểm tra xem keyword này đã tìm trong ngày chưa để tránh lưu trùng lặp
		await prisma.searchHistory.create({
			data: {
				userId,
				keyword: sanitizedKeyword,
			},
		});
	}

	return notes;
};

const getNotesWithPagination = async (
	userId,
	status,
	pageNumber,
	limitNumber,
) => {
	// EDGE CASE 1: Client truyền lên một status không có trong hệ thống

	const validStatuses = ["PENDING", "ACTIONED", "ARCHIVED"];
	if (status && !validStatuses.includes(status.toUpperCase())) {
		const error = new Error("Trạng thái bộ lọc không hợp lệ");
		error.statusCode = 400;
		throw error;
	}

	const whereCondition = { userId };
	if (status) {
		whereCondition.status = status.toUpperCase(); // Đảm bảo luôn in hoa để khớp với Enum Database
	}

	const [notes, totalCount] = await Promise.all([
		prisma.note.findMany({
			where: whereCondition,
			skip: (pageNumber - 1) * limitNumber,
			take: limitNumber,
			orderBy: { updatedAt: "desc" },
		}),
		prisma.note.count({ where: whereCondition }),
	]);

	return { notes, totalCount };
};

const getNoteDetails = async (id, userId) => {
	// BẢO MẬT: Dùng findFirst thay vì findUnique để truyền kèm userId vào điều kiện tìm kiếm.
	// Đảm bảo chỉ lấy Note nếu ID đó thực sự thuộc về User đang đăng nhập.
	const note = await prisma.note.findFirst({
		where: {
			id: id,
			userId: userId,
		},
		include: {
			folder: true, // Thường khi xem chi tiết sẽ cần biết nó ở thư mục nào
			images: true,
			actions: true,
			entities: true,
		},
	});

	// EDGE CASE 2: Không tìm thấy hoặc User đang cố xem trộm Note của người khác
	if (!note) {
		const error = new Error(
			"Không tìm thấy ghi chú hoặc bạn không có quyền truy cập",
		);
		error.statusCode = 404;
		throw error;
	}
	return note;
};

const updateNoteData = async (id, userId, updateData) => {
	// 1. BẢO MẬT: Kiểm tra xem Note có tồn tại và thuộc quyền sở hữu của user không
	const existingNote = await prisma.note.findFirst({
		where: { id: id, userId: userId },
	});

	if (!existingNote) {
		const error = new Error(
			"Không tìm thấy ghi chú hoặc bạn không có quyền chỉnh sửa",
		);
		error.statusCode = 404;
		throw error;
	}
	const validStatuses = ["NEW", "PROCESSED", "ARCHIVED"];
	const status = updateData.status;
	if (status && !validStatuses.includes(status.toUpperCase())) {
		const error = new Error("Trạng thái cập nhật không hợp lệ");
		error.statusCode = 400;
		throw error;
	}

	// BẢO MẬT 2: Chặn không cho cập nhật các trường nhạy cảm nếu client cố tình gửi lên
	delete updateData.id;
	delete updateData.userId;
	delete updateData.createdAt;

	// EDGE CASE 3: Nếu user muốn đổi Thư mục (cập nhật folderId)
	if (updateData.folderId) {
		// Phải kiểm tra xem cái folderId mới đó có thực sự là của user này tạo ra không
		const folderExists = await prisma.folder.findFirst({
			where: { id: updateData.folderId, userId: userId },
		});

		if (!folderExists) {
			const error = new Error("Thư mục đích không tồn tại hoặc không hợp lệ");
			error.statusCode = 400;
			throw error;
		}
	}

	// 2. Thực hiện cập nhật an toàn
	return await prisma.note.update({
		where: { id },
		data: updateData,
		include: {
			folder: true, // Trả về thông tin thư mục mới (nếu có đổi)
		},
	});
};

const categorizeNoteWithAI = async (id) => {
	// 1. Lấy thông tin Note và kiểm tra tồn tại
	const note = await prisma.note.findUnique({ where: { id } });
	if (!note) {
		const err = new Error("Không tìm thấy ghi chú");
		err.statusCode = 404;
		throw err;
	}

	// 2. Lấy toàn bộ thư mục CỦA USER ĐÓ
	const userFolders = await prisma.folder.findMany({
		where: { userId: note.userId },
	});

	// 3. Hỏi ý kiến AI
	const aiDecision = await geminiService.suggestFolderForNote(
		note.content,
		userFolders,
	);

	let finalFolderId = null;

	// EDGE CASE 2: AI trả về lỗi (chập chờn mạng), bỏ qua không phân loại, giữ nguyên thư mục cũ/null
	if (!aiDecision) return note;

	// XỬ LÝ TRƯỜNG HỢP 1: AI BẢO DÙNG THƯ MỤC CŨ
	if (aiDecision.action === "USE_EXISTING" && aiDecision.folderId) {
		// EDGE CASE 3: Hallucination - AI "bịa" ra 1 cái ID không có thật trong danh sách
		const isFolderExist = userFolders.some((f) => f.id === aiDecision.folderId);
		if (isFolderExist) {
			finalFolderId = aiDecision.folderId;
		} else {
			// Nếu ID bịa, ép nó rẽ sang nhánh tạo mới
			aiDecision.action = "CREATE_NEW";
			aiDecision.newFolderName = "Thư mục tự động";
		}
	}

	// XỬ LÝ TRƯỜNG HỢP 2: AI BẢO TẠO THƯ MỤC MỚI (Hoặc bị đẩy sang từ Edge Case 3)
	if (aiDecision.action === "CREATE_NEW" || !finalFolderId) {
		const newFolder = await prisma.folder.create({
			data: {
				userId: note.userId,
				name: aiDecision.newFolderName || "Smart Folder",
				description:
					aiDecision.newFolderDescription || "Được phân loại tự động bởi AI",
				type: "SMART", // Đánh dấu đây là thư mục do máy tự tạo
			},
		});
		finalFolderId = newFolder.id;
	}

	// 4. Cập nhật Note với ID Folder cuối cùng
	const updatedNote = await prisma.note.update({
		where: { id },
		data: { folderId: finalFolderId },
		include: { folder: true }, // Trả về kèm thông tin thư mục để Frontend hiện thông báo
	});

	return updatedNote;
};

// =========================================================
// TẠO GHI CHÚ THỦ CÔNG (Không qua chụp ảnh)
// =========================================================
const createManualNote = async (userId, noteData) => {
	// EDGE CASE 1: Kiểm tra nội dung cơ bản
	const title = noteData.title?.trim() || "Ghi chú mới";
	const content = noteData.content?.trim() || "";

	// EDGE CASE 2: Nếu user muốn lưu ngay vào một thư mục
	if (noteData.folderId) {
		const folderExists = await prisma.folder.findFirst({
			where: { id: noteData.folderId, userId: userId },
		});

		if (!folderExists) {
			const error = new Error("Thư mục không tồn tại hoặc không hợp lệ");
			error.statusCode = 400;
			throw error;
		}
	}

	return await prisma.note.create({
		data: {
			userId,
			title,
			content,
			folderId: noteData.folderId || null,
			status: "ACTIONED", // Ghi chú gõ tay mặc định xem như đã xử lý xong
			titleNoAccent: removeVietnameseTones(title),
			contentNoAccent: removeVietnameseTones(content),
		},
		include: {
			folder: true,
		},
	});
};

// =========================================================
// XÓA GHI CHÚ
// =========================================================
const deleteNote = async (id, userId) => {
	// 1. BẢO MẬT: Kiểm tra quyền sở hữu
	const existingNote = await prisma.note.findFirst({
		where: { id: id, userId: userId },
	});

	if (!existingNote) {
		const error = new Error(
			"Không tìm thấy ghi chú hoặc bạn không có quyền xóa",
		);
		error.statusCode = 404;
		throw error;
	}

	// 2. Thực hiện xóa trong Database
	// việc file ảnh gốc trên Cloudflare bị thừa lại
	await prisma.note.delete({
		where: { id },
	});

	return { message: "Đã xóa ghi chú thành công" };
};

// =========================================================
// TRÍCH XUẤT HÀNH ĐỘNG THÔNG MINH (Mock cho tính năng AI)
// =========================================================
const extractActionsFromNote = async (id, userId) => {
	// 1. BẢO MẬT
	const note = await prisma.note.findFirst({
		where: {
			id: id,
			userId: userId,
		},
	});

	if (!note) {
		const err = new Error(
			"Không tìm thấy ghi chú hoặc bạn không có quyền truy cập",
		);
		err.statusCode = 404;
		throw err;
	}

	// 2. EDGE CASE 1 (Tối ưu chi phí): Ghi chú rỗng hoặc chỉ có khoảng trắng
	if (!note.content || note.content.trim() === "") {
		return [];
	}

	try {
		// 3. GỌI AI THẬT: Truyền nội dung sang Gemini Service
		const extractedActions = await geminiService.extractSmartActions(
			note.content,
		);

		// 4. EDGE CASE 2 (Bảo vệ format): Đảm bảo AI luôn trả về mảng
		if (!extractedActions || !Array.isArray(extractedActions)) {
			console.warn(`[AI Warning] Gemini trả về sai định dạng cho Note ${id}`);
			return [];
		}

		return extractedActions;
	} catch (error) {
		// 5. EDGE CASE 3 (Sự cố ngoại cảnh): Rớt mạng, hết Quota API, Cloudflare chặn
		console.error(
			`[AI Error] Trích xuất action thất bại cho Note ${id}:`,
			error.message,
		);
		return [];
	}
};

module.exports = {
	processImageToNote,
	searchUserNotes,
	getNotesWithPagination,
	getNoteDetails,
	updateNoteData,
	categorizeNoteWithAI,
	createManualNote,
	deleteNote,
	extractActionsFromNote,
};
