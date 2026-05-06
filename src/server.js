// src/server.js
const app = require("./app");
const { PrismaClient } = require("@prisma/client");

// Khởi tạo Prisma Client để tương tác với Database
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

async function startServer() {
	try {
		// 1. Kiểm tra kết nối với MySQL trước khi chạy App
		await prisma.$connect();
		console.log("Connected to MySQL Database successfully.");

		// 2. Chạy server Express
		app.listen(PORT, "0.0.0.0", () => {
			console.log(`Snapify Server is running on port ${PORT}`);
			console.log(`Swagger Docs: http://localhost:${PORT}/api-docs`);
		});
	} catch (error) {
		console.error("Failed to connect to the database:", error);
		// Tắt tiến trình nếu không kết nối được database
		process.exit(1);
	}
}

// Xử lý đóng kết nối Prisma khi ứng dụng bị tắt (Ctrl+C hoặc Docker stop)
process.on("SIGINT", async () => {
	await prisma.$disconnect();
	console.log("Disconnected from Database.");
	process.exit(0);
});

startServer();
