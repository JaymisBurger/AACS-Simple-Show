import { Router } from 'express';
import { publicShowMap, publicShowMapImage, publicVendorDirectory } from '../controllers/eventDayController.js';

const router = Router();

router.get('/shows/:token/map', publicShowMap);
router.get('/shows/:token/map/image', publicShowMapImage);
router.get('/shows/:token/vendors', publicVendorDirectory);

export default router;
