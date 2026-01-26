import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema({
	userId: mongoose.Schema.Types.ObjectId,
	refreshToken: String,      // только refresh токен
	expiresAt: Date,
	ip: { type: String, required: false },
	userAgent: { type: String, required: false },
}, {
	timestamps: true
});

// Автоудаление старых токенов
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TokenModel = mongoose.model('Token', tokenSchema);