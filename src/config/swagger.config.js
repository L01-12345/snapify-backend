// src/config/swagger.config.js
const swaggerUi = require("swagger-ui-express");
const YAML = require("yaml");
const path = require("path");
const fs = require("fs");

// Trỏ đường dẫn tuyệt đối đến file openapi.yaml
const swaggerDocumentPath = path.join(__dirname, "../../docs/openapi.yaml");

// Đọc file dưới dạng chuỗi (string)
const file = fs.readFileSync(swaggerDocumentPath, "utf8");

// Parse file YAML thành Object
const swaggerDocument = YAML.parse(file);

const setupSwagger = (app) => {
	// Mount Swagger UI
	app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
	console.log("📄 Swagger docs available at http://localhost:3000/api-docs");
};

module.exports = setupSwagger;
