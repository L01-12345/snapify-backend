// src/routes/note.routes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");
const noteController = require("../controllers/note.controller");

router.use(authMiddleware);

router.post("/snap", upload.single("image"), noteController.snapToNote);

router.get("/search", noteController.searchNotes);

router.get("/", noteController.getNotes);

router.post("/", noteController.createNote);

router.get("/:id", noteController.getNoteById);

router.put("/:id", noteController.updateNote);

router.delete("/:id", noteController.deleteNote);

router.get("/:id/actions", noteController.getSmartActions);

router.post("/:id/categorize", noteController.autoCategorize);

module.exports = router;
