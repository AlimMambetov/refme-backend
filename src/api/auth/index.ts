import { Router } from 'express';
import { register } from './register.controller';
import { resendCode, verifyCode } from './code.controller';
import { z } from 'zod';
import { validate } from '../../middleware';
import { forgotPassword, login, logout, refreshToken } from './login.controller';
import { authGoogle, callbackGoogle } from './google.controller';

const router = Router();

// Схемы валидации
const actionSchema = z.enum(['draft', 'password', 'register']);
const resendCodeSchema = z.object({
	email: z.email(),
	action: actionSchema
});
const verifyCodeSchema = resendCodeSchema.extend({
	code: z.string().min(4),
	password: z.string().min(8).optional(),
	username: z.string().min(2).optional(),
	use: z.boolean().optional()
});
const loginSchema = z.object({
	email: z.email(),
	password: z.string().min(6)
});
const registerSchema = z.object({
	email: z.email(),
	password: z.string().min(6)
});
const emailSchema = z.object({ email: z.email() });

// Типы (опционально, можно использовать z.infer)
export type T_action = z.infer<typeof actionSchema>;
export type I_resendCode = z.infer<typeof resendCodeSchema>;
export type I_verifyCode = z.infer<typeof verifyCodeSchema>;


// --------------------------------------------------------------


router.post('/login', validate(loginSchema), login);
router.post('/register', validate(registerSchema), register);
router.post('/forgot-password', validate(emailSchema), forgotPassword);
router.get('/logout', logout);
router.get('/refresh', refreshToken);

router.post('/resend-code', validate(resendCodeSchema), resendCode);
router.post('/verify-code', validate(verifyCodeSchema), verifyCode);

router.get('/google', authGoogle);
router.get('/google/callback', callbackGoogle);



export default router;
