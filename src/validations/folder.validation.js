const Joi = require("joi");

const createFolder = Joi.object({
	name: Joi.string().trim().min(1).max(100).required().messages({
		"string.empty": "Tên thư mục không được để trống",
		"string.max": "Tên thư mục không được vượt quá 100 ký tự",
		"any.required": "Vui lòng cung cấp tên thư mục",
	}),
	description: Joi.string().trim().max(500).allow(null, "").messages({
		"string.max": "Mô tả không được dài quá 500 ký tự",
	}),
	// Nếu Frontend có truyền lên type, ta giới hạn nó phải thuộc Enum
	type: Joi.string().valid("MANUAL", "SMART").optional(),
});

const updateFolder = Joi.object({
	name: Joi.string().trim().min(1).max(100).optional(),
	description: Joi.string().trim().max(500).allow(null, "").optional(),
}).min(1); // Yêu cầu phải gửi lên ít nhất 1 trường để update

module.exports = { createFolder, updateFolder };
