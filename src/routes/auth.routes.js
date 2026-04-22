// src/routes/auth.routes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

const validate = require("../middlewares/validate.middleware");
const authValidation = require("../validations/auth.validation");

router.post(
	"/register",
	validate(authValidation.register),
	authController.register,
);

router.post("/login", validate(authValidation.login), authController.login);

router.post(
	"/forgot-password",
	validate(authValidation.forgotPassword),
	authController.forgotPassword,
);

router.post(
	"/reset-password",
	validate(authValidation.resetPassword),
	authController.resetPassword,
);

module.exports = router;
