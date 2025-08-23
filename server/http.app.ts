import type { createServer } from 'node:http';
import { join } from 'node:path';

import express from 'express';

export const applyHttpApplication = (
	server: ReturnType<typeof createServer>,
) => {
	const app = express();
	server.on('request', app);

	app.disable('x-powered-by');

	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	// STATIC
	app.use(express.static(join(process.cwd(), 'dist')));
};
