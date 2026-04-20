const Joi = require("joi");

const register = Joi.object({
	email: Joi.string().trim().email().required().messages({
		"string.email": "Định dạng email không hợp lệ",
		"string.empty": "Vui lòng nhập email",
		"any.required": "Email là bắt buộc",
	}),
	password: Joi.string().min(6).required().messages({
		"string.min": "Mật khẩu phải có ít nhất 6 ký tự",
		"string.empty": "Vui lòng nhập mật khẩu",
		"any.required": "Mật khẩu là bắt buộc",
	}),
	displayName: Joi.string().trim().min(2).max(50).required().messages({
		"string.min": "Tên hiển thị phải có ít nhất 2 ký tự",
		"string.max": "Tên hiển thị không được vượt quá 50 ký tự",
		"string.empty": "Vui lòng nhập tên hiển thị",
		"any.required": "Tên hiển thị là bắt buộc",
	}),
});

const login = Joi.object({
	email: Joi.string().trim().email().required().messages({
		// Khi Login, ta cố tình để chung câu báo lỗi để hacker không biết chính xác sai cái gì
		"string.email": "Email hoặc mật khẩu không chính xác",
		"string.empty": "Vui lòng nhập email",
		"any.required": "Email là bắt buộc",
	}),
	password: Joi.string().required().messages({
		"string.empty": "Vui lòng nhập mật khẩu",
		"any.required": "Mật khẩu là bắt buộc",
	}),
});

const forgotPassword = Joi.object({
	email: Joi.string().trim().email().required().messages({
		"string.email": "Định dạng email không hợp lệ",
		"string.empty": "Vui lòng nhập email",
		"any.required": "Email là bắt buộc",
	}),
});

const resetPassword = Joi.object({
	email: Joi.string().trim().email().required().messages({
		"string.email": "Định dạng email không hợp lệ",
		"any.required": "Email là bắt buộc",
	}),
	otp: Joi.string().trim().length(6).required().messages({
		"string.length": "Mã OTP phải bao gồm đúng 6 ký tự",
		"string.empty": "Vui lòng nhập mã OTP",
		"any.required": "Mã OTP là bắt buộc",
	}),
	newPassword: Joi.string().min(6).required().messages({
		"string.min": "Mật khẩu mới phải có ít nhất 6 ký tự",
		"string.empty": "Vui lòng nhập mật khẩu mới",
		"any.required": "Mật khẩu mới là bắt buộc",
	}),
});

module.exports = { register, login, forgotPassword, resetPassword };
