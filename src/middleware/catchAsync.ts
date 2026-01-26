// middleware/catchAsync.ts
import { Request, Response, NextFunction } from 'express';

export const catchAsync = (fn: Function) => {
	return (req: Request, res: Response, next: NextFunction) => {
		try {
			// Если функция возвращает Promise
			const result = fn(req, res, next);
			if (result instanceof Promise) {
				return result.catch(next);
			}
			// Если функция синхронная
			return result;
		} catch (error) {
			// Ловим синхронные ошибки
			next(error);
		}
	};
};