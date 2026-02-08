import { Request, Response } from 'express';
import { AppError, generateCode, sendEmail } from '../../utils';
import { CodeModel } from '../../database';

import { catchAsync } from '../../middleware';

export const sendCode = catchAsync(async (req: Request, res: Response): Promise<any> => {
	const { email } = req.query as { email: string };

	const code = generateCode(4);
	await CodeModel.deleteMany({ email });
	await CodeModel.create({ email, code });

	await sendEmail(email, {
		subject: 'RefMe - New Verification Code',
		text: `Your new verification code is: ${code}. `
	});

	return res.status(200).json({ success: true, message: `New verification code sent successfully to ${email}. You have 5 minutes to confirm the code. Don't tell anyone the code.` });
});


export const verifyCode = catchAsync(async (req: Request, res: Response): Promise<any> => {
	const { email, code } = req.query;
	const codeMatched = await CodeModel.findOne({ email, code });
	if (!codeMatched) throw new AppError(400, 'Invalid or expired code');
	await codeMatched.updateOne({ used: true });
	await codeMatched.save();

	return res.json({ success: true, message: `The code has been confirmed, and its lifetime is 30 minutes.` })
});

