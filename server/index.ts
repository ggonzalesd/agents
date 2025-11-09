import http from 'node:http';
import * as RAPIER from '@dimforge/rapier3d-compat';

import { applyHttpApplication } from '$/http.app';
import { applyColyseusApplication } from '$/colyseus.app';

import envConfig from '$/config/env.config';

import { checkDbConnection } from './config/db.config';
import { superAdminSeed } from './scripts/super-admin.seed';

import { checkServerListen } from './utils/server.utils';

async function main() {
	await checkDbConnection();
	await superAdminSeed();

	await RAPIER.init();

	const server = http.createServer();

	applyHttpApplication(server);
	applyColyseusApplication(server);

	await checkServerListen(server, envConfig.PORT);
}

main();
