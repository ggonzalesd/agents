import type { createServer } from 'node:http';
import { join } from 'node:path';

import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { errorHandlerFactory } from '$/middlewares/errorHandler.middleware';

import roomRoute from '$/routes/room.route';
import authRoute from '$/routes/auth.route';
import skinRoute from '$/routes/skin.route';

import envConfig from '$/config/env.config';

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
			origin: envConfig.CORS_ORIGINS.split(','),
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
			message: 'Server is healthy',
			data: {
				timestamp: Date.now(),
				environment: envConfig.NODE_ENV,
			},
		});
	});

	app.use(express.static(join(process.cwd(), 'dist')));

	const group = express.Router();

	app.use('/api/v1', group);

	group.use('/room', roomRoute);
	group.use('/auth', authRoute);
	group.use('/skin', skinRoute);

	app.use((_, res) => {
		res.status(404).json({
			ok: false,
			message: 'Not found',
			data: null,
		});
	});

	app.use(errorHandlerFactory());
};
