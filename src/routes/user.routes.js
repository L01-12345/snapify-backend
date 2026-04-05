// src/routes/user.routes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const userController = require("../controllers/user.controller");

// Áp dụng middleware kiểm tra đăng nhập cho toàn bộ file này
router.use(authMiddleware);

router.get("/profile", userController.getProfile);

router.put("/profile", userController.updateProfile);

module.exports = router;
