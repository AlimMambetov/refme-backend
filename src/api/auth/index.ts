import { Router } from 'express';
import { register } from './register.controller';
import { sendCode, verifyCode } from './code.controller';
import { z } from 'zod';
import { validate } from '../../middleware';
import { forgotPassword, login, logout, refreshToken } from './login.controller';
import { authGoogle, callbackGoogle } from './google.controller';
import { zodSchema } from '../../utils/zodSchema';

const router = Router();

const validateOps = z.object({
	email: z.email(),
	password: z.string().min(6),
	username: z.string().min(2).max(100),
	code: z.string().min(4)
});

// Схемы валидации
const sendCodeSchema = zodSchema(validateOps, ['email']);
const verifyCodeSchema = zodSchema(validateOps, ['email', 'code']);
const loginSchema = zodSchema(validateOps, ['email', 'password']);
const registerSchema = zodSchema(validateOps, ['email', 'code', 'username', 'password'])
const forgotPasswordSchema = zodSchema(validateOps, ['email', 'code', 'password']);



// --------------------------------------------------------------


router.post('/login', validate(loginSchema), login);
router.post('/register', validate(registerSchema), register);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.get('/logout', logout);
router.get('/refresh', refreshToken);

router.get('/send-code', validate({ query: sendCodeSchema }), sendCode);
router.get('/verify-code', validate({ query: verifyCodeSchema }), verifyCode);

router.get('/google', authGoogle);
router.get('/google/callback', callbackGoogle);



export default router;
