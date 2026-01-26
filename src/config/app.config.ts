import express from 'express';
import api from '../api';
import { errorHandler, notFoundHandler } from '../middleware';
import cookieParser from 'cookie-parser';
import cors from 'cors';

export function createApp() {
	const app = express();

	// Middleware
	app.use(cors({
		// origin: 'http://your-frontend-domain.com',
		credentials: true, // Важно для передачи кук
	}));
	app.use(cookieParser());
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	// Routes
	app.get('/', (req, res) => {
		res.json({
			message: '🚀 Server is running!',
			timestamp: new Date().toISOString(),
			endpoints: [
				// '/health',
				// '/api/users'
			]
		});
	});


	// Подключаем маршруты
	app.use('/api', api);

	// Error handling
	app.use(notFoundHandler);
	app.use(errorHandler);


	return app;
}