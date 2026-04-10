// src/controllers/folder.controller.js
const { sendSuccess } = require("../utils/response.util");
const folderService = require("../services/folder.service");

const getFolders = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const folders = await folderService.getUserFolders(userId);

		return sendSuccess(res, 200, "Lấy danh sách thư mục thành công", folders);
	} catch (error) {
		next(error);
	}
};

const getFolderById = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id } = req.params; // ID của thư mục lấy từ URL

		const folder = await folderService.getFolderById(id, userId);

		return sendSuccess(res, 200, "Lấy chi tiết thư mục thành công", folder);
	} catch (error) {
		next(error);
	}
};

const createFolder = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { name, description } = req.body;

		const newFolder = await folderService.createNewFolder(userId, {
			name,
			description,
		});

		return sendSuccess(res, 201, "Tạo thư mục mới thành công", newFolder);
	} catch (error) {
		next(error);
	}
};

const updateFolder = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;
		const { name, description } = req.body;

		const updatedFolder = await folderService.updateFolder(id, userId, {
			name,
			description,
		});

		return sendSuccess(res, 200, "Cập nhật thư mục thành công", updatedFolder);
	} catch (error) {
		next(error);
	}
};

const deleteFolder = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;

		const result = await folderService.deleteFolder(id, userId);

		return sendSuccess(res, 200, result.message);
	} catch (error) {
		next(error);
	}
};

module.exports = {
	getFolders,
	getFolderById,
	createFolder,
	updateFolder,
	deleteFolder,
};
