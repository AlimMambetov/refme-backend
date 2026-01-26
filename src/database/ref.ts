import mongoose from 'mongoose';

const refSchema = new mongoose.Schema({
	title: {
		type: String,
		required: true,
		minlength: 3,
		maxlength: 200
	},

	benefits: [{
		type: String,
		required: true
	}],

	termsOfUse: [{
		type: String
	}],

	type: {
		type: String,
		required: true,
		enum: ['link', 'code', 'job-offer']
	},

	value: {
		type: String,
		required: true,
		maxlength: 5000
	},

	isVisible: {
		type: Boolean,
		default: true
	},

	status: {
		type: String,
		enum: ['draft', 'review', 'rejected', 'posted'],
		default: 'draft'
	},

	author: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},

	company: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Company',
		required: true
	},

	clicks: {
		type: Number,
		default: 0
	},

	likes: {
		type: Number,
		default: 0
	},

	dislikes: {
		type: Number,
		default: 0
	},

	datestemp: {
		type: Number,
		default: () => Math.floor(Date.now() / 1000)
	}
}, {
	timestamps: true
});

// Валидация URL для типа link
refSchema.pre('save', function (next: any) {
	if (this.type === 'link') {
		const urlRegex = /^(https?:\/\/)/;
		if (!urlRegex.test(this.value)) {
			this.value = `https://${this.value}`;
		}
	}
	next();
});

// Виртуальное поле id
refSchema.virtual('id').get(function () {
	return this._id.toString();
});

// Виртуальное поле rating
refSchema.virtual('rating').get(function () {
	return this.likes - this.dislikes;
});

// Виртуальные ссылки на жалобы
refSchema.virtual('reports', {
	ref: 'Report',
	localField: '_id',
	foreignField: 'ref'
});

export const RefModel = mongoose.model('Ref', refSchema);