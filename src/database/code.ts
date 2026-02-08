import mongoose from 'mongoose';

const codeSchema = new mongoose.Schema({
	email: String,
	code: String,
	expiresAt: {
		type: Date,
		default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 минут
	},
	used: { type: Boolean, default: false }
}, {
	timestamps: true
});


codeSchema.pre('save', function () {
	// Проверяем, что поле used меняется с false на true
	if (this.isModified('used') && this.used === true) {
		// Продлеваем срок на 30 минут с момента использования
		this.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
	}
});

// Автоудаление старых кодов
codeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Поиск по userId + action + code
codeSchema.index({ userId: 1, action: 1, code: 1 });

export const CodeModel = mongoose.model('Code', codeSchema);