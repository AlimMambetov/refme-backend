import mongoose from 'mongoose';

const objectIdRef = (ref: string): mongoose.SchemaDefinitionProperty => ({
	type: mongoose.Schema.Types.ObjectId, ref, default: []
});

const userSchema = new mongoose.Schema({
	username: String,
	email: {
		type: String,
		required: true,
		unique: true,
		lowercase: true,
		match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
	},
	password: {
		type: String,
		required: false,
		minlength: 8,
		select: false
	},
	avatar: { type: String, default: 'default-avatar.png', },
	role: {
		type: String,
		enum: ['user', 'admin', 'moderator'],
		default: 'user'
	},
	googleId: { type: String, required: false, },
	isActive: { type: Boolean, default: true },
	likes: [objectIdRef('Ref')],
	dislikes: [objectIdRef('Ref')]
}, {
	timestamps: true
});

// Хук для хеширования пароля
userSchema.pre('save', async function () {
	if (!this.password || !this.isModified('password')) return;
	const bcrypt = await import('bcryptjs');
	const salt = await bcrypt.genSalt(10);
	this.password = await bcrypt.hash(this.password, salt);
});

// // Метод проверки пароля
userSchema.methods.comparePassword = async function (password: string) {
	const bcrypt = await import('bcryptjs');
	return await bcrypt.compare(password, this.password);
};

// // Виртуальное поле id
// userSchema.virtual('id').get(function () {
// 	return this._id.toString();
// });

// // Виртуальное поле isVerified
// userSchema.virtual('isVerified').get(function () {
// 	return !!this.verifiedAt;
// });

export const UserModel = mongoose.model('User', userSchema);