import { Request, Response } from 'express';
import { CompanyModel, RefModel, UserModel } from '../../database';
import { catchAsync } from '../../middleware';
import { AppError } from '../../utils';
import mongoose from 'mongoose';


export const getRefItem = catchAsync(async (req: Request, res: Response): Promise<Response> => {
	const { id } = req.params as any;

	const ref = await RefModel.findById(id)
		.populate('company', 'name logo')
		.populate('author', 'username')
		.lean();

	if (!ref) throw new AppError('Ref not found', 404);

	const transformedRef = {
		id: ref._id.toString(),
		...ref,
		likes: ref.likes.length,
		dislikes: ref.dislikes.length,
		_id: undefined,
		rating: (ref.likes.length || 0) - (ref.dislikes.length || 0)
	};

	return res.json({
		success: true,
		data: transformedRef
	});
});


export const getRefs = catchAsync(async (req: Request, res: Response): Promise<Response> => {
	const {
		page = 1,
		limit = 20,
		sort = '-createdAt',
		search,
		typeFilter,
		statusFilter,
		companyFilter,
		authorFilter
	} = req.query as any;

	const pageNum = Math.max(1, parseInt(page));
	const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
	const skip = (pageNum - 1) * limitNum;

	// Фильтры
	const query: any = {};
	if (typeFilter) query.type = typeFilter;
	if (statusFilter) query.status = statusFilter;
	else query.status = 'posted'; // по умолчанию только опубликованные

	if (companyFilter) query.company = companyFilter;
	if (authorFilter) query.author = authorFilter;
	if (search) query.title = { $regex: search, $options: 'i' };

	const total = await RefModel.countDocuments(query);

	const refs = await RefModel.find(query)
		.populate('company', 'name logo')
		.populate('author', 'username')
		.skip(skip)
		.limit(limitNum)
		.sort(sort === 'rating' ? { likes: -1 } : sort) // специальная сортировка для rating
		.lean();

	// Преобразуем
	const transformedRefs = refs.map(ref => ({
		id: ref._id.toString(),
		...ref,
		likes: ref.likes.length,
		dislikes: ref.dislikes.length,
		_id: undefined,
		rating: (ref.likes.length || 0) - (ref.dislikes.length || 0)
	}));

	return res.json({
		success: true,
		data: transformedRefs,
		meta: {
			total,
			page: pageNum,
			limit: limitNum,
			totalPages: Math.ceil(total / limitNum),
			hasNextPage: pageNum < Math.ceil(total / limitNum),
			hasPrevPage: pageNum > 1
		}
	});
});


export const createRef = catchAsync(async (req: Request, res: Response): Promise<any> => {
	const { _id: userId } = req.user as any;
	const author = await UserModel.findById(userId);
	if (!author) throw new AppError(404, 'User not found');
	const { title, benefits, termsOfUse, description, type, value, companyId } = req.body;
	const company = await CompanyModel.findById(companyId);
	if (!company) throw new AppError(404, 'Company not found');

	// await RefModel.updateMany(
	// 	{},
	// 	{
	// 		$set: {
	// 			likes: [],
	// 			dislikes: []
	// 		}
	// 	}
	// );

	const newRef = await RefModel.create({
		title,
		benefits,
		termsOfUse,
		type,
		value,
		author,
		company,
		description
	})

	newRef.save();


	company.refs.push(newRef._id);
	company.save();

	return res.status(201).json({
		success: true,
		message: 'Ref created successfully',
		data: {
			...newRef.toObject(),
			likes: newRef.likes.length,
			dislikes: newRef.dislikes.length,
		}
	});
});


export const updateRef = catchAsync(async (req: Request, res: Response): Promise<any> => {
	const { _id: userId } = req.user as any;
	const { id: refId } = req.params;
	const { title, benefits, termsOfUse, description } = req.body;
	const ref = await RefModel.findById(refId);
	if (!ref) throw new AppError(404, 'Ref not found');
	if (ref.author.toString() !== userId.toString()) throw new AppError(403, 'You can only update your own refs');

	if (title !== undefined) ref.title = title;
	if (description !== undefined) ref.description = description;
	if (benefits !== undefined) ref.benefits = benefits;
	if (termsOfUse !== undefined) ref.termsOfUse = termsOfUse;

	const updatedRef = await ref.save();

	return res.status(201).json({
		success: true,
		message: 'Ref created successfully',
		data: {
			...updatedRef.toObject(),
			likes: updatedRef.likes.length,
			dislikes: updatedRef.dislikes.length,
		}
	});
});

