const { sendSuccess, sendError } = require("../utils/response.util");
const userService = require("../services/user.service");
const cloudflareService = require("../services/cloudflare.service");

const MAX_DISPLAYNAME_LENGTH = 50;
const MAX_BIO_LENGTH = 500;

const getProfile = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const user = await userService.getUserById(userId);

		return sendSuccess(res, 200, "Lấy thông tin hồ sơ thành công", user);
	} catch (error) {
		next(error);
	}
};

const updateProfile = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { displayName, avatarUrl, bio } = req.body;

		if (displayName !== undefined) {
			if (typeof displayName !== "string") {
				return sendError(res, 400, "Tên hiển thị phải là chuỗi");
			}
			if (displayName.trim().length === 0) {
				return sendError(res, 400, "Tên hiển thị không được để trống");
			}
			if (displayName.trim().length > MAX_DISPLAYNAME_LENGTH) {
				return sendError(
					res,
					400,
					`Tên hiển thị không được vượt quá ${MAX_DISPLAYNAME_LENGTH} ký tự`,
				);
			}
		}

		if (bio !== undefined) {
			if (typeof bio !== "string") {
				return sendError(res, 400, "Giới thiệu phải là chuỗi");
			}
			if (bio.length > MAX_BIO_LENGTH) {
				return sendError(
					res,
					400,
					`Giới thiệu không được vượt quá ${MAX_BIO_LENGTH} ký tự`,
				);
			}
		}

		const updateData = {};
		if (displayName !== undefined) updateData.displayName = displayName.trim();
		if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
		if (bio !== undefined) updateData.bio = bio;

		const updatedUser = await userService.updateUserProfile(userId, updateData);

		return sendSuccess(res, 200, "Cập nhật hồ sơ thành công", updatedUser);
	} catch (error) {
		next(error);
	}
};

const uploadAvatar = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const file = req.file;

		if (!file) {
			const error = new Error("Vui lòng upload một hình ảnh");
			error.statusCode = 400;
			throw error;
		}

		const avatarUrl = await cloudflareService.uploadFileToR2(file, "avatars");

		await userService.updateUserProfile(userId, { avatarUrl });

		return sendSuccess(
			res,
			200,
			"Cập nhật ảnh đại diện thành công",
			{ avatarUrl },
		);
	} catch (error) {
		next(error);
	}
};

module.exports = { getProfile, updateProfile, uploadAvatar };
