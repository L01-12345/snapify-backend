// src/routes/batch.routes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const batchController = require("../controllers/batch.controller");

router.use(authMiddleware);

router.post("/", batchController.createBatchPDF);

router.get("/", batchController.getBatches);

module.exports = router;
