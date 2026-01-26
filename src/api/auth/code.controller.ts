import { Request, Response } from 'express';
import { AppError, generateCode, generateTokens, sendEmail, setAuthCookies } from '../../utils';
import { CodeModel, TokenModel, UserModel } from '../../database';

import { catchAsync } from '../../middleware';


export const resendCode = catchAsync(async (req: Request, res: Response): Promise<any> => {
	const { email, action } = req.body;
	const user = await UserModel.findOne({ email });
	if (!user) throw new AppError(404, 'User not found');
	// Проверяем, не верифицирован ли уже пользователь
	if (user.verifiedAt) throw new AppError(400, 'User is already verified');

	let message = `New verification code sent successfully to ${email}`;

	const code = generateCode(4);
	await CodeModel.deleteMany({ userId: user._id, action });
	await CodeModel.create({ userId: user._id, code, action });

	await sendEmail(email, {
		subject: 'RefMe - New Verification Code',
		text: `Your new verification code is: ${code}`
	});

	return res.status(200).json({ message });
});


export const verifyCode = catchAsync(async (req: Request, res: Response): Promise<any> => {
	const { use = false, email, code, action, password, username } = req.body;
	const user = await UserModel.findOne({ email });
	if (!user) throw new AppError(404, 'User not found');
	const authCode = await CodeModel.findOne({ userId: user._id, code, action });
	if (!authCode) throw new AppError(400, 'Invalid or expired code');
	await authCode.updateOne({ used: true });
	await authCode.save();
	let message = 'Success';

	// ------------- use
	if (!use) return res.json({ message });
	const { accessToken, refreshToken, refreshTokenExpiresAt } = generateTokens((user._id as any).toString());

	setAuthCookies(res, accessToken, refreshToken);

	await TokenModel.create({
		userId: user._id,
		refreshToken,
		expiresAt: refreshTokenExpiresAt,
		ip: req.ip,
		userAgent: req.headers['user-agent'],
	});

	const actions = {
		"draft": async () => message = 'A successful process',
		"register": async () => {
			if (!username) throw new AppError(400, 'username key is required')
			user.verifiedAt = new Date();
			user.username = username;
			await user.save();
			message = 'Registration was successful';
		},
		"password": async () => {
			if (!password) throw new AppError(400, 'password key is required')
			user.password = password;
			await user.save();
			message = 'The password was changed successfully';
		},
	} as any;

	await actions[action]();
	await authCode.deleteOne();

	return res.json({ message, accessToken, refreshToken })
});
