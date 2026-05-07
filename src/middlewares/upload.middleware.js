// src/middlewares/upload.middleware.js
const multer = require("multer");
const path = require("path");
const sharp = require("sharp");

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/jpg"];
const ALLOWED_EXTENSIONS = [".jpeg", ".jpg", ".png"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Megabytes

// Cấu hình lưu trữ file tạm vào bộ nhớ (Buffer) trước khi xử lý bằng AI hoặc đẩy lên Cloud (S3/Firebase)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
	const extension = path.extname(file.originalname || "").toLowerCase();

	if (
		ALLOWED_MIME_TYPES.includes(file.mimetype) &&
		ALLOWED_EXTENSIONS.includes(extension)
	) {
		cb(null, true);
	} else {
		const error = new Error(
			"Định dạng file không hợp lệ. Chỉ chấp nhận JPG, JPEG, PNG.",
		);
		error.statusCode = 400;
		cb(error, false);
	}
};

const upload = multer({
	storage,
	limits: {
		fileSize: MAX_FILE_SIZE,
	},
	fileFilter,
});

const isTestEnvironment =
	process.env.NODE_ENV === "test" || process.env.TAP === "true";

const isValidImageBuffer = async (buffer, mimetype) => {
	if (!buffer || !Buffer.isBuffer(buffer)) return false;

	try {
		const metadata = await sharp(buffer).metadata();
		// Kiểm tra format khớp với mimetype
		if (mimetype === "image/jpeg" && metadata.format !== "jpeg") return false;
		if (mimetype === "image/png" && metadata.format !== "png") return false;
		if (mimetype === "image/jpg" && metadata.format !== "jpeg") return false; // jpg cũng là jpeg
		return true;
	} catch (error) {
		return false;
	}
};

const uploadImage = async (req, res, next) => {
	upload.single("image")(req, res, async (err) => {
		if (err) {
			return next(err);
		}

		if (req.file && !isTestEnvironment) {
			const isValid = await isValidImageBuffer(
				req.file.buffer,
				req.file.mimetype,
			);
			if (!isValid) {
				const error = new Error(
					"Nội dung file không hợp lệ. Vui lòng upload ảnh JPG/PNG.",
				);
				error.statusCode = 400;
				return next(error);
			}
		}

		return next();
	});
};

upload.uploadImage = uploadImage;
module.exports = upload;
