const { sendSuccess } = require("../utils/response.util");
// Tạm comment để chờ hiện thực ở bước sau
const authService = require("../services/auth.service");

const register = async (req, res, next) => {
	try {
		const { email, password, displayName } = req.body;
		const newUser = await authService.registerUser({
			email,
			password,
			displayName,
		});

		// Mock data trả về
		const mockData = { id: "123", email, displayName };
		return sendSuccess(res, 201, "Đăng ký tài khoản thành công", newUser);
	} catch (error) {
		next(error);
	}
};

const login = async (req, res, next) => {
	try {
		const { email, password } = req.body;
		const result = await authService.loginUser(email, password);

		// Mock data trả về
		const mockData = { token: "eyJhbGciOiJIUz...", user: { email } };
		return sendSuccess(res, 200, "Đăng nhập thành công", result);
	} catch (error) {
		next(error);
	}
};

const forgotPassword = async (req, res, next) => {
	try {
		const { email } = req.body;
		await authService.processForgotPassword(email);

		return sendSuccess(
			res,
			200,
			"Hướng dẫn khôi phục mật khẩu đã được gửi vào email của bạn",
		);
	} catch (error) {
		next(error);
	}
};

const resetPassword = async (req, res, next) => {
	try {
		const { email, otp, newPassword } = req.body;
		const result = await authService.resetPassword(email, otp, newPassword);
		return sendSuccess(res, 200, result.message);
	} catch (err) {
		next(err);
	}
};
module.exports = { register, login, forgotPassword, resetPassword };
