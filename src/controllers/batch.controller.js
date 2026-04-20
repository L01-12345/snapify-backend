const { sendSuccess } = require("../utils/response.util");
const batchService = require("../services/batch.service");

// const createBatchPDF = async (req, res, next) => {
// 	try {
// 		const userId = req.user.id;
// 		const { noteIds, title } = req.body;

// 		if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
// 			const error = new Error("Vui lòng cung cấp danh sách ID ghi chú để gộp");
// 			error.statusCode = 400;
// 			throw error;
// 		}

// 		// const batch = await batchService.generatePDF(userId, noteIds, title);

// 		const mockBatch = {
// 			id: "batch_1",
// 			title,
// 			pdfUrl: "https://cloud.com/file.pdf",
// 		};
// 		return sendSuccess(res, 201, "Tạo file PDF gộp thành công", mockBatch);
// 	} catch (error) {
// 		next(error);
// 	}
// };

const getBatches = async (req, res, next) => {
	try {
		const batches = await batchService.getUserBatches(req.user.id);
		return sendSuccess(res, 200, "Lấy danh sách PDF thành công", batches);
	} catch (error) {
		next(error);
	}
};

const updateBatch = async (req, res, next) => {
	try {
		const { title, folderId } = req.body;
		const updatedBatch = await batchService.updateBatch(
			req.params.id,
			req.user.id,
			{ title, folderId },
		);
		return sendSuccess(res, 200, "Cập nhật PDF thành công", updatedBatch);
	} catch (error) {
		next(error);
	}
};

const deleteBatch = async (req, res, next) => {
	try {
		const result = await batchService.deleteBatch(req.params.id, req.user.id);
		return sendSuccess(res, 200, result.message);
	} catch (error) {
		next(error);
	}
};

const scanToPDF = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const files = req.files; // Lưu ý: Lấy từ req.files (số nhiều) do dùng upload.array
		const { title } = req.body;

		const newBatch = await batchService.createPDFFromUploads(
			userId,
			files,
			title,
		);

		return sendSuccess(res, 201, "Tạo tài liệu PDF thành công", newBatch);
	} catch (error) {
		next(error);
	}
};

module.exports = {
	// createBatchPDF,
	getBatches,
	scanToPDF,
	updateBatch,
	deleteBatch,
};
