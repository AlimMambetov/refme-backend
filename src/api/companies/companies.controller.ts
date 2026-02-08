import { Request, Response } from 'express';
import { catchAsync } from "../../middleware";
import { AppError } from '../../utils';
import { CompanyModel } from '../../database';

export const getCompanyItem = catchAsync(async (req: Request, res: Response): Promise<Response> => {
	const { id } = req.params as any;

	const company = await CompanyModel.findById(id).lean();

	if (!company) throw new AppError('Company not found', 404);

	return res.json({
		success: true,
		data: company
	});
});


export const getCompanies = catchAsync(async (req: Request, res: Response): Promise<Response> => {
	const { type = 'all', page = 1, limit = 20 } = req.query as any;

	const pageNum = Math.max(1, parseInt(page));
	const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
	const skip = (pageNum - 1) * limitNum;

	if (type === 'letters') {
		// Получаем общее количество компаний
		const total = await CompanyModel.countDocuments();

		// Получаем компании с пагинацией
		const companies = await CompanyModel.find()
			.select('-__v') // исключаем служебные поля
			.skip(skip)
			.limit(limitNum)
			.sort({ name: 1 }) // сортируем по имени для правильной группировки
			.lean();

		// Группируем компании по первой букве/символу только для полученной страницы
		const groupedByLetter: Record<string, any[]> = {};

		companies.forEach(company => {
			// Получаем первую букву названия (или символ)
			const firstChar = company.name.charAt(0).toUpperCase();

			// Определяем категорию: цифра, буква или символ
			let category;
			if (/[0-9]/.test(firstChar)) {
				category = '#';
			} else if (/[A-ZА-ЯЁ]/.test(firstChar)) { // добавлена поддержка кириллицы
				category = firstChar;
			} else {
				category = '#';
			}

			// Добавляем в соответствующую группу
			if (!groupedByLetter[category]) {
				groupedByLetter[category] = [];
			}

			groupedByLetter[category].push(company);
		});

		// Сортируем группы: сначала #, потом буквы по алфавиту
		const sortedGroups = Object.entries(groupedByLetter)
			.sort(([a], [b]) => {
				if (a === '#') return -1;
				if (b === '#') return 1;
				return a.localeCompare(b);
			})
			.map(([letter, companies]) => ({
				letter,
				companies: companies.sort((a, b) => a.name.localeCompare(b.name))
			}));

		// Преобразуем _id в id для каждого элемента
		sortedGroups.forEach(group => {
			group.companies = group.companies.map(company => ({
				id: company._id.toString(),
				...company,
				_id: undefined
			}));
		});

		return res.json({
			success: true,
			data: sortedGroups,
			meta: {
				total,
				page: pageNum,
				limit: limitNum,
				totalPages: Math.ceil(total / limitNum),
				hasNextPage: pageNum < Math.ceil(total / limitNum),
				hasPrevPage: pageNum > 1,
				type: 'letters'
			}
		});
	}

	// Если type не 'letters', возвращаем обычный список с пагинацией
	const total = await CompanyModel.countDocuments();
	const companies = await CompanyModel.find()
		.select('-__v')
		.skip(skip)
		.limit(limitNum)
		.sort({ createdAt: -1 }) // сортируем по дате создания (новые первыми)
		.lean();

	// Преобразуем _id в id
	const transformedCompanies = companies.map(company => ({
		id: company._id.toString(),
		...company,
		_id: undefined
	}));

	return res.json({
		success: true,
		data: transformedCompanies,
		meta: {
			total,
			page: pageNum,
			limit: limitNum,
			totalPages: Math.ceil(total / limitNum),
			hasNextPage: pageNum < Math.ceil(total / limitNum),
			hasPrevPage: pageNum > 1,
			type: 'all'
		}
	});
});

