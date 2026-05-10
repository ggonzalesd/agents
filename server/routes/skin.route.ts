import express from 'express';
import multer from 'multer';

import * as AuthMiddleware from '$/middlewares/auth.middleware';
import * as RoleMiddleware from '$/middlewares/role.middleware';
import * as FileSignatureMiddleware from '$/middlewares/file-signature.middleware';
import * as SkinController from '$/controllers/skin.controller';

const router = express.Router();

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 50 * 1024 }, // 50KB
});

router.put(
	'/upload',
	AuthMiddleware.validateJwtToken(),
	upload.single('file'),
	FileSignatureMiddleware.fileSignature(
		Buffer.from([0x89, 0x50, 0x4e, 0x47]), // READ First 4 bytes of PNG file
	),
	SkinController.uploadSkinController,
);

router.post(
	'/save',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN'),
	upload.single('file'),
	FileSignatureMiddleware.fileSignature(
		Buffer.from([0x89, 0x50, 0x4e, 0x47]), // READ First 4 bytes of PNG file
	),
	SkinController.saveSkinController,
);

router.get('/head/:skinId/avatar.png', SkinController.getSkinAvatarController);

router.get('/rand/:hash/:username.png', SkinController.getSkinStreamController);

router.get('/:username.png', SkinController.getSkinController);

router.get('/exists/:username', SkinController.getExistsController);

export default router;
