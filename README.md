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

## 🚀 Hướng dẫn cài đặt và chạy dự án

Cách 1: Chạy bằng Docker (Khuyên dùng)

Clone dự án về máy:

```Bash
git clone <repository-url>
cd snapify-backend
Chạy Docker Compose:
```

```Bash
docker-compose up -d --build
Lệnh này sẽ tự động tải image PostgreSQL, build image cho Node.js app và khởi chạy cả hai trên cổng 3000 và 5432.
```

Cách 2: Chạy Local (Môi trường Development)
Cài đặt thư viện:

```Bash
npm install
Cấu hình biến môi trường:
```

Copy file mẫu .env.example thành file .env:

```Bash
cp .env.example .env
Mở file .env và cập nhật chuỗi kết nối Database DATABASE_URL theo cấu hình PostgreSQL trên máy của bạn.
```

Khởi tạo Database với Prisma:

Tạo các bảng trong database dựa trên schema:

```Bash
npx prisma db push
```
(Tùy chọn) Khởi tạo Prisma Client:
```
npx prisma generate
```
Khởi chạy Server:

Chạy chế độ Dev (tự động reload khi code thay đổi):

```Bash
npm run dev
```

Chạy chế độ Production:

```bash
npm start
```
Server sẽ khởi chạy tại: http://localhost:3000

## 📖 Tài liệu API (API Documentation)
Dự án tích hợp sẵn Swagger để giúp Frontend/Mobile team dễ dàng tra cứu và test thử API.

Sau khi server chạy thành công, hãy truy cập đường dẫn sau trên trình duyệt: http://localhost:3000/api-docs

## Các Scripts có sẵn (Available Scripts)

Trong quá trình phát triển, bạn có thể sử dụng các lệnh npm sau:

`npm run dev`: Chạy server bằng Nodemon (Hot-reload).

`npm start`: Chạy server bằng Node tiêu chuẩn.

`npm run prisma:generate`: Tạo lại Prisma Client sau khi thay đổi file schema.prisma.

`npm run prisma:push`: Áp dụng cấu trúc schema mới nhất xuống Database.

`npm run prisma:studio`: Mở giao diện web để xem và quản lý dữ liệu trực tiếp trong Database (http://localhost:5555).
