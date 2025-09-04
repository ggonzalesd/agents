import { HttpError } from '#/utils/HttpError';
import type { NextFunction, Request, Response } from 'express';

export const fileSignatureMiddelware =
	(signature: Buffer) => (req: Request, _: Response, next: NextFunction) => {
		const fileSignature = req.file!.buffer.subarray(0, 4);

		if (!fileSignature.equals(signature)) {
			throw HttpError.badRequest('File must be a PNG image');
		}

		next();
	};
