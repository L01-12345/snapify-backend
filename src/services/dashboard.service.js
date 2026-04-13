const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getUserMetrics = async (userId) => {
	// Logic đếm số lượng do Service đảm nhận
	const statusCounts = await prisma.note.groupBy({
		by: ["status"],
		where: { userId },
		_count: {
			status: true,
		},
	});

	const metrics = { total: 0, pending: 0, actioned: 0, archived: 0 };

	statusCounts.forEach((item) => {
		metrics.total += item._count.status;
		if (item.status === "PENDING") metrics.pending = item._count.status;
		if (item.status === "ACTIONED") metrics.actioned = item._count.status;
		if (item.status === "ARCHIVED") metrics.archived = item._count.status;
	});

	return metrics;
};

module.exports = { getUserMetrics };
