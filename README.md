# Snapify Backend

Snapify là ứng dụng thông minh giúp người dùng chuyển đổi hình ảnh thành ghi chú
văn bản (Snap-to-Note), tự động phân loại, và trích xuất các hành động thông
minh (Smart Actions) như gọi điện, gửi email, mở link từ hình ảnh.

Đây là kho lưu trữ mã nguồn Backend của dự án, cung cấp các API RESTful phục vụ
cho các ứng dụng Client (Mobile/Web).

---

## Công nghệ sử dụng (Tech Stack)

Dự án được xây dựng trên nền tảng các công nghệ hiện đại và tối ưu cho hiệu
suất:

- **Runtime Environment:** [Node.js](https://nodejs.org/) (v18+)
- **Web Framework:** [Express.js](https://expressjs.com/)
- **Database:** [PostgreSQL](https://www.postgresql.org/)
- **ORM:** [Prisma](https://www.prisma.io/)
- **API Documentation:** [Swagger UI](https://swagger.io/tools/swagger-ui/)
  (`swagger-jsdoc` & `swagger-ui-express`)
- **Containerization:** [Docker](https://www.docker.com/) & Docker Compose

---

## Cấu trúc thư mục (Project Structure)

Dự án áp dụng mô hình kiến trúc **3-Layer Architecture** (Routes -> Controllers
-> Services) để đảm bảo tính dễ bảo trì và mở rộng:

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

## Yêu cầu hệ thống (Prerequisites)

Trước khi cài đặt, đảm bảo máy tính của bạn đã cài đặt sẵn các công cụ sau:

- Node.js (Phiên bản 18.x trở lên)
- npm hoặc yarn
- Docker và Docker Compose (Nếu muốn chạy qua container)
- PostgreSQL (Nếu chạy database trực tiếp trên máy local)

## Hướng dẫn cài đặt và chạy dự án

Bước 1: Chuẩn bị môi trường (Prerequisites)

1. Đảm bảo máy tính đã cài đặt Docker và Docker Compose (Mở Docker Desktop lên
   để nó chạy ngầm).

2. Clone source code dự án về máy.

3. Tại thư mục gốc của dự án, tạo một file tên là .env và điền đầy đủ các thông
   số sau (hỏi team leader hoặc tự điền thông tin của bạn vào):

```bash
# 1. Cấu hình Server & Database
PORT=3000
# DATABASE_URL="mysql://root:snapify_password@snapify_db:3306/snapify?charset=utf8mb4"
DATABASE_URL="postgresql://postgres:snapify_password@snapify_db:5432/snapify_db?schema=public"

# 2. Cấu hình Bảo mật JWT
JWT_SECRET="Dien_Mot_Chuoi_Bi_Mat_Bat_Ky_Vao_Day"
JWT_EXPIRES_IN="7d"

# 3. Cấu hình Cloudflare R2 (Lưu trữ ảnh & PDF)
R2_ACCOUNT_ID="your_account_id_here"
R2_ACCESS_KEY_ID="your_access_key_here"
R2_SECRET_ACCESS_KEY="your_secret_key_here"
R2_BUCKET_NAME="snapify-bucket"
R2_PUBLIC_URL="https://pub-xxxx.r2.dev"

# 4. Cấu hình Google Gemini AI (Multimodal)
GEMINI_API_KEY="your_gemini_api_key_here"
```

Bước 2: Build và Khởi động các Containers

Mở terminal tại thư mục gốc của dự án (nơi chứa file docker-compose.yml) và chạy
lệnh sau:

```Bash
docker-compose up --build
```

Ghi chú:

--build: Ép Docker build lại image Node.js mới nhất chứa code của bạn.

Bước 3: Khởi tạo Database (Prisma)

Khi MySQL hoặc PostgresSQL container đã chạy lên, bạn cần đẩy cấu trúc bảng
(Schema) vào Database. Chạy lệnh sau để ép Prisma tạo bảng chuẩn xác:

```Bash
docker exec -it snapify_api npx prisma db push
```

(Nếu nó hỏi có muốn xóa dữ liệu cũ để đồng bộ schema mới không, cứ gõ y và
Enter).

Bước 4: Nạp dữ liệu mẫu (Seed Data)

Để có sẵn User, Folder, Notes và PDF test trên app, chúng ta sẽ nạp file SQL
mẫu. Lưu ý copy y hệt lệnh này để đảm bảo tiếng Việt (UTF-8) không bị lỗi font:

Nếu là MySQL:

```Bash
docker exec -i snapify_db mysql -u root -proot --default-character-set=utf8mb4 snapify < mysql/mock-data.sql
```

Nếu là PostgresSQL:

```bash
docker exec -i snapify_db psql -U postgres -d snapify_db < postgresql/seed.sql
```

Bước 5: Kiểm tra

Kiểm tra Log (Nếu chạy lệnh ngầm `-d`, còn không thì bỏ qua): Để xem server
Node.js có báo lỗi gì không, chạy lệnh:

```Bash
docker logs snapify_api -f
```

Kiểm tra thông qua Prisma Studio:

```bash
docker exec -it snapify_api npx prisma studio
```

Nếu thấy dòng `🚀 Server running on port 3000`, bạn đã thành công! Bấm Ctrl + C
để thoát log.

Mở API Tài liệu (Swagger UI): Mở trình duyệt và truy cập:
http://localhost:3000/api-docs

## Kiểm thử và Đảm bảo chất lượng (Testing & QA)

Dự án áp dụng phương pháp phát triển hướng kiểm thử (TDD) với độ phủ mã nguồn
(Test Coverage) đạt tiêu chuẩn > 85%. Hệ thống sử dụng **Jest** làm Test Runner
và **Supertest** để kiểm thử các API Endpoints.

### 1. Cấu trúc thư mục kiểm thử

Các kịch bản kiểm thử được chia làm 2 tầng rõ rệt:

- `test/services/`: Chứa các bài Unit Test với dữ liệu Mock. Cô lập hoàn toàn
  với các dịch vụ bên thứ 3 (Gemini AI, Cloudflare R2) để kiểm tra logic thuật
  toán.
- `test/integrations/`: Chứa các bài Integration Test đi qua toàn bộ luồng dữ
  liệu thật (Router ➔ Controller ➔ Service ➔ Database PostgreSQL).

### 2. Chuẩn bị môi trường Test

Trước khi chạy test cục bộ (Local), hãy đảm bảo đã cấu hình chuỗi kết nối
Database cho môi trường test trong file `.env.test`:

```env
# URL kết nối đến Database phụ dành riêng cho Test
DATABASE_URL="postgresql://postgres:snapify_password@snapify_test_db:5432/snapify_db_test?schema=public"

# Token Secret dùng riêng cho lúc test
JWT_SECRET="your_secrret_key"

# Cấu hình môi trường
NODE_ENV="test"
PORT=3001 # Đổi cổng để không bị đụng với server đang chạy thật ở cổng 3000
```

3. Các lệnh chạy Test Chạy toàn bộ Test Suite (Khuyên dùng) Để tránh lỗi xung
   đột dữ liệu (Database Race Conditions) khi các file test thao tác song song
   trên cùng một cơ sở dữ liệu (đặc biệt là các lệnh deleteMany), dự án đã cấu
   hình chạy test tuần tự:

```Bash
docker exec -it snapify_api npm run test
```

Chạy riêng một file Test cụ thể Khi bạn chỉ muốn tập trung debug một module (VD:
Auth API):

```Bash
docker exec -it snapify_api npx jest test/integrations/auth.api.test.js
```

Xem báo cáo độ phủ mã nguồn (Coverage Report) Kiểm tra xem các
Controller/Service đã được test bao phủ bao nhiêu % số dòng code:

```Bash
docker exec -it snapify_api npm run test:coverage
# Hoặc lệnh gốc: npx jest --coverage --runInBand
```

### Các script mới để quản lý Database

Lưu ý: Các câu lệnh bên dưới đều phải chạy với tiền tố:
`docker exec -it snapify_api ...`

Khi thay đổi cấu trúc Database (file `schema.prisma`), chạy lệnh sau:

```bash
npm run db:migrate:dev
```

Khi pull code mới, chạy lệnh sau:

```bash
npm run db:pull
```

Khi muốn reset database, chạy lệnh sau:

```bash
npm run db:reset
```

Khi chạy lệnh trên, nó sẽ xóa toàn bộ data đã tạo trước đó trong Database, do đó
hãy chạy lại `seed.sql` để nạp dữ liệu test (Phần hướng dẫn nằm ở mục trên).

Khi muốn cập nhật Prisma Client thủ công, chạy lệnh sau:

```bash
npm run db:generate
```
