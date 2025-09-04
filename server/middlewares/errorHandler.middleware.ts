import type { NextFunction, Request, Response } from 'express';
import { ServerError } from 'colyseus';

import { treeifyError, ZodError } from 'zod';

import { HttpError } from '#/utils/HttpError';
import { jsonResponse } from '#/utils/HttpResponse';
import { MulterError } from 'multer';

export const errorHandlerFactory =
	() => (err: unknown, _: Request, res: Response, __: NextFunction) => {
		if (err instanceof HttpError) {
			res.status(err.status).json(
				jsonResponse.error(err.message, {
					data: err.data,
					status: err.status,
				}),
			);
			return;
		}

		if (err instanceof MulterError) {
			res.status(400).json(
				jsonResponse.error(err.message, {
					status: 400,
				}),
			);
			return;
		}

		if (err instanceof SyntaxError) {
			res.status(400).json(
				jsonResponse.error('Invalid JSON', {
					status: 400,
				}),
			);
			return;
		}

		if (err instanceof ZodError) {
			res.status(400).json(
				jsonResponse.error('Validation error', {
					status: 400,
					data: treeifyError(err),
				}),
			);
			return;
		}

		if (err instanceof ServerError) {
			const status = err.code >= 600 ? 500 : err.code;
			res.status(status).json(jsonResponse.error(err.message, { status }));
			return;
		}

		if (err instanceof Error) {
			res.status(500).json(jsonResponse.error(err.message));
			return;
		}

		if (typeof err === 'string') {
			res.status(500).json(jsonResponse.error(err));
			return;
		}

		res.status(500).json(jsonResponse.error('Internal Server Error'));
	};
