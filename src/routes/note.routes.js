// src/routes/note.routes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");
const noteController = require("../controllers/note.controller");

const validate = require("../middlewares/validate.middleware");
const noteValidation = require("../validations/note.validation");

router.use(authMiddleware);

router.post("/snap", upload.single("image"), noteController.snapToNote);

router.get(
	"/search",
	validate(noteValidation.searchNotes, "query"),
	noteController.searchNotes,
);

router.get("/", noteController.getNotes);

router.post("/", upload.single("image"), noteController.createNote);

router.get("/:id", noteController.getNoteById);

router.put(
	"/:id",
	validate(noteValidation.updateNote),
	noteController.updateNote,
);

router.delete("/:id", noteController.deleteNote);

router.get("/:id/actions", noteController.getSmartActions);

router.post("/:id/categorize", noteController.autoCategorize);

module.exports = router;
