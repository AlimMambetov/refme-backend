import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './user';
import companyRoutes from './companies';
import testRoutes from './test';
import refRoutes from './refs';

const router = Router();

router.use('/auth', authRoutes);
router.use('/profile', userRoutes);
router.use('/companies', companyRoutes);
router.use('/refs', refRoutes);
router.use('/test', testRoutes);

export default router;