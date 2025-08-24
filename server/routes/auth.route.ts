import { Router } from 'express';

import * as bcrypt from 'bcrypt';

import sql from '$/config/db.config';

import { registerRequestSchema } from '#/schema/auth.schema';

const router = Router();

router.get('/', async (_, res) => {
	res.json({ message: 'Auth route works' });
});

router.post('/register', async (req, res) => {
	const {
		display,
		password: _pass,
		username,
	} = registerRequestSchema.parse(req.body);

	const result = await sql.begin(async (sql) => {
		const exists =
			await sql`SELECT 1 FROM "User" WHERE "username" = ${username} LIMIT 1`;

		if (exists.length) throw new Error('User already exists');

		const password = bcrypt.hashSync(_pass, 10);

		const result =
			await sql`INSERT INTO "User" ("display", "password", "username") VALUES (${display}, ${password}, ${username}) RETURNING *`;

		return result;
	});

	res
		.status(201)
		.json({ message: 'User registered successfully', data: result });
});

export default router;