export const refAction = catchAsync(async (req: Request, res: Response): Promise<any> => {
	const { _id: userId } = req.user as any;
	const refId = req.params.id;
	const { action } = req.query as { action: 'like' | 'dislike' | 'click' | 'visible' | 'archive' };
	if (!action) throw new AppError(400, 'Action is required')

	const ref = await RefModel.findById(refId);
	if (!ref) throw new AppError(404, 'Ref not found');

	const user = await UserModel.findById(userId);
	if (!user) throw new AppError(404, 'User not found');

	const actions = {
		"like": () => handleLike(ref, user, ref._id),
		"dislike": () => handleDislike(ref, user, ref._id),
		"click": () => { ref.clicks += 1; },
		"visible": () => {
			if (ref.author.toString() !== userId.toString()) throw new AppError(403, 'Only author can change visibility');
			ref.isVisible = !ref.isVisible;
		},
		"archive": () => {
			if (ref.author.toString() !== userId.toString()) throw new AppError(403, 'Only author can archive');
			ref.isArchived = !ref.isArchived;
			if (ref.isArchived) ref.isVisible = false;
		},
	} as const;

	const actionFunc = actions[action];
	if (!actionFunc) throw new AppError(400, 'Invalid action. Use: like, dislike, click, visible, archive');
	actionFunc();
	await ref.save();

	if (action === 'like' || action === 'dislike') await user.save();

	const response = {
		likes: ref.likes.length,
		dislikes: ref.dislikes.length,
		clicks: ref.clicks,
		isVisible: ref.isVisible,
		isArchived: ref.isArchived,
	};

	return res.json({
		success: true,
		message: `${action} successful`,
		data: response
	});
});


function handleLike(ref: any, user: any, refId: mongoose.Types.ObjectId) {
	const userId = user._id;

	// Проверяем, что refId - ObjectId
	if (!mongoose.Types.ObjectId.isValid(refId)) {
		throw new Error('Invalid refId');
	}

	if (user.likes.includes(refId.toString())) {
		// Удаляем лайк
		user.likes = user.likes.filter((id: mongoose.Types.ObjectId) =>
			id.toString() !== refId.toString()
		);
		ref.likes = ref.likes.filter((id: mongoose.Types.ObjectId) =>
			id.toString() !== userId.toString()
		);
	} else {
		// Если есть дизлайк - удаляем его
		if (user.dislikes.includes(refId.toString())) {
			user.dislikes = user.dislikes.filter((id: mongoose.Types.ObjectId) =>
				id.toString() !== refId.toString()
			);
			ref.dislikes = ref.dislikes.filter((id: mongoose.Types.ObjectId) =>
				id.toString() !== userId.toString()
			);
		}

		// Добавляем лайк
		if (!user.likes) user.likes = [];
		user.likes.push(refId);

		if (!ref.likes) ref.likes = [];
		ref.likes.push(userId);
	}
}

function handleDislike(ref: any, user: any, refId: mongoose.Types.ObjectId) {
	const userId = user._id;

	// Проверяем, что refId - ObjectId
	if (!mongoose.Types.ObjectId.isValid(refId)) {
		throw new Error('Invalid refId');
	}

	if (user.dislikes.includes(refId.toString())) {
		// Удаляем дизлайк
		user.dislikes = user.dislikes.filter((id: mongoose.Types.ObjectId) =>
			id.toString() !== refId.toString()
		);
		ref.dislikes = ref.dislikes.filter((id: mongoose.Types.ObjectId) =>
			id.toString() !== userId.toString()
		);
	} else {
		// Если есть лайк - удаляем его
		if (user.likes.includes(refId.toString())) {
			user.likes = user.likes.filter((id: mongoose.Types.ObjectId) =>
				id.toString() !== refId.toString()
			);
			ref.likes = ref.likes.filter((id: mongoose.Types.ObjectId) =>
				id.toString() !== userId.toString()
			);
		}

		// Добавляем дизлайк
		if (!user.dislikes) user.dislikes = [];
		user.dislikes.push(refId);

		if (!ref.dislikes) ref.dislikes = [];
		ref.dislikes.push(userId);
	}
}


