// src/middlewares/avatar.middleware.js
const multer = require("multer");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
	const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg"];

	if (allowedMimeTypes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		const error = new Error(
			"Định dạng file không hợp lệ. Chỉ chấp nhận JPG, JPEG, PNG.",
		);
		error.statusCode = 400;
		cb(error, false);
	}
};

const uploadAvatar = multer({
	storage: storage,
	limits: {
		fileSize: 2 * 1024 * 1024,
	},
	fileFilter: fileFilter,
});

module.exports = uploadAvatar;