import { HttpError } from '#/utils/HttpError';
import { verifyToken } from '$/services/jwt.service';
import type { NextFunction, Request, Response } from 'express';

export const authMiddlewareFactory =
	() => (req: Request, _: Response, next: NextFunction) => {
		const _token =
			req.cookies?.['token'] ?? req.headers?.authorization?.split(' ')?.[1];

		(req as any).user = verifyToken(_token).orElseThrow(
			HttpError.forbidden('Token is invalid or expired'),
		);

		next();
	};
