const { sendSuccess } = require("../utils/response.util");
// const userService = require('../services/user.service');

const getProfile = async (req, res, next) => {
	try {
		const userId = req.user.id; // Lấy từ token
		// const user = await userService.getUserById(userId);

		const mockData = {
			id: userId,
			displayName: "Snapify User",
			email: req.user.email,
		};
		return sendSuccess(res, 200, "Lấy thông tin hồ sơ thành công", mockData);
	} catch (error) {
		next(error);
	}
};

const updateProfile = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { displayName, avatarUrl } = req.body;
		// const updatedUser = await userService.updateUserProfile(userId, { displayName, avatarUrl });

		return sendSuccess(res, 200, "Cập nhật hồ sơ thành công", {
			displayName,
			avatarUrl,
		});
	} catch (error) {
		next(error);
	}
};

module.exports = { getProfile, updateProfile };
