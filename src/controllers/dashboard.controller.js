// src/controllers/dashboard.controller.js
const dashboardService = require("../services/dashboard.service");
const { sendSuccess } = require("../utils/response.util");

const getDashboardMetrics = async (req, res) => {
	try {
		const userId = req.user.id;

		// Gọi Service xử lý
		const metrics = await dashboardService.getUserMetrics(userId);

		return sendSuccess(res, 200, "Tổng quan Dashboard", metrics);
	} catch (error) {
		next(error);
	}
};

module.exports = { getDashboardMetrics };
