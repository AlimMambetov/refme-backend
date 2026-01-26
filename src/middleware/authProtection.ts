import { Request, Response, NextFunction } from 'express';
import jwt, { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { UserModel } from '../database';

export const authProtection = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
	try {
		const token = req?.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
		if (!token) return res.status(401).json({ error: 'No token provided' });
		const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { userId: string };
		const user = await UserModel.findById(decoded.userId);
		if (!user) return res.status(404).json({ error: 'User not found' });
		req.user = user;

		next();
	} catch (err: any) {
		if (err instanceof TokenExpiredError) return res.status(401).json({ error: 'Token expired' });
		if (err instanceof JsonWebTokenError) return res.status(401).json({ error: 'Invalid token' });
		return res.status(401).json({ error: 'Authentication failed' });
	}
};