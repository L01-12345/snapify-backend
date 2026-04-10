// src/middlewares/error.middleware.js
const { sendError } = require("../utils/response.util");
const multer = require("multer");

const errorHandler = (err, req, res, next) => {
	console.error(`[Error] - ${req.method} ${req.path}:`, err.message);

	const statusCode = err.statusCode || 500;
	let message = err.message || "Lỗi hệ thống không xác định";

	// Tùy chỉnh lỗi đặc thù của Prisma (Ví dụ: Lỗi trùng lặp dữ liệu)
	if (err.code === "P2002") {
		message = "Dữ liệu đã tồn tại trong hệ thống (Trùng lặp khóa duy nhất).";
	}

	// Tránh trả về stack trace (thông tin file/dòng code lỗi) trong môi trường production
	if (process.env.NODE_ENV === "production" && statusCode === 500) {
		message = "Hệ thống đang gặp sự cố, vui lòng thử lại sau.";
	}
	if (err instanceof multer.MulterError) {
		if (err.code === "LIMIT_FILE_SIZE") {
			return res.status(400).json({
				status: "error",
				message: "Kích thước file quá lớn. Tối đa chỉ được 5MB mỗi ảnh.",
			});
		}
		if (err.code === "LIMIT_UNEXPECTED_FILE") {
			return res.status(400).json({
				status: "error",
				message:
					"Số lượng file vượt quá giới hạn (Tối đa 20 file) hoặc sai tên field.",
			});
		}
	}

	return sendError(res, statusCode, message);
};

module.exports = errorHandler;
