import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { UserModel } from '../database/user';
import { Request } from 'express';
import fs from 'fs';
import path from 'path';
// import { Profile } from 'passport-google-oauth20';
// import { VerifyCallback } from 'passport-oauth2';


export interface IProviderAccount {
	provider: 'google' | 'apple';
	providerId: string; // sub или user id от провайдера
	email?: string;     // email с которым входил через провайдера
	isPrivateEmail?: boolean;	// Для Apple могут понадобиться дополнительные поля
}



const {
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	GOOGLE_CALLBACK_URL,
} = process.env;

// Сериализация пользователя
passport.serializeUser((user: any, done) => {
	done(null, user.id);
});

// Десериализация пользователя
passport.deserializeUser(async (id, done) => {
	try {
		const user = await UserModel.findById(id);
		done(null, user);
	} catch (err) {
		done(err);
	}
});



// Google Strategy
passport.use(new GoogleStrategy({
	clientID: GOOGLE_CLIENT_ID!,
	clientSecret: GOOGLE_CLIENT_SECRET!,
	callbackURL: GOOGLE_CALLBACK_URL!,
	passReqToCallback: true, // 👈 ОБЯЗАТЕЛЬНО
}, async (req: Request, _accessToken, _refreshToken, profile, done) => {
	try {
		const googleAccount: IProviderAccount = {
			provider: 'google',
			providerId: profile.id,
			email: profile.emails?.[0].value,
		};

		// Если пользователь уже вошёл — просто добавляем ему провайдер
		if (req.user) {
			const user = await UserModel.findById(req.user?._id);

			const alreadyLinked = user?.providerAccounts.some(
				acc => acc.provider === 'google' && acc.providerId === profile.id
			);

			if (!alreadyLinked) {
				user?.providerAccounts.push(googleAccount);
				await user?.save();
			}

			return done(null, user as Express.User);
		}

		// Ищем по Google ID
		const user = await UserModel.findOne({
			providerAccounts: {
				$elemMatch: {
					provider: 'google',
					providerId: profile.id
				}
			}
		});

		if (user) return done(null, user);

		// Иначе создаём нового пользователя
		const newUser = await UserModel.create({
			email: profile.emails?.[0].value,
			name: profile.displayName,
			avatar: profile.photos?.[0].value,
			providerAccounts: [googleAccount],
			emailVerified: true,
		});

		return done(null, newUser);
	} catch (err) {
		return done(err);
	}
}));


