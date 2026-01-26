import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

// Типы
interface InputCompany {
	company: string;
	industry: string;
	countryCode: string;
	description: string;
}

interface OutputCompany {
	name: string;
	categories: string[];
	description: string;
	promotionText: null | string;
	isCustom: boolean;
}

// Функция для парсинга категорий
function parseCategories(industry: string): string[] {
	return industry
		.split(/[,/&]| and | or /gi) // разбиваем по запятым, слешам, &, and, or
		.map(category => category.trim())
		.filter(category => category.length > 0)
		.map(category => {
			// Убираем лишние слова и форматируем
			return category
				.replace(/\s+/g, ' ')
				.replace(/^["']|["']$/g, '')
				.split(' ')
				.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
				.join(' ');
		})
		.filter(category => !/^(and|or|&)$/i.test(category)); // удаляем оставшиеся разделители
}

// Основная функция преобразования
function transformCompanies(input: InputCompany[]): OutputCompany[] {
	return input.map(company => ({
		name: company.company,
		categories: parseCategories(company.industry),
		description: company.description,
		promotionText: null,
		isCustom: false
	}));
}

// API endpoint
export const covertCompanies = async (req: Request, res: Response) => {
	try {
		const __dirname = path.resolve(); // Получаем корневую директорию

		const inputPath = path.join(__dirname, 'companies.json');
		const outputPath = path.join(__dirname, 'transformed-companies.json');

		// Проверяем существование исходного файла
		if (!fs.existsSync(inputPath)) {
			return res.status(404).json({
				success: false,
				error: 'File not found',
				message: `companies.json not found at: ${inputPath}`
			});
		}

		// Читаем исходный файл
		const rawData = fs.readFileSync(inputPath, 'utf-8');
		const inputCompanies: InputCompany[] = JSON.parse(rawData);

		console.log(`📥 Прочитано компаний: ${inputCompanies.length}`);

		// Преобразуем данные
		const outputCompanies = transformCompanies(inputCompanies);

		// Записываем результат
		fs.writeFileSync(
			outputPath,
			JSON.stringify(outputCompanies, null, 2),
			'utf-8'
		);

		console.log(`✅ Преобразование завершено!`);
		console.log(`📊 Преобразовано компаний: ${outputCompanies.length}`);
		console.log(`💾 Результат сохранен в: ${outputPath}`);

		// Возвращаем успешный ответ
		return res.status(200).json({
			success: true,
			message: 'Companies converted successfully',
			data: {
				inputCount: inputCompanies.length,
				outputCount: outputCompanies.length,
				outputFile: 'transformed-companies.json',
				sample: outputCompanies.length > 0 ? outputCompanies[0] : null
			}
		});

	} catch (error: any) {
		console.error('❌ Ошибка при конвертации компаний:', error);

		return res.status(500).json({
			success: false,
			error: 'Conversion failed',
			message: error.message || 'Unknown error occurred',
			stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
		});
	}
};
