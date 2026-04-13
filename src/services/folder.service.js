// src/services/folder.service.js
const prisma = require("../utils/prisma.util");

// =========================================================
// 1. LẤY DANH SÁCH THƯ MỤC (Kèm số lượng Note)
// =========================================================
const getUserFolders = async (userId) => {
	return await prisma.folder.findMany({
		where: { userId },
		orderBy: { createdAt: "desc" },
		include: {
			_count: {
				select: { notes: true },
			},
		},
	});
};

// =========================================================
// 2. XEM CHI TIẾT 1 THƯ MỤC (Lấy kèm danh sách Notes) - TÍNH NĂNG MỚI
// =========================================================
const getFolderById = async (folderId, userId) => {
	// BẢO MẬT: Kiểm tra xem folder này có thuộc về user đang request không
	const folder = await prisma.folder.findFirst({
		where: {
			id: folderId,
			userId: userId,
		},
		include: {
			notes: {
				orderBy: { updatedAt: "desc" }, // Ghi chú mới sửa lên đầu
				include: {
					images: true, // Lấy kèm ảnh để Frontend làm Thumbnail
				},
			},
			batches: { orderBy: { createdAt: "desc" } },
		},
	});

	// EDGE CASE: Thư mục không tồn tại hoặc user đang xem trộm thư mục người khác
	if (!folder) {
		const error = new Error(
			"Không tìm thấy thư mục hoặc bạn không có quyền truy cập",
		);
		error.statusCode = 404;
		throw error;
	}

	return folder;
};

// =========================================================
// 3. TẠO THƯ MỤC MỚI
// =========================================================
const createNewFolder = async (userId, folderData) => {
	// EDGE CASE 1: Tên thư mục rỗng hoặc toàn dấu cách
	const folderName = folderData.name?.trim();
	if (!folderName) {
		const error = new Error("Tên thư mục không được để trống");
		error.statusCode = 400;
		throw error;
	}

	// EDGE CASE 2: Chống trùng lặp tên thư mục (Tránh user tạo 10 cái thư mục tên "Toán")
	const existingFolder = await prisma.folder.findFirst({
		where: {
			userId: userId,
			name: folderName,
		},
	});

	if (existingFolder) {
		const error = new Error(`Thư mục mang tên "${folderName}" đã tồn tại`);
		error.statusCode = 400;
		throw error;
	}

	return await prisma.folder.create({
		data: {
			userId,
			name: folderName,
			description: folderData.description?.trim() || null,
			type: "MANUAL",
		},
	});
};

// =========================================================
// 4. CẬP NHẬT THƯ MỤC (Đổi tên, đổi mô tả)
// =========================================================
const updateFolder = async (folderId, userId, updateData) => {
	// BẢO MẬT: Kiểm tra quyền sở hữu
	const folder = await prisma.folder.findFirst({
		where: { id: folderId, userId },
	});
	if (!folder) {
		const error = new Error("Không tìm thấy thư mục");
		error.statusCode = 404;
		throw error;
	}

	// EDGE CASE: Nếu user muốn đổi tên, phải kiểm tra tên mới có bị trùng với thư mục khác không
	// if (updateData.name) {
	// 	const newName = updateData.name.trim();
	// 	if (!newName) {
	// 		const error = new Error("Tên thư mục không được để trống");
	// 		error.statusCode = 400;
	// 		throw error;
	// 	}

	// 	const nameExists = await prisma.folder.findFirst({
	// 		where: {
	// 			userId,
	// 			name: newName,
	// 			id: { not: folderId }, // Loại trừ chính thư mục đang sửa ra
	// 		},
	// 	});

	// 	if (nameExists) {
	// 		const error = new Error(`Tên thư mục "${newName}" đã được sử dụng`);
	// 		error.statusCode = 400;
	// 		throw error;
	// 	}
	// 	updateData.name = newName;
	// }
	if (updateData.name !== undefined) {
		// Đảm bảo an toàn nếu vô tình truyền null
		const newName =
			typeof updateData.name === "string" ? updateData.name.trim() : "";

		if (!newName) {
			const error = new Error("Tên thư mục không được để trống");
			error.statusCode = 400;
			throw error;
		}

		const nameExists = await prisma.folder.findFirst({
			where: {
				userId,
				name: newName,
				id: { not: folderId }, // Loại trừ chính thư mục đang sửa ra
			},
		});

		if (nameExists) {
			const error = new Error(`Tên thư mục "${newName}" đã được sử dụng`);
			error.statusCode = 400;
			throw error;
		}
		updateData.name = newName;
	}

	return await prisma.folder.update({
		where: { id: folderId },
		data: {
			name: updateData.name,
			description: updateData.description,
		},
	});
};

// =========================================================
// 5. XÓA THƯ MỤC AN TOÀN
// =========================================================
const deleteFolder = async (folderId, userId) => {
	// BẢO MẬT: Kiểm tra quyền sở hữu
	const folder = await prisma.folder.findFirst({
		where: { id: folderId, userId },
	});
	if (!folder) {
		const error = new Error("Không tìm thấy thư mục");
		error.statusCode = 404;
		throw error;
	}

	// EDGE CASE QUAN TRỌNG: Xóa thư mục thì các Ghi chú bên trong sẽ ra sao?
	// GIẢI PHÁP AN TOÀN: Không xóa Ghi chú, chỉ đẩy chúng ra ngoài mục "Chưa phân loại" (folderId = null)
	await prisma.$transaction([
		// Bước 1: Gỡ thư mục ra khỏi tất cả các ghi chú đang nằm trong đó
		prisma.note.updateMany({
			where: { folderId: folderId },
			data: { folderId: null },
		}),
		// Bước 2: Xóa thư mục
		prisma.folder.delete({
			where: { id: folderId },
		}),
	]);

	return {
		message: "Đã xóa thư mục và di chuyển các ghi chú ra ngoài an toàn",
	};
};

module.exports = {
	getUserFolders,
	getFolderById,
	createNewFolder,
	updateFolder,
	deleteFolder,
};
