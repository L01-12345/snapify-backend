// src/middlewares/error.middleware.js
const { sendError } = require("../utils/response.util");

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

	return sendError(res, statusCode, message);
};

module.exports = errorHandler;
