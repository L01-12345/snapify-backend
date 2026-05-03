// Hàm chuyển đổi Tiếng Việt có dấu thành không dấu
const removeVietnameseTones = (str) => {
	if (!str) return "";
	return str
		.normalize("NFD") // Phân tách chữ cái và dấu (VD: 'á' -> 'a' + '́')
		.replace(/[\u0300-\u036f]/g, "") // Xóa tất cả các dấu đi
		.replace(/đ/g, "d")
		.replace(/Đ/g, "D"); // Xử lý riêng chữ đ/Đ
};
module.exports = removeVietnameseTones;
