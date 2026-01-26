import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
	ref: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Ref',
		required: true
	},

	type: {
		type: String,
		required: true,
		enum: ['doesnt-work', 'spam', 'other']
	},

	description: {
		type: String,
		required: false, // не required по умолчанию
		maxlength: 1000,
		validate: {
			validator: function (value: string) {
				const type = this.type;
				// Если тип 'other' - description обязателен
				if (type === 'other') {
					return !!value && value.trim().length > 0;
				}
				return true; // для других типов не проверяем
			},
			message: 'Описание обязательно для типа "other"'
		}
	},

	reporter: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	},

	datestemp: {
		type: Number,
		default: () => Math.floor(Date.now() / 1000)
	},

	status: {
		type: String,
		enum: ['pending', 'reviewed', 'resolved'],
		default: 'pending'
	}
}, {
	timestamps: true
});

// Виртуальное поле id
reportSchema.virtual('id').get(function () {
	return this._id.toString();
});

// Виртуальное поле isAnonymous
reportSchema.virtual('isAnonymous').get(function () {
	return !this.reporter;
});

export const ReportModel = mongoose.model('Report', reportSchema);