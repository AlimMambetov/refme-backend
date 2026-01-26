
import { Request, Response } from 'express';
import { UserModel } from '../../database';
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

	res.json(userResponse);
	return res.json({})
})

export const profileDelete = catchAsync(async (req: Request, res: Response): Promise<any> => {
	const { _id: userId } = req.user as any;
	if (!userId) throw new AppError(401, 'Unauthorized');

	await UserModel.findByIdAndDelete(userId);

	res.clearCookie('accessToken');
	res.clearCookie('refreshToken');

	return res.status(200).json({ message: 'user deleted' });
});