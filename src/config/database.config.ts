import mongoose from 'mongoose';
import '../database/user';
import '../database/ref';
import '../database/code';
import '../database/company';
import '../database/token';
import '../database/report';

const { DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME } = process.env;

const MONGO_URI = `mongodb://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?authSource=admin`;
// console.log(MONGO_URI)

export async function connectDB(): Promise<void> {
	try {
		// Опции подключения
		mongoose.set('strictQuery', true);

		await mongoose.connect(MONGO_URI, {
			serverSelectionTimeoutMS: 5000, // таймаут выбора сервера
			socketTimeoutMS: 45000, // таймаут сокета
			maxPoolSize: 10, // размер пула соединений
		});

		// Обработчики событий
		mongoose.connection.on('error', (err) => {
			console.error('MongoDB connection error:', err);
		});

		mongoose.connection.on('disconnected', () => {
			console.warn('MongoDB disconnected');
		});

		mongoose.connection.on('reconnected', () => {
			console.log('MongoDB reconnected');
			// Пересинхронизируем индексы при реконнекте
			syncIndexes();
		});

		// Синхронизация индексов
		await syncIndexes();

		console.log('MongoDB connected successfully');
	} catch (error) {
		console.error('Failed to connect to MongoDB:', error);
		process.exit(1);
	}
}



async function syncIndexes(): Promise<void> {
	try {
		const models = Object.values(mongoose.models);
		const results = await Promise.allSettled(
			models.map(model => model.syncIndexes())
		);

		// Логируем результаты
		results.forEach((result, index) => {
			const modelName = models[index].modelName;
			if (result.status === 'fulfilled') {
				console.log(`✓ Indexes synced for ${modelName}`);
			} else {
				console.error(`✗ Failed to sync indexes for ${modelName}:`, result.reason);
			}
		});
	} catch (error) {
		console.error('Error syncing indexes:', error);
	}
}