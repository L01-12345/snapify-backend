// src/services/note.service.js
const prisma = require("../utils/prisma.util");

const processImageToNote = async (userId, file) => {
	// TODO: Tích hợp API Cloud Storage (S3/Firebase) để upload file và lấy URL thật
	const mockImageUrl = `https://storage.snapify.com/mock-image-${Date.now()}.jpg`;

	// TODO: Gọi API AI (Google Vision OCR) để trích xuất chữ
	const mockOCRText =
		"Đây là nội dung văn bản giả lập được OCR bóc tách từ hình ảnh...";

	// 1. Tạo Note mới với nội dung OCR
	const newNote = await prisma.note.create({
		data: {
			userId,
			title: "Ghi chú từ hình ảnh",
			content: mockOCRText,
			status: "PENDING",
			images: {
				create: {
					imageUrl: mockImageUrl,
					orderIndex: 0,
				},
			},
		},
		include: {
			images: true,
		},
	});

	return newNote;
};

const searchUserNotes = async (userId, keyword) => {
	// Tìm kiếm Note mà tiêu đề hoặc nội dung có chứa từ khóa
	const notes = await prisma.note.findMany({
		where: {
			userId,
			OR: [
				{ title: { contains: keyword } },
				{ content: { contains: keyword } },
			],
		},
		orderBy: { createdAt: "desc" },
	});

	// Lưu lại lịch sử tìm kiếm
	if (keyword) {
		await prisma.searchHistory.create({
			data: { userId, keyword },
		});
	}

	return notes;
};

const getNotesByStatus = async (userId, status) => {
	const whereCondition = { userId };
	if (status) {
		whereCondition.status = status;
	}

	return await prisma.note.findMany({
		where: whereCondition,
		include: { folder: true }, // Lấy kèm thông tin thư mục
		orderBy: { updatedAt: "desc" },
	});
};

const getNoteDetails = async (id) => {
	const note = await prisma.note.findUnique({
		where: { id },
		include: {
			images: true,
			actions: true,
			entities: true,
		},
	});

	if (!note) {
		const error = new Error("Không tìm thấy ghi chú");
		error.statusCode = 404;
		throw error;
	}
	return note;
};

const updateNoteData = async (id, updateData) => {
	return await prisma.note.update({
		where: { id },
		data: updateData,
	});
};

const categorizeNoteWithAI = async (id) => {
	// TODO: Tích hợp AI (NLP) để phân tích nội dung (content) và quyết định nhét vào Folder nào
	// Mock logic: Giả sử AI trả về ID của một thư mục Smart Folder

	const updatedNote = await prisma.note.update({
		where: { id },
		data: {
			// Cần chắc chắn thư mục này tồn tại trong DB, nếu không sẽ lỗi Khóa ngoại
			// Ở đây ta mock để code không chạy lỗi Prisma
			// folderId: 'mock-folder-id'
		},
	});
	return updatedNote;
};

module.exports = {
	processImageToNote,
	searchUserNotes,
	getNotesByStatus,
	getNoteDetails,
	updateNoteData,
	categorizeNoteWithAI,
};
