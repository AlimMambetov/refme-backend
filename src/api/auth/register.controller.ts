import { Request, Response } from 'express';
import { AppError, generateCode, sendEmail } from '../../utils';
import { CodeModel, UserModel } from '../../database';
import { catchAsync } from '../../middleware';


export const register = catchAsync(async (req: Request, res: Response): Promise<any> => {
	const { email, password } = req.body;
	const existingUser = await UserModel.findOne({ email });
	if (existingUser) throw new AppError(409, 'User already exists');

	const user = new UserModel({ email, password })
	await user.save();
	const code = generateCode(4);
	await CodeModel.create({ userId: user?._id, code, action: 'register' });
	await sendEmail(email, { subject: 'RefMe verify code', text: `Your verification code is: ${code}` });

	return res.status(201).json({ message: `Registration successful. Check your email ${email} for verification code.` });
})


export default register;