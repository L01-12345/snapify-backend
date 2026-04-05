// src/services/folder.service.js
const prisma = require("../utils/prisma.util");

const getUserFolders = async (userId) => {
	return await prisma.folder.findMany({
		where: { userId },
		orderBy: { createdAt: "desc" },
		include: {
			_count: {
				select: { notes: true }, // Đếm số lượng Note có trong Folder
			},
		},
	});
};

const createNewFolder = async (userId, folderData) => {
	return await prisma.folder.create({
		data: {
			userId,
			name: folderData.name,
			description: folderData.description,
			type: "MANUAL", // Mặc định do người dùng tạo là MANUAL
		},
	});
};

module.exports = { getUserFolders, createNewFolder };
