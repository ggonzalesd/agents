import type { createServer } from 'node:http';

export const checkServerListen = async (
	server: ReturnType<typeof createServer>,
	port: number,
	attemptsLeft = 20,
) => {
	let attempts = attemptsLeft;

	while (attempts > 0) {
		try {
			console.log(`Starting server on port ${port}...`);

			const s = server.listen(port, () => {
				console.log(`Server is listening on port ${port}`);
			});

			// check error during startup
			await new Promise<void>((resolve, reject) => {
				s.on('listening', () => resolve());
				s.on('error', (err) => reject(err));
			});

			break;
		} catch (_error) {
			attempts--;
			console.log(
				`Server failed to start. Retrying... (${attempts} attempts left)`,
			);
			await new Promise((resolve) => setTimeout(resolve, 1000));
			if (attempts <= 0) {
				console.error('Max attempts reached. Server failed to start.');
				process.exit(1);
			}
		}
	}
};
