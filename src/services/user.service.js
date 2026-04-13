// src/services/user.service.js
const prisma = require("../utils/prisma.util");

const getUserById = async (userId) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			email: true,
			displayName: true,
			avatarUrl: true,
			bio: true,
			createdAt: true,
		},
	});

	if (!user) {
		const error = new Error("Không tìm thấy người dùng");
		error.statusCode = 404;
		throw error;
	}
	return user;
};

const updateUserProfile = async (userId, updateData) => {
	if (updateData.displayName) {
		updateData.displayName = updateData.displayName.trim();
	}
	if (updateData.bio) {
		updateData.bio = updateData.bio.trim();
	}

	const updatedUser = await prisma.user.update({
		where: { id: userId },
		data: updateData,
		select: {
			id: true,
			email: true,
			displayName: true,
			avatarUrl: true,
			bio: true,
			createdAt: true,
		},
	});
	return updatedUser;
};

module.exports = { getUserById, updateUserProfile };
