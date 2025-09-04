import type { Request, Response } from 'express';

import envConfig from '$/config/env.config';

import { S3BucketAdapter } from '$/services/s3.service';

import { getAuth } from '$/utils/req.utils';
import { HttpError } from '#/utils/HttpError';

const s3Service = new S3BucketAdapter();

export const uploadSkinController = async (req: Request, res: Response) => {
	const file = req.file!;
	const { user } = getAuth(req);

	await s3Service.uploadFile(
		`skins/${user.username}.png`,
		file.buffer,
		'image/png',
		{
			originalName: file.originalname,
		},
	);

	const signedUrl = await s3Service.getSignedUrl(
		`skins/${user.username}.png`,
		24 * 3600,
	); // 24 hours
	const url =
		envConfig.S3_URL + `/${envConfig.S3_NAME}/skins/${user.username}.png`;

	res.json({
		ok: true,
		message: 'Skin uploaded successfully',
		data: {
			url,
			signedUrl,
		},
	});
};

export const getSkinController = async (req: Request, res: Response) => {
	const username = req.params.username;

	if (typeof username !== 'string' || username.trim() === '') {
		throw HttpError.badRequest('Username is required');
	}

	const exists = await s3Service.exists(`skins/${username}.png`);
	const url = exists
		? envConfig.S3_URL + `/${envConfig.S3_NAME}/skins/${username}.png`
		: envConfig.CLIENT_URL + '/3d/gordon.png';

	// Redirect to the signed URL
	res.redirect(url);
};
