// src/routes/folder.routes.js
const express = require("express");
const router = express.Router();
const folderController = require("../controllers/folder.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const validate = require("../middlewares/validate.middleware");
const folderValidation = require("../validations/folder.validation");

// Áp dụng middleware xác thực token cho TOÀN BỘ các route của thư mục
router.use(authMiddleware);

// Các routes
router.get("/", folderController.getFolders); // Lấy tất cả thư mục
router.post(
	"/",
	validate(folderValidation.createFolder),
	folderController.createFolder,
); // Tạo thư mục mới
router.get("/:id", folderController.getFolderById); // Xem chi tiết 1 thư mục (Kèm danh sách Notes)
router.put(
	"/:id",
	validate(folderValidation.updateFolder),
	folderController.updateFolder,
); // Sửa tên/mô tả thư mục
router.delete("/:id", folderController.deleteFolder); // Xóa thư mục

module.exports = router;
