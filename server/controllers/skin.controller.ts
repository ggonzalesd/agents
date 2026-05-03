import * as crypto from 'node:crypto';
import type { Response, Request } from 'express';

import envConfig from '$/config/env.config';

import * as S3Service from '$/services/s3.service';

import { getAuth } from '$/utils/req.utils';
import { HttpError } from '#/utils/HttpError';
import { jsonResponse } from '#/utils/HttpResponse';
import { updateFullUser } from '$/db/user.db';

export const saveSkinController = async (req: Request, res: Response) => {
	const file = req.file!;

	const skinHash = crypto.randomUUID();

	await S3Service.uploadFile(`skins/${skinHash}.png`, file.buffer, 'image/png', {
		originalName: file.originalname,
	});

	const url = `${envConfig.S3_URL}/${envConfig.S3_NAME}/skins/${skinHash}.png`;

	res.json({
		ok: true,
		message: 'Skin saved successfully',
		data: {
			url,
			skinHash,
		},
	});
};

export const uploadSkinController = async (req: Request, res: Response) => {
	const file = req.file!;
	const { user } = getAuth(req);

	const skinHash = crypto.randomUUID();

	await S3Service.uploadFile(
		`skins/${skinHash}.png`,
		file.buffer,
		'image/png',
		{
			originalName: file.originalname,
		},
	);

	await updateFullUser({
		userId: user.id,
		user: { skin: skinHash },
	});

	const url = `${envConfig.S3_URL}/${envConfig.S3_NAME}/skins/${skinHash}.png`;

	res.json({
		ok: true,
		message: 'Skin uploaded successfully',
		data: {
			url,
			skinHash,
		},
	});
};

export const getSkinController = async (req: Request, res: Response) => {
	const username = req.params.username;

	if (typeof username !== 'string' || username.trim() === '') {
		throw HttpError.badRequest('Username is required');
	}

	const exists = await S3Service.exists(`skins/${username}.png`);
	const url = exists
		? `${envConfig.S3_URL}/${envConfig.S3_NAME}/skins/${username}.png`
		: `${envConfig.S3_URL}/${envConfig.S3_NAME}/skins/default.png`;

	// Redirect to the signed URL
	res.redirect(302, url);
};

export const getSkinStreamController = async (req: Request, res: Response) => {
	const username = req.params.username;

	if (typeof username !== 'string' || username.trim() === '') {
		throw HttpError.badRequest('Username is required');
	}

	const exists = await S3Service.exists(`skins/${username}.png`);

	if (!exists) {
		throw HttpError.notFound('Skin not found');
	}

	const buffer = await S3Service.getFile(`skins/${username}.png`);

	res.setHeader('Content-Type', 'image/png');

	res.end(buffer);
};

export const getExistsController = async (req: Request, res: Response) => {
	const username = req.params.username;

	if (typeof username !== 'string' || username.trim() === '') {
		throw HttpError.badRequest('Username is required');
	}

	const exists = await S3Service.exists(`skins/${username}.png`);

	if (!exists) {
		throw HttpError.notFound('Skin not found');
	}

	res.json(jsonResponse.ok({ exists }));
};
