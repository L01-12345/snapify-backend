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

module.exports = { getFolders, createFolder };
