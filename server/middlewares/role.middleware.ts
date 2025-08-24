import { HttpError } from '#/utils/HttpError';
import type { AuthPayload } from '$/models/Payload.model';
import type { NextFunction, Request, Response } from 'express';

export const roleMiddleware =
	(...roles: ('ADMIN' | 'USER' | 'MOD')[]) =>
	(req: Request, _: Response, next: NextFunction) => {
		const user = (req as any).user as AuthPayload;

		if (!roles.length) {
			return next();
		}

		if (!user || !roles.some((role) => user.roles.includes(role))) {
			throw HttpError.forbidden(
				`Access only allowed for roles: ${roles.join(', ')}`,
			);
		}

		next();
	};
