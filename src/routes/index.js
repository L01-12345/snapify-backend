// src/routes/index.js
const express = require("express");
const router = express.Router();

// Import các nhánh routes
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const noteRoutes = require("./note.routes");
const folderRoutes = require("./folder.routes");
const batchRoutes = require("./batch.routes");
const dashboardRoutes = require("./dashboard.routes");

// Gắn tiền tố (prefix) cho từng nhóm API
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/notes", noteRoutes);
router.use("/folders", folderRoutes);
router.use("/batches", batchRoutes);
router.use("/dashboard", dashboardRoutes);

// Endpoint kiểm tra API hoạt động từ Router
router.get("/ping", (req, res) => {
	res.status(200).json({ message: "Router is active" });
});

module.exports = router;
