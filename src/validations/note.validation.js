const Joi = require("joi");

const updateNote = Joi.object({
	title: Joi.string().trim().max(255).allow(null, "").messages({
		"string.max": "Tiêu đề không được vượt quá 255 ký tự",
	}),
	content: Joi.string().allow(null, ""), // Cho phép chuỗi dài vì bạn xài @db.Text (OCR Text)
	folderId: Joi.string().uuid().allow(null).messages({
		"string.guid": "ID thư mục không hợp lệ",
	}),
	status: Joi.string().valid("PENDING", "ACTIONED", "ARCHIVED").optional(),
}).min(1);

const searchNotes = Joi.object({
	// Validate trên req.query
	q: Joi.string().trim().min(2).max(100).required().messages({
		"string.empty": "Vui lòng nhập từ khóa tìm kiếm",
		"string.min": "Từ khóa tìm kiếm phải có ít nhất 2 ký tự",
	}),
});

module.exports = { updateNote, searchNotes };
