import http from 'node:http';

import { applyHttpApplication } from '$/http.app';
import { applyColyseusApplication } from '$/colyseus.app';

import envConfig from '$/config/env.config';

async function main() {
	const server = http.createServer();

	applyHttpApplication(server);
	applyColyseusApplication(server);

	server.listen(envConfig.PORT, () => {
		console.log('Server is listening on port ' + envConfig.PORT);
	});
}

main();
