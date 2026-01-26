import { Request, Response } from 'express';
import { catchAsync } from "../../middleware";
import { AppError } from '../../utils';
import { CompanyModel } from '../../database';


export const getCompanies = catchAsync(async (req: Request, res: Response): Promise<Response> => {
	const { type = 'all' } = req.query;
	const allCompanies = await CompanyModel.find();

	if (type === 'letters') {
		// Группируем компании по первой букве/символу
		const groupedByLetter: Record<string, any[]> = {};

		allCompanies.forEach(company => {
			// Получаем первую букву названия (или символ)
			const firstChar = company.name.charAt(0).toUpperCase();

			// Определяем категорию: цифра, буква или символ
			let category;
			if (/[0-9]/.test(firstChar)) {
				category = '#';
			} else if (/[A-Z]/.test(firstChar)) {
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

		return res.json({
			success: true,
			count: allCompanies.length,
			data: sortedGroups
		});
	}

	// Если type не 'letters', возвращаем обычный список
	return res.json({
		success: true,
		count: allCompanies.length,
		data: allCompanies
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
	const { id, name, url, description, promotionText, categories, isCustom } = req.body;

	const company = await CompanyModel.findOne({ _id: id, authorId: userId });
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