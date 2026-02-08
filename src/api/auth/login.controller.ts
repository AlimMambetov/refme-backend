import { Request, Response } from 'express';
import { catchAsync } from '../../middleware';
import { CodeModel, TokenModel, UserModel } from '../../database';
import { AppError, generateTokens, setAuthCookies } from '../../utils';
import jwt from 'jsonwebtoken';

export const login = catchAsync(async (req: Request, res: Response): Promise<any> => {
	const { email, password } = req.body;
	const user = await UserModel.findOne({ email }).select('+password') as any;
	if (!user) throw new AppError(404, 'User not found');

	const isMatch = await user.comparePassword(password);
	if (!isMatch) throw new AppError(401, 'Invalid password');

	const { accessToken, refreshToken, refreshTokenExpiresAt } = generateTokens((user._id as any).toString());
	await TokenModel.deleteMany({ userId: user._id, });
	await TokenModel.create({
		userId: user._id,
		refreshToken,
		expiresAt: refreshTokenExpiresAt,
		ip: req.ip,
		userAgent: req.headers['user-agent'],
	});
	setAuthCookies(res, accessToken, refreshToken);

	res.json({ success: true, message: 'Logged in successfully', tokens: { accessToken, refreshToken } });

});



export const forgotPassword = catchAsync(async (req: Request, res: Response): Promise<any> => {
	const { email, code, password } = req.body;
	const user = await UserModel.findOne({ email });
	if (!user) throw new AppError(404, 'User not found');
	const codeMatched = await CodeModel.findOne({ email, code });
	if (!codeMatched) throw new AppError(400, 'Invalid or expired code');

	user.password = password;
	await user.save();

	const { accessToken, refreshToken, refreshTokenExpiresAt } = generateTokens((user._id as any).toString());
	setAuthCookies(res, accessToken, refreshToken);

	await TokenModel.deleteMany({ userId: user._id, });
	await TokenModel.create({
		userId: user._id,
		refreshToken,
		expiresAt: refreshTokenExpiresAt,
		ip: req.ip,
		userAgent: req.headers['user-agent'],
	});

	await codeMatched.deleteOne();

	return res.status(200).json({ success: true, message: 'The password was changed successfully' });
});



export const logout = async (req: Request, res: Response) => {
	let refreshToken = req.cookies?.refreshToken;
	if (!refreshToken && req.headers.authorization) {
		const authHeader = req.headers.authorization;
		if (authHeader.startsWith('Bearer ')) refreshToken = authHeader.substring(7);
	}
	if (refreshToken) await TokenModel.findOneAndDelete({ refreshToken });

	// Очищаем куки
	res.clearCookie('accessToken', { httpOnly: true, secure: true, sameSite: 'strict' });
	res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'strict' });

	return res.status(200).json({
		success: true,
		message: 'Logged out successfully',
		refreshToken
	});
};


export const refreshToken = async (req: Request, res: Response): Promise<any> => {
	let refreshToken = req.cookies?.refreshToken;
	if (!refreshToken && req.headers.authorization) {
		const authHeader = req.headers.authorization;
		if (authHeader.startsWith('Bearer ')) refreshToken = authHeader.substring(7);
	}
	if (!refreshToken) throw new AppError(401, 'No refresh token provided')

	// Проверяем токен на подпись
	let payload: any;
	try {
		payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
	} catch (err) {
		throw new AppError(401, 'Invalid refresh token')
	}

	const existingToken = await TokenModel.findOne({ refreshToken });
	if (!existingToken) throw new AppError(401, 'Refresh token not found or invalidated');
	const user = await UserModel.findById(payload.userId);
	if (!user) throw new AppError(404, 'User not found');

	const { accessToken, refreshToken: newRefreshToken, refreshTokenExpiresAt } = generateTokens((user._id as any).toString());
	// Обновляем refresh токен в базе
	existingToken.refreshToken = newRefreshToken;
	existingToken.expiresAt = refreshTokenExpiresAt;
	await existingToken.save()
	setAuthCookies(res, accessToken, newRefreshToken);

	res.status(200).json({ success: true, message: 'Tokens refreshed', tokens: { accessToken, refreshToken: newRefreshToken } });

};
