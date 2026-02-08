import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

interface ValidationSchemas {
	body?: z.ZodType<any>;
	query?: z.ZodType<any>;
	params?: z.ZodType<any>;
	headers?: z.ZodType<any>;
	cookies?: z.ZodType<any>;
}

interface ValidatedData {
	body?: any;
	query?: any;
	params?: any;
	headers?: any;
	cookies?: any;
}

// Расширяем Request тип
declare global {
	namespace Express {
		interface Request {
			validatedData?: ValidatedData;
		}
	}
}

// Перегрузки для разных вариантов вызова
export function validate(schema: z.ZodType<any>): (req: Request, res: Response, next: NextFunction) => void;

export function validate(schemas: ValidationSchemas): (req: Request, res: Response, next: NextFunction) => void;

export function validate(schemasOrSchema: ValidationSchemas | z.ZodType<any>) {
	return (req: Request, res: Response, next: NextFunction) => {
		try {
			req.validatedData = {};

			// Если передан просто schema (не объект), считаем это body
			if (!isValidationSchemas(schemasOrSchema)) {
				req.body = schemasOrSchema.parse(req.body);
				req.validatedData.body = req.body;
			} else {
				// Если передан объект со схемами
				const schemas = schemasOrSchema;

				if (schemas.body) {
					req.body = schemas.body.parse(req.body);
					req.validatedData.body = req.body;
				}

				if (schemas.query) {
					// Не перезаписываем req.query, а сохраняем в validatedData
					req.validatedData.query = schemas.query.parse(req.query);
					// Для совместимости можно также добавить в req.query
					Object.assign(req.query, req.validatedData.query);
				}

				if (schemas.params) {
					// Не перезаписываем req.params, а сохраняем в validatedData
					req.validatedData.params = schemas.params.parse(req.params);
					// Для совместимости можно также добавить в req.params
					Object.assign(req.params, req.validatedData.params);
				}

				if (schemas.headers) {
					req.validatedData.headers = schemas.headers.parse(req.headers);
					// Для headers лучше не перезаписывать, так как это может сломать другие middleware
				}

				if (schemas.cookies) {
					req.validatedData.cookies = schemas.cookies.parse(req.cookies);
					// Для cookies тоже лучше не перезаписывать
				}
			}

			next();
		} catch (error) {
			next(error);
		}
	};
}

// Вспомогательная функция для определения типа
function isValidationSchemas(obj: any): obj is ValidationSchemas {
	return obj && typeof obj === 'object' && (
		'body' in obj ||
		'query' in obj ||
		'params' in obj ||
		'headers' in obj ||
		'cookies' in obj
	);
}