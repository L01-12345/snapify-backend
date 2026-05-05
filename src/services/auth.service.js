// src/services/auth.service.js
const prisma = require("../utils/prisma.util");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const isValidEmail = (email) => {
	// Regex chuẩn xác và nhẹ gọn để kiểm tra email
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
};

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
	if (!user) return; // Bảo mật: Vẫn trả về thành công

	// 1. Sinh mã OTP 6 số ngẫu nhiên
	const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

	// 2. Lưu OTP vào Database (Hết hạn sau 15 phút)
	const expireTime = new Date(Date.now() + 15 * 60 * 1000);
	await prisma.user.update({
		where: { email },
		data: {
			resetPasswordOtp: otpCode,
			resetPasswordExpires: expireTime,
		},
	});

	// 3. Cấu hình Nodemailer
	const transporter = nodemailer.createTransport({
		host: "smtp.gmail.com",
		port: 465,
		secure: true,
		service: "gmail",
		auth: {
			user: process.env.EMAIL_USER, // VD: snapify.noreply@gmail.com
			pass: process.env.EMAIL_PASS, // Mật khẩu ứng dụng (App Password)
		},
	});

	// 4. Gửi Email chứa mã số thay vì Link
	const mailOptions = {
		from: `"Snapify Support" <${process.env.EMAIL_USER}>`,
		to: user.email,
		subject: "Mã khôi phục mật khẩu Snapify",
		html: `
			<h3>Xin chào ${user.displayName},</h3>
			<p>Mã xác nhận khôi phục mật khẩu của bạn là:</p>
			<h1 style="font-size: 32px; letter-spacing: 5px; color: #4CAF50;">${otpCode}</h1>
			<p>Mã này có hiệu lực trong vòng 15 phút.</p>
		`,
	};

	try {
		await transporter.sendMail(mailOptions);
		console.log("[Email Success] Đã gửi OTP tới: " + email);
	} catch (error) {
		console.error("[Email Error]", error);
	}
};

const resetPassword = async (email, otp, newPassword) => {
	// 2. Tìm user trong hệ thống
	const user = await prisma.user.findUnique({ where: { email } });
	if (!user) {
		const error = new Error("Người dùng không tồn tại");
		error.statusCode = 404;
		throw error;
	}

	// 3. Đối chiếu mã OTP
	if (user.resetPasswordOtp !== otp) {
		const error = new Error("Mã OTP không chính xác");
		error.statusCode = 400;
		throw error;
	}

	// 4. Kiểm tra thời hạn của OTP
	const currentTime = new Date();
	// Cần kiểm tra xem resetPasswordExpires có tồn tại không trước khi so sánh
	if (!user.resetPasswordExpires || currentTime > user.resetPasswordExpires) {
		const error = new Error(
			"Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã mới.",
		);
		error.statusCode = 400;
		throw error;
	}

	// 5. đổi mật khẩu mới
	const salt = await bcrypt.genSalt(10);
	const newPasswordHash = await bcrypt.hash(newPassword, salt);

	// 6. Cập nhật Database: Lưu pass mới và dọn dẹp sạch sẽ OTP cũ
	await prisma.user.update({
		where: { email },
		data: {
			passwordHash: newPasswordHash,
			resetPasswordOtp: null, // Thu hồi OTP để không dùng lại được nữa
			resetPasswordExpires: null, // Xóa thời hạn
		},
	});

	return {
		message:
			"Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.",
	};
};

module.exports = {
	registerUser,
	loginUser,
	processForgotPassword,
	resetPassword,
};
