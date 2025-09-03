import type { createServer } from 'node:http';
import { join } from 'node:path';

import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { errorHandlerFactory } from '$/middlewares/errorHandler.middleware';

import roomRoute from '$/routes/room.route';
import authRoute from '$/routes/auth.route';
import experimentalRoute from '$/routes/experimental.route';

export const applyHttpApplication = (
	server: ReturnType<typeof createServer>,
) => {
	const app = express();
	server.on('request', app);

	app.disable('x-powered-by');

	app.use(morgan('dev'));
	// TODO: CORS - Change Origin for production
	app.use(
		cors({
			origin: 'http://localhost:5173',
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		}),
	);
	app.use(cookieParser());
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	app.get('/health', (_, res) => {
		res.json({
			ok: true,
			message: 'Healthy',
			data: null,
		});
	});

	app.use(express.static(join(process.cwd(), 'dist')));

	const group = express.Router();
	{
		app.use('/api/v1', group);

		group.use('/room', roomRoute);
		group.use('/auth', authRoute);
		group.use('/experimental', experimentalRoute);
	}

	app.use((_, res) => {
		res.status(404).json({
			ok: false,
			message: 'Not found',
			data: null,
		});
	});

	app.use(errorHandlerFactory());
};
