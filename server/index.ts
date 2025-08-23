import http from 'node:http';

import { applyHttpApplication } from '$/http.app';
import { applyColyseusApplication } from '$/colyseus.app';

async function main() {
	const server = http.createServer();

	applyHttpApplication(server);
	applyColyseusApplication(server);

	server.listen(3000, () => {
		console.log('Server is listening on port 3000');
	});
}

main();
