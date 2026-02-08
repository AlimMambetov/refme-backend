import { Router } from 'express';
import { authProtection } from '../../middleware';
import { profileData, profileDelete, profileUpdate } from './profile.controller';
import { z } from 'zod';
import { validate } from '../../middleware';
import { zodSchema } from '../../utils/zodSchema';

const router = Router();


const validateOps = z.object({
	email: z.email().optional(),
	password: z.string().min(6).optional(),
	username: z.string().min(2).max(100).optional(),
	code: z.string().min(4)
});


const updateSchema = zodSchema(validateOps, ['code', 'email', 'username', 'password'])


router.get('/data', authProtection, profileData);
router.post('/update', authProtection, validate(updateSchema), profileUpdate);
router.delete('/delete', authProtection, profileDelete);

export default router;
