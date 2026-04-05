// src/routes/auth.routes.js
const express = require("express");
const router = express.Router();

// Tạm thời mock Controller (Bạn sẽ viết chi tiết trong thư mục controllers sau)
const authController = require("../controllers/auth.controller");

router.post("/register", authController.register);

router.post("/login", authController.login);

router.post("/forgot-password", authController.forgotPassword);

module.exports = router;
