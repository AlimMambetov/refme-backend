import { Router } from 'express';
import { authProtection, validate } from '../../middleware';
import { createCompany, deleteCompany, getCompanies, getCompanyItem, searchCompanies, updateCompany } from './companies.controller';
import { z } from 'zod';
import { zodSchema } from '../../utils/zodSchema';

const router = Router();

const validateOps = z.object({
	id: z.string(),
	type: z.enum(['all', 'letters']).optional().default('all'),
	name: z.string().min(2),
	url: z.url(),
	description: z.string().min(10).max(2000),
	promotionText: z.string().max(500),
	categories: z.array(z.string()),
	isCustom: z.boolean(),
	// ---search
	search: z.string().min(1).optional(), // поисковый запрос
	category: z.string().optional(), // фильтр по категории
	page: z.string().regex(/^\d+$/).optional().transform(val => val ? parseInt(val) : 1).default(1), // номер страницы
	limit: z.string().regex(/^\d+$/).optional().transform(val => val ? parseInt(val) : 20).default(20), // лимит на странице
	sortBy: z.enum(['name', 'refs', 'createdAt', 'updatedAt']).optional().default('name'), // поле для сортировки
	sortOrder: z.enum(['asc', 'desc']).optional().default('asc'), // порядок сортировки
});

const dataSchema = zodSchema(validateOps, ['type', 'page', 'limit']);
const createSchema = zodSchema(validateOps, {
	required: ['name', 'url', 'description'],
	optional: ['promotionText', 'categories']
});
const updateSchema = zodSchema(validateOps, {
	required: ['id'],
	optional: ['name', 'promotionText', 'description', 'categories', 'url']
});
const searchSchema = zodSchema(validateOps, ['search', 'category', 'page', 'limit', 'sortBy', 'sortOrder'])

// --------------------------------------------------------------

// router.get('/data', validate({ query: dataSchema }), getCompanies);
// router.get('/search', validate({ query: searchSchema }), searchCompanies);
router.get('/item/:id', getCompanyItem);
router.get('/data', validate({ query: searchSchema }), searchCompanies);
router.post('/create', authProtection, validate(createSchema), createCompany);
router.post('/update', authProtection, validate(updateSchema), updateCompany);
router.delete('/delete', authProtection, deleteCompany);



export default router;
