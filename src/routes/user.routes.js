// src/routes/user.routes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const uploadAvatar = require("../middlewares/avatar.middleware");
const userController = require("../controllers/user.controller");

// Áp dụng middleware kiểm tra đăng nhập cho toàn bộ file này
router.use(authMiddleware);

router.get("/me", userController.getProfile);

router.put("/me", userController.updateProfile);

router.post(
	"/avatar",
	uploadAvatar.single("image"),
	userController.uploadAvatar,
);

module.exports = router;
