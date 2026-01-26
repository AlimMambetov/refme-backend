import { Request, Response } from 'express';
import { catchAsync } from "../../middleware";
import qs from 'qs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { UserModel } from '../../database';


export const authGoogle = catchAsync(async (req: Request, res: Response): Promise<void> => {
	const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
	const REDIRECT_URI = process.env.GOOGLE_CALLBACK_URL!;

	const returnTo = req.headers.referer || '/';
	const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + qs.stringify({
		client_id: CLIENT_ID,
		redirect_uri: REDIRECT_URI,
		response_type: 'code',
		scope: 'openid email profile',
		access_type: 'offline',
		prompt: 'consent',
		state: returnTo,
	});

	res.redirect(url);
});

export const callbackGoogle = catchAsync(async (req: Request, res: Response): Promise<any> => {
	const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
	const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
	const REDIRECT_URI = process.env.GOOGLE_CALLBACK_URL!;
	const JWT_SECRET = process.env.JWT_SECRET!;

	const { code, state } = req.query;
	if (!code) return res.status(400).send('Code not found');

	const { data: tokenData } = await axios.post('https://oauth2.googleapis.com/token', {
		code,
		client_id: CLIENT_ID,
		client_secret: CLIENT_SECRET,
		redirect_uri: REDIRECT_URI,
		grant_type: 'authorization_code',
	});

	const { data: userInfo } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
		headers: {
			Authorization: `Bearer ${tokenData.access_token}`,
		},
	});

	const googleId = userInfo.sub;
	const email = userInfo.email;
	const name = userInfo.name;
	const avatar = userInfo.picture;

	// Ищем пользователя по email
	let user = await UserModel.findOne({ email });

	if (!user) {
		// Создаем нового пользователя без пароля
		user = new UserModel({
			email,
			name,
			avatar,
			verifiedAt: new Date(), // Email от Google уже верифицирован
			// Пароль не устанавливаем - только OAuth вход
			googleId, // Сохраняем Google ID для будущих связей
		});
		await user.save();
	} else {
		// Если пользователь уже существует
		if (!user.verifiedAt) user.verifiedAt = new Date();
		// Обновляем имя и аватар, если их нет
		if (!user.username && name) user.username = name;
		if (!user.avatar && avatar) user.avatar = avatar;
		// Сохраняем Google ID для связывания аккаунтов
		if (!user.googleId) user.googleId = googleId;
		await user.save();
	}

	// Генерируем JWT
	const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

	// Устанавливаем токен в куки
	res.cookie('authToken', token, {
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
		path: '/',
	});

	// Редирект на фронтенд
	return res.redirect(state?.toString() || '/');
})

