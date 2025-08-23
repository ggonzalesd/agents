import { ServerError } from 'colyseus';
import type { NextFunction, Request, Response } from 'express';

import { treeifyError, ZodError } from 'zod';

export const errorHandlerFactory =
	() => (err: unknown, _: Request, res: Response, __: NextFunction) => {
		if (err instanceof SyntaxError) {
			res.status(400).json({
				ok: false,
				message: 'Invalid JSON',
				data: null,
			});
			return;
		}

		if (err instanceof ZodError) {
			res.status(400).json({
				ok: false,
				message: 'Validation error',
				data: treeifyError(err),
			});
			return;
		}

		if (err instanceof ServerError) {
			res.status(err.code).json({
				ok: false,
				message: err.message,
				data: null,
			});
			return;
		}

		if (err instanceof Error) {
			res.status(500).json({
				ok: false,
				message: err.message,
				data: null,
			});
			return;
		}

		if (typeof err === 'string') {
			res.status(500).json({
				ok: false,
				message: err,
				data: null,
			});
			return;
		}

		res.status(500).json({
			ok: false,
			message: 'Internal Server Error',
			data: null,
		});
	};
