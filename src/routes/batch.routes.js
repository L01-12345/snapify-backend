// src/routes/batch.routes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const batchController = require("../controllers/batch.controller");
const upload = require("../middlewares/upload.middleware");

router.use(authMiddleware);

router.post("/", batchController.createBatchPDF);

router.get("/", batchController.getBatches);

router.post("/scan", upload.array("images", 20), batchController.scanToPDF);

router.get("/", batchController.getBatches);
router.put("/:id", batchController.updateBatch);
router.delete("/:id", batchController.deleteBatch);

module.exports = router;
