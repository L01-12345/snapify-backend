// src/services/note.service.js
const prisma = require("../utils/prisma.util");
const cloudflareService = require("../services/cloudflare.service");
const geminiService = require("../services/gemini.service");

const processImageToNote = async (userId, file) => {
	// LUỒNG CHÍNH CỦA TÍNH NĂNG SNAP-TO-NOTE:

	// 1. Gọi service để đẩy ảnh thật lên Cloudflare R2
	const imageUrl = await cloudflareService.uploadFileToR2(file, "notes");

	// 2. Gửi ảnh (dạng Buffer) song song sang Gemini AI để trích xuất chữ và generate nội dung
	// Chúng ta dùng file.buffer và file.mimetype nhận từ controller
	const aiGeneratedData = await geminiService.generateNoteFromImage(
		file.buffer,
		file.mimetype,
	);

	// 3. Tạo Note mới trong Database với dữ liệu thật từ AI và R2
	const newNote = await prisma.note.create({
		data: {
			userId,
			// Dữ liệu Title và Content hoàn chỉnh từ AI
			title: aiGeneratedData.title,
			content: aiGeneratedData.content,
			status: "PENDING", // Mặc định là chờ xử lý (Actioned)
			images: {
				create: {
					imageUrl: imageUrl, // Sử dụng URL thật từ Cloudflare
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
