import { type createServer } from 'node:http';

import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';

import { MainRoom } from '$/game/main.room';

export const applyColyseusApplication = (
	server: ReturnType<typeof createServer>,
) => {
	const colyseus = new Server({
		transport: new WebSocketTransport({
			server,
		}),
	});

	colyseus.define('main-room', MainRoom);
};
