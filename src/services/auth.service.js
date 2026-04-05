// src/services/auth.service.js
const prisma = require("../utils/prisma.util");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const registerUser = async ({ email, password, displayName }) => {
	// 1. Kiểm tra email đã tồn tại chưa
	const existingUser = await prisma.user.findUnique({ where: { email } });
	if (existingUser) {
		const error = new Error("Email này đã được đăng ký!");
		error.statusCode = 400;
		throw error;
	}

	// 2. Hash mật khẩu (mức độ salt là 10)
	const salt = await bcrypt.genSalt(10);
	const passwordHash = await bcrypt.hash(password, salt);

	// 3. Tạo user mới trong Database
	const newUser = await prisma.user.create({
		data: { email, passwordHash, displayName },
	});

	// Ẩn passwordHash trước khi trả về
	delete newUser.passwordHash;
	return newUser;
};

const loginUser = async (email, password) => {
	// 1. Tìm user
	const user = await prisma.user.findUnique({ where: { email } });
	if (!user) {
		const error = new Error("Email hoặc mật khẩu không chính xác");
		error.statusCode = 401;
		throw error;
	}

	// 2. So sánh mật khẩu
	const isMatch = await bcrypt.compare(password, user.passwordHash);
	if (!isMatch) {
		const error = new Error("Email hoặc mật khẩu không chính xác");
		error.statusCode = 401;
		throw error;
	}

	// 3. Tạo JWT Token
	const secretKey = process.env.JWT_SECRET || "snapify_secret_key_development";
	const token = jwt.sign(
		{ id: user.id, email: user.email },
		secretKey,
		{ expiresIn: "7d" }, // Token có hạn 7 ngày
	);

	delete user.passwordHash;
	return { token, user };
};

const processForgotPassword = async (email) => {
	const user = await prisma.user.findUnique({ where: { email } });
	if (!user) {
		// Không ném lỗi để tránh bị hacker dò quét email tồn tại trong hệ thống
		return;
	}
	// TODO: Tích hợp NodeMailer hoặc dịch vụ gửi Email (SendGrid/AWS SES) để gửi link reset
	console.log(`[Email Mock] Đã gửi link reset password tới: ${email}`);
};

module.exports = { registerUser, loginUser, processForgotPassword };
