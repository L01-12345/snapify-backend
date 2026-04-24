const request = require("supertest");
const app = require("../../src/app");
const prisma = require("../../src/utils/prisma.util");
const jwt = require("jsonwebtoken");
const cloudflareService = require("../../src/services/cloudflare.service");

jest.mock("../../src/services/cloudflare.service");

describe("Integration Test: User API Endpoints", () => {
	let testUserId;
	let validToken;
	const testEmail = "avatar_user_test@snapify.com";
	let initialDisplayName = "Avatar Integration Tester";
	let initialBio = "Initial bio";

	beforeAll(async () => {
		jest.spyOn(console, "error").mockImplementation(() => {});
		await prisma.user.deleteMany({ where: { email: testEmail } });

		const testUser = await prisma.user.create({
			data: {
				email: testEmail,
				displayName: initialDisplayName,
				passwordHash: "hashed_password_demo",
				bio: initialBio,
				avatarUrl: "https://initial-avatar.com/old.jpg",
			},
		});
		testUserId = testUser.id;

		const secretKey = process.env.JWT_SECRET || "snapify_secret_key_development";
		validToken = jwt.sign(
			{ id: testUserId, email: testUser.email },
			secretKey,
			{ expiresIn: "1h" }
		);
	});

	afterAll(async () => {
		await prisma.user.deleteMany({ where: { email: testEmail } });
		await prisma.$disconnect();
	});

	beforeEach(() => {
		cloudflareService.uploadFileToR2.mockReset();
	});

	// ==========================================
	// KỊCH BẢN 1: BẢO MẬT
	// ==========================================
	describe("Bảo mật Middleware", () => {
		test("Nên chặn (401) nếu không gửi Token", async () => {
			const response = await request(app).post("/api/users/avatar");
			expect(response.status).toBe(401);
		});
	});

	// ==========================================
	// KỊCH BẢN 2: GET PROFILE
	// ==========================================
	describe("GET /api/users/me", () => {
		test("Nên trả về thông tin user (200) với đầy đủ fields, không có passwordHash", async () => {
			const response = await request(app)
				.get("/api/users/me")
				.set("Authorization", `Bearer ${validToken}`);

			expect(response.status).toBe(200);
			expect(response.body.message).toBe("Lấy thông tin hồ sơ thành công");
			const user = response.body.data;
			expect(user).toHaveProperty("id");
			expect(user).toHaveProperty("email", testEmail);
			expect(user).toHaveProperty("displayName", initialDisplayName);
			expect(user).toHaveProperty("avatarUrl", "https://initial-avatar.com/old.jpg");
			expect(user).toHaveProperty("bio", initialBio);
			expect(user).toHaveProperty("createdAt");
			expect(user).not.toHaveProperty("passwordHash");
		});
	});

	// ==========================================
	// KỊCH BẢN 3: UPLOAD AVATAR
	// ==========================================
	describe("POST /api/users/avatar", () => {
		test("Nên trả về 400 nếu không có file trong request", async () => {
			const response = await request(app)
				.post("/api/users/avatar")
				.set("Authorization", `Bearer ${validToken}`);

			expect(response.status).toBe(400);
			expect(response.body.message).toBe("Vui lòng upload một hình ảnh");
		});

		test("Nên upload thành công với ảnh JPEG hợp lệ (<2MB)", async () => {
			const smallImage = Buffer.from("fake image content".repeat(100));
			cloudflareService.uploadFileToR2.mockResolvedValue("https://fake-cloudflare/avatar.jpg");

			const response = await request(app)
				.post("/api/users/avatar")
				.set("Authorization", `Bearer ${validToken}`)
				.attach("image", smallImage, {
					filename: "test_avatar.jpg",
					contentType: "image/jpeg",
				});

			expect(response.status).toBe(200);
			expect(response.body.message).toBe("Cập nhật ảnh đại diện thành công");
			expect(response.body.data.avatarUrl).toBe("https://fake-cloudflare/avatar.jpg");
			expect(cloudflareService.uploadFileToR2).toHaveBeenCalledTimes(1);
			expect(cloudflareService.uploadFileToR2).toHaveBeenCalledWith(
				expect.objectContaining({
					mimetype: "image/jpeg",
					originalname: "test_avatar.jpg",
					buffer: expect.any(Buffer),
				}),
				"avatars"
			);
			const updatedUser = await prisma.user.findUnique({ where: { id: testUserId } });
			expect(updatedUser.avatarUrl).toBe("https://fake-cloudflare/avatar.jpg");
		});

		test("Nên từ chối file không phải ảnh (MIME type không hợp lệ)", async () => {
			const txtBuffer = Buffer.from("fake text file content");
			const response = await request(app)
				.post("/api/users/avatar")
				.set("Authorization", `Bearer ${validToken}`)
				.attach("image", txtBuffer, {
					filename: "test.txt",
					contentType: "text/plain",
				});

			expect(response.status).toBe(400);
			expect(response.body.message).toContain("Định dạng file không hợp lệ");
			expect(cloudflareService.uploadFileToR2).not.toHaveBeenCalled();
		});

		test("Nên từ chối file quá lớn (>2MB)", async () => {
			const largeBuffer = Buffer.alloc(2 * 1024 * 1024 + 1);
			const response = await request(app)
				.post("/api/users/avatar")
				.set("Authorization", `Bearer ${validToken}`)
				.attach("image", largeBuffer, {
					filename: "large.jpg",
					contentType: "image/jpeg",
				});

			expect(response.status).toBe(400);
			expect(response.body.message).toContain("Kích thước file quá lớn");
			expect(cloudflareService.uploadFileToR2).not.toHaveBeenCalled();
		});

		test("Nên chấp nhận ảnh PNG", async () => {
			const pngBuffer = Buffer.from("fake png content".repeat(100));
			cloudflareService.uploadFileToR2.mockResolvedValue("https://fake-cloudflare/avatar.png");

			const response = await request(app)
				.post("/api/users/avatar")
				.set("Authorization", `Bearer ${validToken}`)
				.attach("image", pngBuffer, {
					filename: "test_avatar.png",
					contentType: "image/png",
				});

			expect(response.status).toBe(200);
			expect(cloudflareService.uploadFileToR2).toHaveBeenCalledWith(
				expect.objectContaining({
					mimetype: "image/png",
					originalname: "test_avatar.png",
				}),
				"avatars"
			);
		});

		test("Nên chấp nhận ảnh JPG (cũ)", async () => {
			const jpgBuffer = Buffer.from("fake jpg".repeat(100));
			cloudflareService.uploadFileToR2.mockResolvedValue("https://fake-cloudflare/avatar.jpg");

			const response = await request(app)
				.post("/api/users/avatar")
				.set("Authorization", `Bearer ${validToken}`)
				.attach("image", jpgBuffer, {
					filename: "test_avatar.jpg",
					contentType: "image/jpg",
				});

			expect(response.status).toBe(200);
			expect(cloudflareService.uploadFileToR2).toHaveBeenCalledWith(
				expect.objectContaining({
					mimetype: "image/jpg",
				}),
				"avatars"
			);
		});
	});

	// ==========================================
	// KỊCH BẢN 4: UPDATE PROFILE
	// ==========================================
	describe("PUT /api/users/me", () => {
		beforeEach(async () => {
			await prisma.user.update({
				where: { id: testUserId },
				data: {
					displayName: initialDisplayName,
					bio: initialBio,
					avatarUrl: "https://initial-avatar.com/old.jpg",
				},
			});
		});

		test("Nên cập nhật displayName và bio thành công", async () => {
			const response = await request(app)
				.put("/api/users/me")
				.set("Authorization", `Bearer ${validToken}`)
				.send({ displayName: "Updated Display Name", bio: "Updated bio content" });

			expect(response.status).toBe(200);
			expect(response.body.message).toBe("Cập nhật hồ sơ thành công");
			expect(response.body.data.displayName).toBe("Updated Display Name");
			expect(response.body.data.bio).toBe("Updated bio content");

			const updatedUser = await prisma.user.findUnique({ where: { id: testUserId } });
			expect(updatedUser.displayName).toBe("Updated Display Name");
			expect(updatedUser.bio).toBe("Updated bio content");
		});

		test("Nên cập nhật chỉ displayName", async () => {
			const response = await request(app)
				.put("/api/users/me")
				.set("Authorization", `Bearer ${validToken}`)
				.send({ displayName: "Only Name Updated" });

			expect(response.status).toBe(200);
			expect(response.body.data.displayName).toBe("Only Name Updated");
			expect(response.body.data.bio).toBe(initialBio);
		});

		test("Nên cập nhật chỉ bio", async () => {
			const response = await request(app)
				.put("/api/users/me")
				.set("Authorization", `Bearer ${validToken}`)
				.send({ bio: "Only bio updated" });

			expect(response.status).toBe(200);
			expect(response.body.data.bio).toBe("Only bio updated");
		});

		test("Nên chặn (400) nếu displayName là chuỗi rỗng sau trim", async () => {
			const response = await request(app)
				.put("/api/users/me")
				.set("Authorization", `Bearer ${validToken}`)
				.send({ displayName: "   " });

			expect(response.status).toBe(400);
			expect(response.body.message).toBe("Tên hiển thị không được để trống");
		});

		test("Nên chặn (400) nếu displayName quá dài (>50 ký tự)", async () => {
			const longName = "a".repeat(51);
			const response = await request(app)
				.put("/api/users/me")
				.set("Authorization", `Bearer ${validToken}`)
				.send({ displayName: longName });

			expect(response.status).toBe(400);
			expect(response.body.message).toContain("không được vượt quá 50 ký tự");
		});

		test("Nên chặn (400) nếu displayName không phải chuỗi", async () => {
			const response = await request(app)
				.put("/api/users/me")
				.set("Authorization", `Bearer ${validToken}`)
				.send({ displayName: 12345 });

			expect(response.status).toBe(400);
			expect(response.body.message).toBe("Tên hiển thị phải là chuỗi");
		});

		test("Nên chặn (400) nếu bio vượt quá 500 ký tự", async () => {
			const longBio = "b".repeat(501);
			const response = await request(app)
				.put("/api/users/me")
				.set("Authorization", `Bearer ${validToken}`)
				.send({ bio: longBio });

			expect(response.status).toBe(400);
			expect(response.body.message).toContain("không được vượt quá 500 ký tự");
		});

		test("Nên chặn (400) nếu bio không phải chuỗi", async () => {
			const response = await request(app)
				.put("/api/users/me")
				.set("Authorization", `Bearer ${validToken}`)
				.send({ bio: 12345 });

			expect(response.status).toBe(400);
			expect(response.body.message).toBe("Giới thiệu phải là chuỗi");
		});

		test("Nên cho phép cập nhật avatarUrl", async () => {
			const response = await request(app)
				.put("/api/users/me")
				.set("Authorization", `Bearer ${validToken}`)
				.send({ avatarUrl: "https://new-avatar.com/new.jpg" });

			expect(response.status).toBe(200);
			expect(response.body.data.avatarUrl).toBe("https://new-avatar.com/new.jpg");

			const updatedUser = await prisma.user.findUnique({ where: { id: testUserId } });
			expect(updatedUser.avatarUrl).toBe("https://new-avatar.com/new.jpg");
		});
	});
});
