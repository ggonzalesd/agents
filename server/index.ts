import http from 'node:http';
import * as RAPIER from '@dimforge/rapier3d-compat';

import { applyHttpApplication } from '$/http.app';
import { applyColyseusApplication } from '$/colyseus.app';

import envConfig from '$/config/env.config';

async function main() {
	await RAPIER.init();

	const server = http.createServer();

	applyHttpApplication(server);
	applyColyseusApplication(server);

	server.listen(envConfig.PORT, () => {
		console.log('Server is listening on port ' + envConfig.PORT);
	});
}

main();
