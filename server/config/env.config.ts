import { z } from 'zod';

const schema = z.object({
	PORT: z.coerce.number().min(1024).max(65535).default(3000),
	NODE_ENV: z.enum(['development', 'production']).default('development'),
	// DATABASE_URL: z.url(),
	// JWT_SECRET: z.string().min(10).max(100),
});

const env = schema.parse(process.env);

export default env;
