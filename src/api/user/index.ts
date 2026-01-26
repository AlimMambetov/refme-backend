import { Router } from 'express';
import { authProtection } from '../../middleware';
import { profileData, profileDelete } from './profile.controller';

const router = Router();


router.get('/data', authProtection, profileData);
router.delete('/delete', authProtection, profileDelete);

export default router;
