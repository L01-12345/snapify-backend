// src/app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const setupSwagger = require("./config/swagger.config");
const errorHandler = require("./middlewares/error.middleware");

const app = express();

// 1. Cài đặt Middlewares
app.use(cors()); // Cho phép các domain khác (Frontend/Mobile) gọi API
app.use(express.json()); // Phân tích các request có body định dạng JSON
app.use(express.urlencoded({ extended: true })); // Phân tích data từ form (x-www-form-urlencoded)

// 2. Khởi tạo Swagger UI API Documentation
setupSwagger(app);

// 3. Health Check API (Kiểm tra server có đang sống không)
app.get("/health", (req, res) => {
	res.status(200).json({
		status: "success",
		message: "Snapify API is up and running!",
	});
});

// 4. Khai báo các Routes chính (Tạm thời comment lại, mở ra khi bạn làm các tính năng này)
const routes = require("./routes");
app.use("/api", routes);

// 5. Global Error Handler (Bắt toàn bộ lỗi của hệ thống trả về cho Client)
app.use(errorHandler);
app.use((err, req, res, next) => {
	console.error("[Error]:", err.message);

	const statusCode = err.statusCode || 500;
	res.status(statusCode).json({
		status: "error",
		message: err.message || "Internal Server Error",
		...(process.env.NODE_ENV === "development" && { stack: err.stack }),
	});
});

module.exports = app;
