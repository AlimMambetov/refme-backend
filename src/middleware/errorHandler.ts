import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils';
import { ZodError } from 'zod';
import mongoose from 'mongoose';

const formatError = (str: string) =>
	str.replace(/"([^"]+)"/g, (_, p1) => p1)
		.replace(/(expected one of |must be |allowed values?: )[^|]+(?:\|[^|]+)*/,
			(match, prefix) => {
				const values = match.slice(prefix.length)
					.split('|')
					.map(v => v.trim())
					.join(', ');
				return `${prefix}[${values}]`;
			});

export const errorHandler = (
	err: any,
	req: Request,
	res: Response,
	next: NextFunction
) => {
	// Обработка Zod ошибок
	if (err instanceof ZodError) {
		return res.status(400).json({
			success: false,
			error: 'Validation error',
			details: JSON.parse(err as any).map((e: any) => ({
				field: e?.path?.[0] || 'unknown',
				message: formatError(e?.message) || 'Invalid value',
				values: e?.values,
				code: e?.code
			}))
		});
	}

	// Обработка Mongoose ValidationError (валидация схемы)
	if (err instanceof mongoose.Error.ValidationError) {
		const errors = Object.values(err.errors).map((error: any) => ({
			field: error.path,
			message: error.message,
			value: error.value,
			type: error.kind
		}));

		return res.status(400).json({
			success: false,
			error: 'Validation failed',
			details: errors
		});
	}

	// Обработка Mongoose CastError (неправильный тип данных)
	if (err instanceof mongoose.Error.CastError) {
		return res.status(400).json({
			success: false,
			error: 'Invalid data type',
			details: {
				field: err.path,
				value: err.value,
				message: `${err.value} is not a valid ${err.kind}`
			}
		});
	}

	// Обработка дубликата ключа (unique constraint)
	if (err.code === 11000) {
		const field = Object.keys(err.keyPattern)[0];
		const value = err.keyValue[field];

		return res.status(409).json({
			success: false,
			error: 'Duplicate entry',
			details: {
				field,
				value,
				message: `${field} '${value}' already exists`
			}
		});
	}


	// Обработка AppError
	if (err instanceof AppError) {
		return res.status(err.statusCode).json({
			success: false,
			error: err.message || 'Something went wrong'
		});
	}

	// Обработка 404 и других статусов
	if (err.statusCode && err.statusCode !== 500) {
		return res.status(err.statusCode).json({
			success: false,
			error: err.message || 'Something went wrong'
		});
	}

	console.log(err)
	// 500 ошибки
	res.status(500).json({
		success: false,
		error: 'Internal server error'
	});
};

// 404 Handler
export const notFoundHandler = (req: Request, res: Response) => {
	res.status(404).json({
		success: false,
		error: 'Route not found',
		path: req.originalUrl,
		method: req.method
	});
};