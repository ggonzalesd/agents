import http from 'node:http';
import * as RAPIER from '@dimforge/rapier3d-compat';

import { applyHttpApplication } from '$/http.app';
import { applyColyseusApplication } from '$/colyseus.app';

import envConfig from '$/config/env.config';

import sql, { checkDbConnection } from './config/db.config';
import { superAdminSeed } from './scripts/super-admin.seed';

import { checkServerListen } from './utils/server.utils';

import * as SQL from '$/utils/sql';

async function main() {
	await checkDbConnection();
	await superAdminSeed();

	await RAPIER.init();

	SQL.findOne(
		{
			table: 'User',
			data: { username: 'superadminxd' },
		},
		sql,
	).then((user) => {
		console.log('User:', user?.username);
	});

	const server = http.createServer();

	applyHttpApplication(server);
	applyColyseusApplication(server);

	await checkServerListen(server, envConfig.PORT);
}

main();
