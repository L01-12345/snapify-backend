// src/routes/folder.routes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const folderController = require("../controllers/folder.controller");

router.use(authMiddleware);

router.get("/", folderController.getFolders);

router.post("/", folderController.createFolder);

module.exports = router;
