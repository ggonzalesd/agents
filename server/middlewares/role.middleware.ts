import { HttpError } from '#/utils/HttpError';
import { getAuth } from '$/utils/req.utils';
import type { NextFunction, Request, Response } from 'express';

export const roleMiddleware =
	(...roles: ('ADMIN' | 'USER' | 'MOD')[]) =>
	(req: Request, _: Response, next: NextFunction) => {
		const { payload } = getAuth(req);

		if (!roles.length) {
			return next();
		}

		if (!payload || !roles.some((role) => payload.roles.includes(role))) {
			throw HttpError.forbidden(
				`Access only allowed for roles: ${roles.join(', ')}`,
			);
		}

		next();
	};
