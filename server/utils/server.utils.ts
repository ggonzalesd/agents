import net from 'node:net';
import type { createServer } from 'node:http';

const checkPort = (port: number, host = '127.0.0.1') => {
	return new Promise<boolean>((resolve) => {
		const server = net.createServer();

		server.once('error', () => {
			resolve(false);
		});

		server.once('listening', () => {
			server.close();
		});

		server.on('close', () => {
			resolve(true);
		});

		server.listen(port, host);
	});
};

export const checkServerListen = async (
	server: ReturnType<typeof createServer>,
	port: number,
	attemptsLeft = 20,
) => {
	let attempts = attemptsLeft;

	do {
		console.log(`Checking port ${port}... Attempts left: ${attempts}`);
		attempts -= 1;

		const isFree = await checkPort(port);

		if (isFree) {
			break;
		}

		await new Promise((resolve) => setTimeout(resolve, 1000));
	} while (attempts > 0);

	server.listen(port, () => {
		console.log(`Server is listening on port ${port}`);
	});
};
