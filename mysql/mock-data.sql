-- 1. Xóa dữ liệu cũ (Tùy chọn: Xóa theo thứ tự ngược lại để không dính Foreign Key)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE search_histories;
TRUNCATE TABLE batch_items;
TRUNCATE TABLE batch_documents;
TRUNCATE TABLE smart_actions;
TRUNCATE TABLE extracted_entities;
TRUNCATE TABLE note_images;
TRUNCATE TABLE notes;
TRUNCATE TABLE folders;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- 2. Thêm dữ liệu bảng users (Mật khẩu được mock giả định đã mã hóa bằng bcrypt)
INSERT INTO users (user_id, display_name, email, password_hash, avatar_url, created_at, updated_at) VALUES
('user-1', 'Đặng Nhật Minh', 'minh.dang@example.com', '$2a$10$xyz...', 'https://ui-avatars.com/api/?name=Minh', NOW(), NOW()),
('user-2', 'Trần Thị Mai', 'mai.tran@example.com', '$2a$10$abc...', NULL, NOW(), NOW());

-- 3. Thêm dữ liệu bảng folders
INSERT INTO folders (folder_id, user_id, folder_name, type, description, created_at) VALUES
('folder-1', 'user-1', 'Hóa đơn tháng 10', 'MANUAL', 'Các hóa đơn đi siêu thị và cafe', NOW()),
('folder-2', 'user-1', 'Danh thiếp đối tác', 'SMART', 'Tự động lọc các ảnh có chứa số điện thoại', NOW());

-- 4. Thêm dữ liệu bảng notes
INSERT INTO notes (note_id, user_id, folder_id, title, content, status, created_at, updated_at) VALUES
('note-1', 'user-1', 'folder-1', 'Hóa đơn Highland Coffee', 'Tổng tiền: 55.000đ. Ngày: 01/10/2026', 'PENDING', NOW(), NOW()),
('note-2', 'user-1', 'folder-2', 'Card visit anh Hoàng', 'Hoàng CEO - 0901234567 - hoang@congty.com', 'ACTIONED', NOW(), NOW()),
('note-3', 'user-2', NULL, 'Ghi chú học tập', 'Công thức tính Delta: b^2 - 4ac', 'ARCHIVED', NOW(), NOW());

-- 5. Thêm dữ liệu bảng note_images
INSERT INTO note_images (image_id, note_id, image_url, order_index) VALUES
('img-1', 'note-1', 'https://storage.snapify.local/highland.jpg', 1),
('img-2', 'note-2', 'https://storage.snapify.local/card.jpg', 1),
('img-3', 'note-3', 'https://storage.snapify.local/math.jpg', 1);

-- 6. Thêm dữ liệu bảng extracted_entities (Các thông tin bóc tách được)
INSERT INTO extracted_entities (entity_id, note_id, type, value) VALUES
('ent-1', 'note-2', 'PHONE', '0901234567'),
('ent-2', 'note-2', 'EMAIL', 'hoang@congty.com');

-- 7. Thêm dữ liệu bảng smart_actions (Các thao tác nhanh)
INSERT INTO smart_actions (action_id, note_id, type, value, metadata) VALUES
('act-1', 'note-2', 'CALL', '0901234567', NULL),
('act-2', 'note-2', 'EMAIL', 'hoang@congty.com', '{"subject": "Chào anh Hoàng"}');

-- 8. Thêm dữ liệu bảng batch_documents (File PDF gộp)
INSERT INTO batch_documents (batch_id, user_id, title, pdf_url, created_at) VALUES
('batch-1', 'user-1', 'Báo cáo chi phí Tuần 1', 'https://storage.snapify.local/baocao-t1.pdf', NOW());

-- 9. Thêm dữ liệu bảng batch_items (Các trang trong file PDF)
INSERT INTO batch_items (item_id, batch_id, image_id, page_number) VALUES
('bitem-1', 'batch-1', 'img-1', 1),
('bitem-2', 'batch-1', 'img-2', 2);

-- 10. Thêm dữ liệu bảng search_histories
INSERT INTO search_histories (search_id, user_id, keyword, created_at) VALUES
('search-1', 'user-1', 'hóa đơn', NOW()),
('search-2', 'user-1', '0901', NOW());