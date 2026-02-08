import { Request, Response } from 'express';
import { AppError, generateTokens, setAuthCookies } from '../../utils';
import { CodeModel, TokenModel, UserModel } from '../../database';
import { catchAsync } from '../../middleware';


export const register = catchAsync(async (req: Request, res: Response): Promise<any> => {
	const { email, password, username, code } = req.body;
	const codeMatched = await CodeModel.findOne({ email, code })
	if (!codeMatched) throw new AppError(400, 'Invalid or expired code');

	const user = await new UserModel({ email, password, username })
	await user.save();

	const { accessToken, refreshToken, refreshTokenExpiresAt } = generateTokens((user._id as any).toString());
	await TokenModel.create({
		userId: user._id,
		refreshToken,
		expiresAt: refreshTokenExpiresAt,
		ip: req.ip,
		userAgent: req.headers['user-agent'],
	});
	setAuthCookies(res, accessToken, refreshToken);
	await codeMatched.deleteOne();

	return res.status(201).json({ success: true, message: `Registration successful.`, tokens: { accessToken, refreshToken } });
})


export default register;