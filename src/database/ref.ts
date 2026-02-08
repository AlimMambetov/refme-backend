import mongoose from 'mongoose';
const requiredString = { type: String, required: true };
const defaultNumber = { type: Number, default: 0 };

const objectIdRef = (ref: string): mongoose.SchemaDefinitionProperty => ({
	type: mongoose.Schema.Types.ObjectId, ref, required: true
});

const calculateExpiryDate = (
	days: number = 90,
	baseDate: Date = new Date()
): Date => new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

const getDocumentExpiry = function (this: any) {
	const expiryRules = {
		'link': 30,
		'code': 60,
		'job-offer': 180
	};
	const days = this.type ? expiryRules[this.type as keyof typeof expiryRules] || 90 : 90;
	const startDate = this.createdAt || new Date();
	return calculateExpiryDate(days, startDate);
};

const refSchema = new mongoose.Schema({
	title: { ...requiredString, minlength: 3, maxlength: 200 },
	description: { type: String, maxlength: 5000 },
	benefits: [String],
	termsOfUse: [String],

	type: { ...requiredString, enum: ['link', 'code', 'job-offer'] },
	value: { ...requiredString, maxlength: 5000 },
	status: { type: String, enum: ['draft', 'review', 'rejected', 'posted'], default: 'draft' },

	author: objectIdRef('User'),
	company: objectIdRef('Company'),
	clicks: defaultNumber,
	likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
	dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
	expiresAt: {
		type: Date,
		default: getDocumentExpiry,
		index: { expires: 0 }
	},
	isVisible: { type: Boolean, default: true },
	isArchived: { type: Boolean, default: false },
	message: String,
}, { timestamps: true });



// Валидация URL для типа link
refSchema.pre('save', function () {
	if (this.type === 'link') {
		const urlRegex = /^(https?:\/\/)/;
		if (!urlRegex.test(this.value)) {
			this.value = `https://${this.value}`;
		}
	}
});

// Виртуальное поле id
refSchema.virtual('id').get(function () {
	return this._id.toString();
});


// Виртуальные ссылки на жалобы
refSchema.virtual('reports', {
	ref: 'Report',
	localField: '_id',
	foreignField: 'ref'
});

// Автоудаление старых рефералов
refSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefModel = mongoose.model('Ref', refSchema);