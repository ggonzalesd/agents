import { PrismaClient, type Prisma } from '@prisma/client';
import envConfig from './env.config';

export type PrismaTransactionClient = Prisma.TransactionClient;

const prisma = new PrismaClient({
	log: envConfig.PRISMA_LOG
		? [
				{ emit: 'stdout', level: 'query' },
				{ emit: 'stdout', level: 'error' },
			]
		: [{ emit: 'stdout', level: 'error' }],
});

export async function checkDbConnection() {
	let attempts = 20;
	while (attempts > 0) {
		try {
			console.log('Checking database connection...');
			await prisma.$queryRaw`SELECT 1`;
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

	process.on('SIGINT', async () => {
		await prisma.$disconnect();
		console.log('Database connection closed');
		process.exit(0);
	});
}

export default prisma;
