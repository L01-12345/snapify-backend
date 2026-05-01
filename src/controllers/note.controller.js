const { sendSuccess } = require("../utils/response.util");
const noteService = require("../services/note.service");

const snapToNote = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const file = req.file; // File ảnh được Multer đẩy vào đây

		if (!file) {
			const error = new Error("Vui lòng upload một hình ảnh");
			error.statusCode = 400;
			throw error;
		}

		const newNote = await noteService.processImageToNote(userId, file);

		const mockNote = {
			id: "note_1",
			title: "Trích xuất từ ảnh",
			content: "Nội dung OCR demo...",
		};
		return sendSuccess(
			res,
			201,
			"Xử lý hình ảnh và tạo ghi chú thành công",
			newNote,
		);
	} catch (error) {
		next(error);
	}
};

const searchNotes = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { q: keyword } = req.query;
		const notes = await noteService.searchUserNotes(userId, keyword);

		return sendSuccess(res, 200, `Kết quả tìm kiếm cho: ${keyword}`, notes);
	} catch (error) {
		next(error);
	}
};

const getNotes = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { status, page = 1, limit = 20 } = req.query; // PENDING, ACTIONED, ARCHIVED
		const pageNumber = parseInt(page);
		const limitNumber = parseInt(limit);
		const { notes, totalCount } = await noteService.getNotesWithPagination(
			userId,
			status,
			pageNumber,
			limitNumber,
		);
		const pagination = {
			total: totalCount,
			page: pageNumber,
			limit: limitNumber,
			totalPages: Math.ceil(totalCount / limitNumber),
		};

		return sendSuccess(res, 200, "Lấy danh sách ghi chú thành công", {
			notes,
			pagination,
		});
	} catch (error) {
		next(error);
	}
};

const getNoteById = async (req, res, next) => {
	try {
		const { id } = req.params;
		const note = await noteService.getNoteDetails(id, req.user.id);

		return sendSuccess(res, 200, "Lấy chi tiết ghi chú thành công", note);
	} catch (error) {
		next(error);
	}
};

const updateNote = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { title, content, status, folderId } = req.body;
		const validStatuses = ["NEW", "PROCESSED", "ARCHIVED"];

		const updatedNote = await noteService.updateNoteData(id, req.user.id, {
			title,
			content,
			status,
			folderId,
		});

		return sendSuccess(res, 200, "Cập nhật ghi chú thành công", updatedNote);
	} catch (error) {
		next(error);
	}
};

const getSmartActions = async (req, res, next) => {
	try {
		const { id } = req.params;
		const userId = req.user.id;
		const actions = await noteService.extractActionsFromNote(id, userId);

		const mockActions = [{ type: "PHONE", value: "0901234567" }];
		return sendSuccess(
			res,
			200,
			"Lấy danh sách hành động thông minh thành công",
			actions,
		);
	} catch (error) {
		next(error);
	}
};

const autoCategorize = async (req, res, next) => {
	try {
		const { id } = req.params;
		const result = await noteService.categorizeNoteWithAI(id);

		return sendSuccess(res, 200, "Tự động phân loại thành công", result);
	} catch (error) {
		next(error);
	}
};

const createNote = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { title, content, folderId } = req.body;

		const newNote = await noteService.createManualNote(userId, {
			title,
			content,
			folderId,
		});

		return sendSuccess(res, 201, "Tạo ghi chú thủ công thành công", newNote);
	} catch (error) {
		next(error);
	}
};

const deleteNote = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;

		const result = await noteService.deleteNote(id, userId);

		return sendSuccess(res, 200, result.message);
	} catch (error) {
		next(error);
	}
};

module.exports = {
	snapToNote,
	searchNotes,
	getNotes,
	getNoteById,
	updateNote,
	getSmartActions,
	autoCategorize,
	createNote,
	deleteNote,
};
