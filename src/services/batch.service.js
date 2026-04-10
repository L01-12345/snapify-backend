// src/services/batch.service.js
const prisma = require("../utils/prisma.util");
const { PDFDocument } = require("pdf-lib");
const cloudflareService = require("./cloudflare.service");

// Hàm kiểm tra Magic Bytes (Bảo mật)
const verifyImageSignature = (buffer) => {
	if (buffer.length < 4) return null;
	if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
		return "jpg";
	if (
		buffer[0] === 0x89 &&
		buffer[1] === 0x50 &&
		buffer[2] === 0x4e &&
		buffer[3] === 0x47
	)
		return "png";
	return null;
};

// Hàm xử lý Scan trực tiếp từ Frontend
const createPDFFromUploads = async (userId, files, title) => {
	if (!files || files.length === 0) {
		const error = new Error("Vui lòng tải lên ít nhất một hình ảnh để tạo PDF");
		error.statusCode = 400;
		throw error;
	}

	const pdfDoc = await PDFDocument.create();
	let hasValidImage = false;

	// Lặp qua từng file Frontend gửi lên
	for (const file of files) {
		const imageType = verifyImageSignature(file.buffer);

		if (!imageType) {
			console.warn(
				`[Bảo mật] Bỏ qua file bị sai chữ ký tệp (không phải ảnh thật)`,
			);
			continue; // Bỏ qua file độc hại, làm tiếp file khác
		}

		try {
			let pdfImage;
			if (imageType === "jpg") {
				pdfImage = await pdfDoc.embedJpg(file.buffer);
			} else if (imageType === "png") {
				pdfImage = await pdfDoc.embedPng(file.buffer);
			}

			const page = pdfDoc.addPage([pdfImage.width, pdfImage.height]);
			page.drawImage(pdfImage, {
				x: 0,
				y: 0,
				width: pdfImage.width,
				height: pdfImage.height,
			});

			hasValidImage = true;
		} catch (err) {
			console.error(`Lỗi xử lý file thành PDF:`, err);
		}
	}

	if (!hasValidImage) {
		const error = new Error(
			"Không có hình ảnh hợp lệ nào được xử lý thành PDF",
		);
		error.statusCode = 422;
		throw error;
	}

	// 1. Xuất file PDF dạng Buffer
	const pdfBytes = await pdfDoc.save();
	const pdfBuffer = Buffer.from(pdfBytes);

	// 2. Upload file PDF lên Cloudflare R2 (Sử dụng hàm uploadBufferToR2 đã viết ở bước trước)
	const pdfUrl = await cloudflareService.uploadBufferToR2(
		pdfBuffer,
		"application/pdf",
		"pdf",
	);

	// 3. Lưu vào Database (Bảng BatchDocument)
	const newBatch = await prisma.batchDocument.create({
		data: {
			userId,
			title:
				title || `Tài liệu Scan - ${new Date().toLocaleDateString("vi-VN")}`,
			pdfUrl: pdfUrl,
		},
	});

	return newBatch;
};

const generatePDF = async (userId, noteIds, title) => {
	// 1. Kiểm tra xem các Note này có thuộc về User không và lấy tất cả NoteImages của chúng
	const notes = await prisma.note.findMany({
		where: {
			id: { in: noteIds },
			userId: userId,
		},
		include: { images: true },
	});

	if (notes.length === 0) {
		const error = new Error("Không tìm thấy ghi chú hợp lệ để gộp");
		error.statusCode = 404;
		throw error;
	}

	// 2. Bóc tách ra một mảng các ImageID để chuẩn bị tạo BatchItem
	let imageIds = [];
	notes.forEach((note) => {
		note.images.forEach((img) => {
			imageIds.push(img.id);
		});
	});

	// TODO: Tích hợp thư viện sinh PDF (như pdf-lib) tại đây để tạo file và đưa lên Cloud
	const mockPdfUrl = `https://storage.snapify.com/batch-${Date.now()}.pdf`;

	// 3. Sử dụng Transaction để tạo BatchDocument và các BatchItem đồng thời
	const result = await prisma.$transaction(async (tx) => {
		// Tạo record Document
		const newBatch = await tx.batchDocument.create({
			data: {
				userId,
				title,
				pdfUrl: mockPdfUrl,
			},
		});

		// Tạo các record BatchItem (Lưu thứ tự trang)
		const batchItemsData = imageIds.map((imageId, index) => ({
			batchId: newBatch.id,
			imageId: imageId,
			pageNumber: index + 1, // Đánh số trang từ 1
		}));

		await tx.batchItem.createMany({
			data: batchItemsData,
		});

		return newBatch;
	});

	return result;
};

// 1. LẤY DANH SÁCH BATCH (PDF)
const getUserBatches = async (userId) => {
	return await prisma.batchDocument.findMany({
		where: { userId },
		include: { folder: true }, // Trả về kèm thông tin thư mục chứa nó
		orderBy: { createdAt: "desc" },
	});
};

// 2. CẬP NHẬT BATCH (Đổi tên, Di chuyển thư mục)
const updateBatch = async (id, userId, updateData) => {
	// Kiểm tra quyền sở hữu
	const existingBatch = await prisma.batchDocument.findFirst({
		where: { id, userId },
	});
	if (!existingBatch) {
		const error = new Error(
			"Không tìm thấy tài liệu PDF hoặc bạn không có quyền",
		);
		error.statusCode = 404;
		throw error;
	}

	// Nếu muốn chuyển thư mục, kiểm tra thư mục có tồn tại không
	if (updateData.folderId) {
		const folder = await prisma.folder.findFirst({
			where: { id: updateData.folderId, userId },
		});
		if (!folder) {
			const error = new Error("Thư mục đích không tồn tại");
			error.statusCode = 400;
			throw error;
		}
	}

	return await prisma.batchDocument.update({
		where: { id },
		data: {
			title: updateData.title,
			folderId: updateData.folderId,
		},
		include: { folder: true },
	});
};

// 3. XÓA BATCH (PDF)
const deleteBatch = async (id, userId) => {
	const existingBatch = await prisma.batchDocument.findFirst({
		where: { id, userId },
	});
	if (!existingBatch) {
		const error = new Error("Không tìm thấy tài liệu PDF");
		error.statusCode = 404;
		throw error;
	}

	// Tùy chọn: Bạn có thể viết thêm logic gọi API Cloudflare S3 để xóa file thật trên R2 ở đây
	// await cloudflareService.deleteFileFromR2(existingBatch.pdfUrl);

	// Xóa DB
	await prisma.batchDocument.delete({ where: { id } });
	return { message: "Đã xóa tài liệu PDF thành công" };
};

module.exports = {
	generatePDF,
	getUserBatches,
	createPDFFromUploads,
	updateBatch,
	deleteBatch,
};
