import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		minlength: 2,
		maxlength: 100
	},

	url: {
		type: String,
		required: false,
	},

	description: {
		type: String,
		required: false,
		minlength: 10,
		maxlength: 2000
	},

	promotionText: {
		type: String,
		maxlength: 500
	},

	categories: [{
		type: String,
		required: false
	}],

	isCustom: {
		type: Boolean,
		default: false
	},
	authorId: {
		type: String,
		required: false,
	},
	refs: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Ref'
	}]
}, {
	timestamps: true
});


// Автодобавление https:// к URL
companySchema.pre('save', function () {
	if (this.url && !this.url.startsWith('http')) {
		this.url = `https://${this.url}`;
	}
});

// Виртуальное поле refsCount (альтернатива массиву)
companySchema.virtual('refsCount', {
	ref: 'Ref',
	localField: '_id',
	foreignField: 'company',
	count: true
});

// Виртуальное поле id
companySchema.virtual('id').get(function () {
	return this._id.toString();
});

// Виртуальное поле refsCount (будет считаться из Ref модели)
companySchema.virtual('refsCount', {
	ref: 'Ref',
	localField: '_id',
	foreignField: 'company',
	count: true
});

export const CompanyModel = mongoose.model('Company', companySchema);