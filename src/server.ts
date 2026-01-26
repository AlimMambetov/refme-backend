import dotenv from 'dotenv';
dotenv.config();
import { connectDB, createApp } from './config';

const PORT = process.env.PORT || 3000;

async function start() {
	await connectDB();
	const app = createApp();

	app.listen(PORT, async () => {
		console.log(`🎉 Server started successfully!`);
		console.log(`📍 Port: ${PORT}`);
		console.log(`🔗 URL: http://localhost:${PORT}`);
	});
}

start();
