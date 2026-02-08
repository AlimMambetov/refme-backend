import { Router } from 'express';
import { covertCompanies } from './convert-companies.controller';
import { getCodes, sendCode } from './code.controller';
import { z } from 'zod';
import { zodSchema } from '../../utils/zodSchema';
import { validate } from '../../middleware';

const router = Router();

const validateOps = z.object({
	email: z.email(),
	code: z.string().min(4)
});

// Схемы валидации
const sendCodeSchema = zodSchema(validateOps, ['email']);



// router.get('/convert-companies', covertCompanies)
router.get('/send-code', validate({ query: sendCodeSchema }), sendCode)
router.get('/codes', getCodes)

export default router;
