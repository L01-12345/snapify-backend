// src/utils/response.util.js

const sendSuccess = (
	res,
	statusCode = 200,
	message = "Success",
	data = null,
) => {
	return res.status(statusCode).json({
		status: "success",
		message,
		data,
	});
};

const sendError = (
	res,
	statusCode = 500,
	message = "Internal Server Error",
) => {
	return res.status(statusCode).json({
		status: "error",
		message,
	});
};

module.exports = {
	sendSuccess,
	sendError,
};
