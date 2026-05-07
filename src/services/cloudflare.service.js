// src/services/cloudflare.service.js
const {
	S3Client,
	PutObjectCommand,
	HeadObjectCommand,
} = require("@aws-sdk/client-s3");
const crypto = require("crypto"); // Thư viện có sẵn của Node.js để tạo chuỗi ngẫu nhiên

// Khởi tạo kết nối với Cloudflare R2
const s3Client = new S3Client({
	region: "auto", // R2 luôn dùng 'auto'
	endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: process.env.R2_ACCESS_KEY_ID,
		secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
	},
});

/**
 * Upload file từ Buffer của Multer lên Cloudflare R2
 * @param {Object} file - Object req.file do Multer cung cấp
 * @param {String} folder - Tên thư mục ảo (VD: 'notes', 'avatars')
 * @returns {Promise<String>} - Trả về URL public của ảnh
 */
const uploadFileToR2 = async (file, folder = "uploads") => {
	try {
		const fileExtension = file.originalname.split(".").pop();

		// 1. Tạo mã băm SHA-256 từ nội dung file (Khử trùng lặp)
		const fileHash = crypto
			.createHash("sha256")
			.update(file.buffer)
			.digest("hex");
		const fileName = `${folder}/${fileHash}.${fileExtension}`;

		// 2. Kiểm tra xem file đã tồn tại trên Cloudflare chưa
		try {
			await s3Client.send(
				new HeadObjectCommand({
					Bucket: process.env.R2_BUCKET_NAME,
					Key: fileName,
				}),
			);

			return `${process.env.R2_PUBLIC_URL}/${fileName}`;
		} catch (headError) {
			// Bắt lỗi NotFound (Mã lỗi 404) -> File CHƯA TỒN TẠI -> Đi tiếp xuống bước Upload
			if (headError.name !== "NotFound") {
				throw headError; // Nếu lỗi khác (như sai API Key) thì văng lỗi ra ngoài
			}
		}

		// 3. Thực thi upload nếu file chưa tồn tại
		console.log(`[Upload] Đang tải ảnh mới lên Cloudflare: ${fileName}`);
		const command = new PutObjectCommand({
			Bucket: process.env.R2_BUCKET_NAME,
			Key: fileName,
			Body: file.buffer,
			ContentType: file.mimetype,
		});

		await s3Client.send(command);

		return `${process.env.R2_PUBLIC_URL}/${fileName}`;
	} catch (error) {
		console.error("Lỗi upload Cloudflare R2:", error);
		const err = new Error("Không thể tải ảnh lên hệ thống lưu trữ.");
		err.statusCode = 502;
		throw err;
	}
};

const uploadBufferToR2 = async (
	buffer,
	mimeType,
	extension,
	folder = "batches",
) => {
	try {
		const crypto = require("crypto");
		const randomString = crypto.randomBytes(8).toString("hex");
		const fileName = `${folder}/snapify-batch-${Date.now()}-${randomString}.${extension}`;

		const command = new PutObjectCommand({
			Bucket: process.env.R2_BUCKET_NAME,
			Key: fileName,
			Body: buffer,
			ContentType: mimeType,
		});

		await s3Client.send(command);
		return `${process.env.R2_PUBLIC_URL}/${fileName}`;
	} catch (error) {
		console.error("Lỗi upload Buffer lên R2:", error);
		throw new Error("Không thể tải file PDF lên hệ thống.");
	}
};

module.exports = {
	uploadFileToR2,
	uploadBufferToR2,
};
