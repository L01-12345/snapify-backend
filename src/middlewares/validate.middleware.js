const Joi = require("joi");
// Thêm tham số property, mặc định là 'body'
const validate = (schema, property = "body") => {
	return (req, res, next) => {
		const validSchema = Joi.compile(schema);

		// Đọc dữ liệu từ đúng nơi (req.body hoặc req.query)
		const { error, value } = validSchema.validate(req[property], {
			abortEarly: false,
			stripUnknown: true,
		});

		if (error) {
			const errorMessage = error.details
				.map((details) => details.message)
				.join(", ");
			const err = new Error(errorMessage);
			err.statusCode = 400;
			return next(err);
		}

		// Ghi đè dữ liệu sạch vào lại đúng vị trí
		req[property] = value;
		return next();
	};
};

module.exports = validate;
