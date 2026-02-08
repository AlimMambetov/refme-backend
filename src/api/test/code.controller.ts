import { Request, Response } from 'express';
import { CodeModel } from '../../database';

import { catchAsync } from '../../middleware';

export const sendCode = catchAsync(async (req: Request, res: Response): Promise<any> => {
	const { email } = req.query as { email: string };
	const code = '1111';
	await CodeModel.deleteMany({ email });
	await CodeModel.create({ email, code });

	return res.status(200).json({ success: true, message: ` code: ${code} | email: ${email}` });
});
export const getCodes = catchAsync(async (req: Request, res: Response): Promise<any> => {
	const data = await CodeModel.find();
	return res.status(200).json({ success: true, data });
});
