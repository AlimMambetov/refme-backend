import { z, ZodObject, ZodRawShape } from 'zod';

interface SchemaConfig<T extends ZodObject<ZodRawShape>> {
	required?: (keyof T['shape'])[];
	optional?: (keyof T['shape'])[];
}

export function zodSchema<T extends ZodObject<ZodRawShape>>(
	baseSchema: T,
	config: SchemaConfig<T>
): z.ZodObject<any>;

export function zodSchema<T extends ZodObject<ZodRawShape>>(
	baseSchema: T,
	keys: (keyof T['shape'])[]
): z.ZodObject<any>;

export function zodSchema<T extends ZodObject<ZodRawShape>>(
	baseSchema: T,
	configOrKeys: SchemaConfig<T> | (keyof T['shape'])[]
): z.ZodObject<any> {
	const shape = baseSchema.shape as Record<string, any>;
	const resultShape: Record<string, any> = {};

	// Проверяем, что передали - массив или объект
	if (Array.isArray(configOrKeys)) {
		// Вариант 1: Просто массив ключей
		// Берем поля как они есть в базовой схеме
		for (const key of configOrKeys) {
			const keyStr = key as string;
			if (keyStr in shape) {
				resultShape[keyStr] = shape[keyStr];
			}
		}
	} else {
		// Вариант 2: Объект конфигурации
		const config = configOrKeys as SchemaConfig<T>;

		// Обязательные поля
		if (config.required) {
			for (const key of config.required) {
				const keyStr = key as string;
				if (keyStr in shape) {
					resultShape[keyStr] = shape[keyStr];
				}
			}
		}

		// Опциональные поля
		if (config.optional) {
			for (const key of config.optional) {
				const keyStr = key as string;
				if (keyStr in shape) {
					resultShape[keyStr] = shape[keyStr].optional();
				}
			}
		}
	}

	return z.object(resultShape);
}