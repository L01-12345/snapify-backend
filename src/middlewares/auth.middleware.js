// src/middlewares/auth.middleware.js
const jwt = require("jsonwebtoken");
const { sendError } = require("../utils/response.util");

const authMiddleware = (req, res, next) => {
	try {
		// Lấy header Authorization
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return sendError(
				res,
				401,
				"Truy cập bị từ chối: Vui lòng cung cấp token hợp lệ.",
			);
		}

		// Tách lấy token
		const token = authHeader.split(" ")[1];

		// Xác thực token bằng khóa bí mật (Cần định nghĩa JWT_SECRET trong file .env)
		const secretKey =
			process.env.JWT_SECRET || "snapify_secret_key_development";
		const decoded = jwt.verify(token, secretKey);

		// Gắn thông tin user giải mã được vào request để các Controller phía sau dùng
		req.user = decoded;

		next();
	} catch (error) {
		if (error.name === "TokenExpiredError") {
			return sendError(
				res,
				401,
				"Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
			);
		}
		if (error.name === "JsonWebTokenError") {
			return sendError(res, 401, "Token không hợp lệ hoặc đã bị thay đổi.");
		}
		return sendError(res, 500, "Lỗi xác thực người dùng.");
	}
};

module.exports = authMiddleware;
