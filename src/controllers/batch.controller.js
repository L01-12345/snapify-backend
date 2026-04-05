const { sendSuccess } = require("../utils/response.util");
// const batchService = require('../services/batch.service');

const createBatchPDF = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { noteIds, title } = req.body;

		if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
			const error = new Error("Vui lòng cung cấp danh sách ID ghi chú để gộp");
			error.statusCode = 400;
			throw error;
		}

		// const batch = await batchService.generatePDF(userId, noteIds, title);

		const mockBatch = {
			id: "batch_1",
			title,
			pdfUrl: "https://cloud.com/file.pdf",
		};
		return sendSuccess(res, 201, "Tạo file PDF gộp thành công", mockBatch);
	} catch (error) {
		next(error);
	}
};

const getBatches = async (req, res, next) => {
	try {
		const userId = req.user.id;
		// const batches = await batchService.getUserBatches(userId);

		return sendSuccess(res, 200, "Lấy danh sách file PDF thành công", []);
	} catch (error) {
		next(error);
	}
};

module.exports = { createBatchPDF, getBatches };
