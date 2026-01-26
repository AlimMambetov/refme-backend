interface AppErrorOptions {
	message: string;
	statusCode?: number;
}

export class AppError extends Error {
	statusCode: number;

	constructor(options: AppErrorOptions | string | number, statusCode?: number | string) {
		let message: string;
		let code: number;

		if (typeof options === 'string') {
			message = options;
			code = typeof statusCode === 'number' ? statusCode : 500;
		} else if (typeof options === 'number') {
			code = options;
			message = typeof statusCode === 'string' ? statusCode : 'Internal Server Error';
		} else if (options && typeof options === 'object') {
			message = options.message;
			code = options.statusCode || 500;
		} else {
			message = 'Internal Server Error';
			code = 500;
		}

		super(message);
		this.statusCode = code;
		this.name = this.constructor.name;

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}
}