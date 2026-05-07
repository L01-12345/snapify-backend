const express = require("express");
const request = require("supertest");
const errorHandler = require("../../src/middlewares/error.middleware");

const createApp = (uploadMiddleware) => {
	const app = express();
	app.post("/upload", uploadMiddleware, (req, res) => {
		res.status(200).json({ success: true });
	});
	app.use(errorHandler);
	return app;
};

describe("Upload Middleware", () => {
	const originalNodeEnv = process.env.NODE_ENV;

	afterEach(() => {
		jest.resetModules();
		process.env.NODE_ENV = originalNodeEnv;
	});

	test("should accept a valid JPEG file in non-test environment", async () => {
		process.env.NODE_ENV = "development";
		const uploadMiddleware = require("../../src/middlewares/upload.middleware");
		const app = createApp(uploadMiddleware.uploadImage);

		// Sử dụng buffer ảnh JPEG thực nhỏ (1x1 pixel)
		const jpegBase64 =
			"/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/AB//2Q==";
		const jpegBuffer = Buffer.from(jpegBase64, "base64");

		const response = await request(app)
			.post("/upload")
			.attach("image", jpegBuffer, {
				filename: "test.jpg",
				contentType: "image/jpeg",
			});

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ success: true });
	});

	test("should reject a file with invalid image signature in non-test environment", async () => {
		process.env.NODE_ENV = "development";
		const uploadMiddleware = require("../../src/middlewares/upload.middleware");
		const app = createApp(uploadMiddleware.uploadImage);

		const fakeBuffer = Buffer.from("not-an-image");

		const response = await request(app)
			.post("/upload")
			.attach("image", fakeBuffer, {
				filename: "test.jpg",
				contentType: "image/jpeg",
			});

		expect(response.status).toBe(400);
		expect(response.body.message).toContain("Nội dung file không hợp lệ");
	});

	test("should reject disallowed file extension even in test environment", async () => {
		process.env.NODE_ENV = "test";
		const uploadMiddleware = require("../../src/middlewares/upload.middleware");
		const app = createApp(uploadMiddleware.uploadImage);

		const fakeBuffer = Buffer.from("fake-image-data");

		const response = await request(app)
			.post("/upload")
			.attach("image", fakeBuffer, {
				filename: "test.txt",
				contentType: "image/jpeg",
			});

		expect(response.status).toBe(400);
		expect(response.body.message).toContain("Định dạng file không hợp lệ");
	});

	test("should accept fake image data in test environment when extension and mimetype are valid", async () => {
		process.env.NODE_ENV = "test";
		const uploadMiddleware = require("../../src/middlewares/upload.middleware");
		const app = createApp(uploadMiddleware.uploadImage);

		const fakeBuffer = Buffer.from("fake-image-content");

		const response = await request(app)
			.post("/upload")
			.attach("image", fakeBuffer, {
				filename: "test.jpg",
				contentType: "image/jpeg",
			});

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ success: true });
	});

	test("should accept multiple files with upload.array in test environment", async () => {
		process.env.NODE_ENV = "test";
		const uploadMiddleware = require("../../src/middlewares/upload.middleware");
		const app = express();
		app.post("/uploads", uploadMiddleware.array("images", 20), (req, res) => {
			res.status(200).json({ count: req.files.length });
		});
		app.use(errorHandler);

		const image1 = Buffer.from("fake-image-1");
		const image2 = Buffer.from("fake-image-2");

		const response = await request(app)
			.post("/uploads")
			.attach("images", image1, {
				filename: "test1.jpg",
				contentType: "image/jpeg",
			})
			.attach("images", image2, {
				filename: "test2.jpg",
				contentType: "image/jpeg",
			});

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ count: 2 });
	});
});
