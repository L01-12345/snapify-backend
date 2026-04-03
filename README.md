# 📸 Snapify Backend

Snapify là ứng dụng thông minh giúp người dùng chuyển đổi hình ảnh thành ghi chú văn bản (Snap-to-Note), tự động phân loại, và trích xuất các hành động thông minh (Smart Actions) như gọi điện, gửi email, mở link từ hình ảnh. 

Đây là kho lưu trữ mã nguồn Backend của dự án, cung cấp các API RESTful phục vụ cho các ứng dụng Client (Mobile/Web).

---

## 🛠 Công nghệ sử dụng (Tech Stack)

Dự án được xây dựng trên nền tảng các công nghệ hiện đại và tối ưu cho hiệu suất:

* **Runtime Environment:** [Node.js](https://nodejs.org/) (v18+)
* **Web Framework:** [Express.js](https://expressjs.com/)
* **Database:** [PostgreSQL](https://www.postgresql.org/)
* **ORM:** [Prisma](https://www.prisma.io/)
* **API Documentation:** [Swagger UI](https://swagger.io/tools/swagger-ui/) (`swagger-jsdoc` & `swagger-ui-express`)
* **Containerization:** [Docker](https://www.docker.com/) & Docker Compose

---

## 📁 Cấu trúc thư mục (Project Structure)

Dự án áp dụng mô hình kiến trúc **3-Layer Architecture** (Routes -> Controllers -> Services) để đảm bảo tính dễ bảo trì và mở rộng:

```text
snapify-backend/
├── prisma/             # Định nghĩa Database Schema và Migrations
├── src/                # Source code chính
│   ├── ai/             # Tích hợp các AI Services (OCR, Text-to-Speech...)
│   ├── config/         # Cấu hình biến môi trường, Swagger...
│   ├── controllers/    # Tiếp nhận Request và trả về Response
│   ├── middlewares/    # Middleware xử lý Auth, Error, Upload...
│   ├── routes/         # Định nghĩa các Endpoints API
│   ├── services/       # Xử lý Business Logic và thao tác với Database
│   ├── utils/          # Các hàm tiện ích (Formatter, Logger...)
│   ├── app.js          # Khởi tạo Express app
│   └── server.js       # Entry point chạy server
├── Dockerfile          # Cấu hình build Docker Image
├── docker-compose.yml  # Cấu hình chạy Multi-container (App + Database)
└── package.json        # Quản lý thư viện và scripts
```

## ⚙️ Yêu cầu hệ thống (Prerequisites)
Trước khi cài đặt, đảm bảo máy tính của bạn đã cài đặt sẵn các công cụ sau:

- Node.js (Phiên bản 18.x trở lên)
- npm hoặc yarn
- Docker và Docker Compose (Nếu muốn chạy qua container)
- PostgreSQL (Nếu chạy database trực tiếp trên máy local)
