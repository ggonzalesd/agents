import express from 'express';
import multer from 'multer';

import { authMiddleware } from '$/middlewares/auth.middleware';
import { fileSignatureMiddelware } from '$/middlewares/file-signature.middleware';

import {
	getSkinController,
	getSkinStreamController,
	uploadSkinController,
} from '$/controllers/skin.controller';

const router = express.Router();

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 50 * 1024 }, // 50KB
});

router.put(
	'/upload',
	authMiddleware(),
	upload.single('file'),
	fileSignatureMiddelware(
		Buffer.from([0x89, 0x50, 0x4e, 0x47]), // READ First 4 bytes of PNG file
	),
	uploadSkinController,
);

router.get('/rand/:hash/:username.png', getSkinStreamController);
router.get('/:username.png', getSkinController);

export default router;
