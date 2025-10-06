import postgres from 'postgres';

import envConfig from './env.config';

const sql = postgres(envConfig.DB_URL, {
	max: 20,
	connect_timeout: 10,
	idle_timeout: 0,
	max_lifetime: 60 * 30,
});

export async function checkDbConnection() {
	try {
		await sql`SELECT 1`;
		console.log('Database connection successful');
	} catch (error) {
		console.error('Database connection failed:', error);
		process.exit(1);
	}
}

export default sql;
