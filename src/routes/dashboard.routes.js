// src/routes/dashboard.routes.js
const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
const authMiddleware = require("../middlewares/auth.middleware");

router.get("/metrics", authMiddleware, dashboardController.getDashboardMetrics);
module.exports = router;
