import { z } from 'zod';

const schema = z
	.object({
		PORT: z.coerce.number().min(1024).max(65535).default(3000),
		NODE_ENV: z.enum(['development', 'production']).default('development'),
		JWT_SECRET: z.string().min(10).max(100),

		CORS_ORIGINS: z.string().default('http://localhost:5173'),

		CLIENT_URL: z.string(),

		DB_PROTOCOL: z.string().default('postgres'),
		DB_HOST: z.string().default('localhost'),
		DB_PORT: z.coerce.number().min(1024).max(65535).default(5432),
		DB_USER: z.string().default('user'),
		DB_PASSWORD: z.string().default('password'),
		DB_NAME: z.string().default('database'),

		S3_ACCESS_KEY: z.string(),
		S3_SECRET_KEY: z.string(),
		S3_NAME: z.string(),
		S3_REGION: z.string(),
		S3_URL: z.string(),
		S3_PORT: z.coerce.number().min(1024).max(65535).default(9000),
		S3_CONSOLE_PORT: z.coerce.number().min(1024).max(65535).default(9001),
	})
	.transform((val) => {
		const DB_URL = `${val.DB_PROTOCOL}://${val.DB_USER}:${val.DB_PASSWORD}@${val.DB_HOST}:${val.DB_PORT}/${val.DB_NAME}`;
		return { ...val, DB_URL };
	});

const env = schema.parse(process.env);

export default env;
