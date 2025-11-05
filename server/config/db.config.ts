import postgres from 'postgres';

import envConfig from './env.config';

const sql = postgres(envConfig.DB_URL, {
	max: 20,
	connect_timeout: 10,
	idle_timeout: 0,
	max_lifetime: 60 * 30,
	debug: (conn, query) => {
		if (envConfig.NODE_ENV === 'development') {
			console.log(
				`\n\u001b[38;5;208m[SQL:${conn}] \u001b[33m${query}\n\u001b[0m`,
			);
		}
	},
});

export async function checkDbConnection() {
	let attempts = 20;
	while (attempts > 0) {
		try {
			console.log('Checking database connection...');
			await sql`SELECT 1`;
			console.log('Database connection successful');
			break;
		} catch (error) {
			attempts -= 1;

			if (attempts > 0) {
				console.warn(
					`Database connection failed. Retrying... (${attempts} attempts left)`,
				);
				await new Promise((resolve) => setTimeout(resolve, 1000));
				continue;
			}

			console.error('Database connection failed:', error);
			process.exit(1);
		}
	}

	// Gracefully close the database connection on process termination
	process.on('SIGINT', async () => {
		await sql.end({ timeout: 5 });
		console.log('Database connection closed');
		process.exit(0);
	});
}

export default sql;
