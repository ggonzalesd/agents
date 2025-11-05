import type { NextFunction, Request, Response } from 'express';
import type { z } from 'zod';

export const parseWithSchema =
	(schema: z.ZodType<any>, source: 'body' | 'query' | 'params') =>
	(req: Request, _: Response, next: NextFunction) => {
		const result = schema.parse(req[source]);

		req[source] = result;

		next();
	};
