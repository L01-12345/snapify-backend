// src/middlewares/upload.middleware.js
const multer = require("multer");

// Cấu hình lưu trữ file tạm vào bộ nhớ (Buffer) trước khi xử lý bằng AI hoặc đẩy lên Cloud (S3/Firebase)
const storage = multer.memoryStorage();

// Bộ lọc để ngăn chặn upload các file không phải là hình ảnh
const fileFilter = (req, file, cb) => {
	const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg"];

	if (allowedMimeTypes.includes(file.mimetype)) {
		// Chấp nhận file
		cb(null, true);
	} else {
		// Từ chối file và ném ra lỗi
		const error = new Error(
			"Định dạng file không hợp lệ. Chỉ chấp nhận JPG, JPEG, PNG.",
		);
		error.statusCode = 400;
		cb(error, false);
	}
};

// Khởi tạo middleware multer với giới hạn kích thước là 5MB
const upload = multer({
	storage: storage,
	limits: {
		fileSize: 5 * 1024 * 1024, // 5 Megabytes
	},
	fileFilter: fileFilter,
});

// Xuất ra module để xử lý 1 file duy nhất có tên field là 'image' trong form-data
const uploadImage = upload.single("image");

module.exports = upload;
