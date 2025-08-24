import { HttpError } from '#/utils/HttpError';
import { verifyToken } from '$/services/jwt.service';
import { getUserByUsername } from '$/services/user.db';
import type { NextFunction, Request, Response } from 'express';

export const authMiddleware =
	() => async (req: Request, _: Response, next: NextFunction) => {
		const _token =
			req.cookies?.['token'] ?? req.headers?.authorization?.split(' ')?.[1];

		// Verify token
		const payload = verifyToken(_token).orElseThrow(
			HttpError.forbidden('Token is invalid or expired'),
		);

		// Get user from database
		const userOption = await getUserByUsername(payload.username);
		const user = userOption.orElseThrow(HttpError.notFound('User not found'));

		// Check if user hash matches
		if (user.hash !== payload.hash) {
			throw HttpError.forbidden('Token is invalid or expired');
		}

		// Attach user to request object
		(req as any).user = payload;

		next();
	};
