import { Router } from 'express';
import { z } from 'zod';
import { authProtection, validate } from '../../middleware';
import { zodSchema } from '../../utils/zodSchema';
import { createRef, getRefItem, getRefs, refAction, updateRef } from './ref.controller';

const router = Router();

const validateOps = z.object({
	id: z.string(),

	// Ref поля
	title: z.string()
		.min(3, 'Title must be at least 3 characters')
		.max(200, 'Title cannot exceed 200 characters'),
	benefits: z.array(z.string()).optional(),
	termsOfUse: z.array(z.string()).optional(),
	type: z.enum(['link', 'code', 'job-offer']),
	value: z.string().max(5000),
	companyId: z.string(),
	description: z.string().max(5000).optional(),

	// --- Поиск и фильтры
	search: z.string().optional(),
	typeFilter: z.enum(['link', 'code', 'job-offer']).optional(),
	statusFilter: z.enum(['draft', 'review', 'rejected', 'posted']).optional(),
	companyFilter: z.string().optional(),
	authorFilter: z.string().optional(),

	// --- Пагинация и сортировка
	page: z.string().regex(/^\d+$/).optional().transform(val => val ? parseInt(val) : 1).default(1), // номер страницы
	limit: z.string().regex(/^\d+$/).optional().transform(val => val ? parseInt(val) : 20).default(20), // лимит на странице
	sort: z.enum(['createdAt', '-createdAt', 'rating', '-rating', 'title', '-title'])
		.optional()
		.default('-createdAt'),

	// --- Действия
	action: z.enum(['archive', 'like', 'dislike', 'visible', 'click']).optional(),

});

// Схемы валидации
const createRefSchema = zodSchema(validateOps, ['title', 'description', 'benefits', 'termsOfUse', 'type', 'value', 'companyId']);
const updateRefSchema = zodSchema(validateOps, { optional: ['title', 'description', 'benefits', 'termsOfUse'] });
const getRefsSchema = zodSchema(validateOps, [
	'page', 'limit', 'sort', 'search',
	'typeFilter', 'statusFilter', 'companyFilter', 'authorFilter'
]);
const actionRefSchema = zodSchema(validateOps, ['action']);
// -------------------------------

router.get('/data', validate({ query: getRefsSchema }), getRefs);
router.get('/item/:id', getRefItem);
router.get('/action/:id', authProtection, validate({ query: actionRefSchema }), refAction);
router.post('/create', authProtection, validate(createRefSchema), createRef);
router.post('/update/:id', authProtection, validate(updateRefSchema), updateRef);



export default router;