export const searchCompanies = catchAsync(async (req: Request, res: Response): Promise<Response> => {
	const {
		search,
		category,
		page = 1,
		limit = 20,
		sortBy = 'name',
		sortOrder = 'asc'
	} = req.query as any;

	const pageNum = Math.max(1, parseInt(page));
	const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
	const skip = (pageNum - 1) * limitNum;

	const filter: any = {};

	if (search && search.trim()) {
		const searchTerm = search.trim();
		const searchRegex = new RegExp(searchTerm, 'i');

		filter.$or = [
			{ name: searchRegex },
			{ description: searchRegex },
			{ promotionText: searchRegex },
			{ url: searchRegex },
			{ categories: { $in: [searchRegex] } }
		];
	}

	if (category && category.trim()) {
		filter.categories = {
			$elemMatch: {
				$regex: new RegExp(category.trim(), 'i')
			}
		};
	}

	// Определяем направление сортировки
	const sortDirection = sortOrder === 'desc' ? -1 : 1;

	// Если сортировка по refs, используем агрегацию
	if (sortBy === 'refs') {
		const pipeline: any[] = [{ $match: filter }];

		// Добавляем поле с количеством рефералов
		pipeline.push({
			$addFields: {
				refsCount: { $size: { $ifNull: ["$refs", []] } }
			}
		});

		// Сортируем по refsCount
		pipeline.push({ $sort: { refsCount: -sortDirection } });

		// Пагинация
		pipeline.push({ $skip: skip });
		pipeline.push({ $limit: limitNum });

		// Проекция
		pipeline.push({
			$project: {
				_id: 1,
				name: 1,
				description: 1,
				promotionText: 1,
				url: 1,
				categories: 1,
				refs: 1,
				logo: 1,
				createdAt: 1,
				updatedAt: 1,
				refsCount: 1
			}
		});

		const [companiesAggregate, total] = await Promise.all([
			CompanyModel.aggregate(pipeline),
			CompanyModel.countDocuments(filter)
		]);

		const transformedCompanies = companiesAggregate.map(company => ({
			id: company._id.toString(),
			...company,
			_id: undefined
		}));

		return res.json({
			success: true,
			data: transformedCompanies,
			meta: {
				total,
				page: pageNum,
				limit: limitNum,
				totalPages: Math.ceil(total / limitNum),
				hasNextPage: pageNum < Math.ceil(total / limitNum),
				hasPrevPage: pageNum > 1,
				searchTerm: search || '',
				category: category || '',
				sortBy,
				sortOrder
			}
		});
	}

	// Обычная сортировка для остальных случаев
	const sortOptions: any = {};
	sortOptions[sortBy] = sortDirection;

	const [companies, total] = await Promise.all([
		CompanyModel.find(filter)
			.select('-__v')
			.sort(sortOptions)
			.skip(skip)
			.limit(limitNum)
			.lean(),
		CompanyModel.countDocuments(filter)
	]);

	const transformedCompanies = companies.map(company => ({
		id: company._id.toString(),
		...company,
		_id: undefined
	}));

	return res.json({
		success: true,
		data: transformedCompanies,
		meta: {
			total,
			page: pageNum,
			limit: limitNum,
			totalPages: Math.ceil(total / limitNum),
			hasNextPage: pageNum < Math.ceil(total / limitNum),
			hasPrevPage: pageNum > 1,
			searchTerm: search || '',
			category: category || '',
			sortBy,
			sortOrder
		}
	});
});

export const createCompany = catchAsync(async (req: Request, res: Response): Promise<Response> => {
	const { _id: userId } = req.user as any;
	if (!userId) throw new AppError(401, 'Unauthorized');
	const { name, url, description, promotionText, categories, isCustom } = req.body;

	const existingCompany = await CompanyModel.findOne({ name });
	if (existingCompany) throw new AppError(400, 'Company with this name already exists');

	// Создаем новую компанию
	const company = await CompanyModel.create({
		authorId: userId,
		name,
		url,
		description,
		promotionText,
		categories: categories || [],
		isCustom: isCustom || false
	});

	return res.status(201).json({
		success: true,
		message: 'Company created successfully',
		data: company
	});
});


export const deleteCompany = catchAsync(async (req: Request, res: Response): Promise<Response> => {
	const { _id: userId } = req.user as any;
	if (!userId) throw new AppError(401, 'Unauthorized');
	const { id } = req.params;
	const company = await CompanyModel.findOne({ _id: id, authorId: userId });
	if (!company) throw new AppError(404, 'Company not found');
	await CompanyModel.findByIdAndDelete(id);

	return res.json({
		success: true,
		message: 'Company deleted successfully'
	});
});


export const updateCompany = catchAsync(async (req: Request, res: Response): Promise<Response> => {
	const { _id: userId } = req.user as any;
	if (!userId) throw new AppError(401, 'Unauthorized');
	const { id, name, url, description, promotionText, categories } = req.body;

	const company = await CompanyModel.findOne({ _id: id, authorId: userId, isCustom: true });
	if (!company) throw new AppError(404, 'Company not found');

	// Проверяем уникальность имени, если оно изменяется
	if (name && name !== company.name) {
		const existingCompany = await CompanyModel.findOne({ name });
		if (existingCompany) throw new AppError(400, 'Company with this name already exists');
	}

	// Обновляем поля
	if (name !== undefined) company.name = name;
	if (url !== undefined) company.url = url;
	if (description !== undefined) company.description = description;
	if (promotionText !== undefined) company.promotionText = promotionText;
	if (categories !== undefined) company.categories = categories;

	await company.save();

	return res.json({
		success: true,
		message: 'Company updated successfully',
		data: company
	});
});