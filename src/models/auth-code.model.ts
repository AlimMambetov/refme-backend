import { IAuthCode } from "@/types";
import mongoose, { Schema } from "mongoose";

const authCodeSchema = new Schema<IAuthCode>({
	user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	code: { type: String, required: true },
	expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL индекс
	purpose: {
		type: String,
		required: true,
		enum: ['registration', 'password_reset'], // ограничиваем возможные значения
		default: 'registration'
	},
});

export const AuthCodeModel = mongoose.model<IAuthCode>('auth-code', authCodeSchema);