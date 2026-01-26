import { Router } from 'express';
import { authProtection, validate } from '../../middleware';
import { createCompany, deleteCompany, getCompanies, updateCompany } from './companies.controller';
import { z } from 'zod';

const router = Router();


const createSchema = z.object({
	name: z.string().min(2),
	url: z.url(),
	description: z.string().min(10).max(2000),
	promotionText: z.string().max(500).optional(),
	categories: z.array(z.string()).optional(),
	isCustom: z.boolean().optional(),
})
const updateSchema = z.object({
	id: z.string().optional(),
	name: z.string().min(2).optional(),
	url: z.url().optional(),
	description: z.string().min(10).max(2000).optional(),
	promotionText: z.string().max(500).optional(),
	categories: z.array(z.string()).optional(),
	isCustom: z.boolean().optional(),
});

// --------------------------------------------------------------

router.get('/data', getCompanies);
router.post('/create', authProtection, validate(createSchema), createCompany);
router.post('/update', authProtection, validate(updateSchema), updateCompany);
router.delete('/delete', authProtection, deleteCompany);



export default router;
