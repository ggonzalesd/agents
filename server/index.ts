import http from 'node:http';
import * as RAPIER from '@dimforge/rapier3d-compat';

import { applyHttpApplication } from '$/http.app';
import { applyColyseusApplication } from '$/colyseus.app';

import envConfig from '$/config/env.config';
import { checkDbConnection } from './config/db.config';
import { superAdminSeed } from './scripts/super-admin.seed';
import { getExecutionArgs, getWorkerFile } from './utils/workers.utils';

import Piscina from 'piscina';
import { checkServerListen } from './utils/server.utils';

async function main() {
	const piscina = new Piscina<
		{ grid: number[][]; start: [number, number]; end: [number, number] },
		{ result: [number, number][] }
	>({
		filename: getWorkerFile('a-star'),
		execArgv: getExecutionArgs(),
		maxThreads: envConfig.WORKER_THREADS,
	});

	const grid = [
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
		[1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1],
		[1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	];

	piscina
		.run({
			grid,
			start: [1, 1],
			end: [14, 4],
		})
		.then((result) => {
			console.log('A* Pathfinding Result:', result);

			for (const [x, y] of result.result) {
				grid[y][x] = 2; // Mark path with a different number
			}

			for (let y = 0; y < grid.length; y++) {
				let row = '';
				for (let x = 0; x < grid[y].length; x++) {
					if (grid[y][x] === 0) {
						row += ' ';
					} else if (grid[y][x] === 1) {
						row += '#';
					} else {
						row += '.';
					}
				}
				console.log(row);
			}
		})
		.catch((err) => {
			console.error('A* Worker Error:', err);
		});

	await checkDbConnection();
	await superAdminSeed();

	await RAPIER.init();

	const server = http.createServer();

	applyHttpApplication(server);
	applyColyseusApplication(server);

	await checkServerListen(server, envConfig.PORT);
}

main();
