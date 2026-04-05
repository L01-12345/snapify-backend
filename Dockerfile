# Sử dụng Node.js phiên bản 18 (nhẹ gọn)
FROM node:22-alpine

# Tạo thư mục làm việc trong container
WORKDIR /app

# Copy package.json và cài đặt thư viện
COPY package*.json ./
RUN npm install

# Copy toàn bộ mã nguồn vào container
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Mở cổng 3000
EXPOSE 3000

# Lệnh chạy ứng dụng khi container khởi động
CMD ["npm", "run", "dev"]