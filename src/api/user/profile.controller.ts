
import { Request, Response } from 'express';
import { CodeModel, TokenModel, UserModel } from '../../database';
import { catchAsync } from '../../middleware';
import { AppError } from '../../utils';

export const profileData = catchAsync(async (req: Request, res: Response): Promise<any> => {
	const { _id: userId } = req.user as any;
	if (!userId) throw new AppError(401, 'Unauthorized');
	const user = await UserModel.findById(userId).select('-password -__v -createdAt -updatedAt');
	if (!user) throw new AppError(404, 'User not found');

	const userResponse = {
		id: (user._id as any).toString(),
		...user.toObject(), // если user — это документ Mongoose
	} as any;

	delete userResponse._id;

	return res.json({ success: true, data: userResponse })
})

export const profileUpdate = catchAsync(async (req: Request, res: Response): Promise<any> => {
	const { _id: userId } = req.user as any;
	const { email, username, password, code } = req.body;
	const codeMatched = await CodeModel.findOne({ email, code })
	if (!codeMatched) throw new AppError(400, 'Invalid or expired code');
	if (!userId) throw new AppError(401, 'Unauthorized');
	const user = await UserModel.findById(userId).select('-password -__v -createdAt -updatedAt');
	if (!user) throw new AppError(404, 'User not found');

	if (email) user.email = email;
	if (username) user.username = username;
	if (password) user.password = password;

	await user.save();

	const userResponse = {
		id: (user._id as any).toString(),
		...user.toObject(), // если user — это документ Mongoose
	} as any;

	delete userResponse._id;
	await codeMatched.deleteOne();

	return res.json({ success: true, data: userResponse })
})


export const profileDelete = catchAsync(async (req: Request, res: Response): Promise<any> => {
	const { _id: userId } = req.user as any;
	if (!userId) throw new AppError(401, 'Unauthorized');
	let refreshToken = req.cookies?.refreshToken
	if (refreshToken) await TokenModel.findOneAndDelete({ refreshToken });

	await UserModel.findByIdAndDelete(userId);

	res.clearCookie('accessToken');
	res.clearCookie('refreshToken');

	return res.status(200).json({ success: true, message: 'user deleted' });
});