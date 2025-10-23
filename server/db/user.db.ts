import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

import { Option } from '#/utils/Option';

import { sqlBuilder } from '$/config/db.config';

import type { UserDB } from '$/models/user.model';

// * Get user by username
type GetUserByUsernameType = ReturnType<
	typeof sqlBuilder<{ username: string }, Option<UserDB>>
>;

export const getUserByUsername: GetUserByUsernameType = sqlBuilder(
	async ({ username }, sql) => {
		const _user = await sql<
			UserDB[]
		>`SELECT * FROM "User" WHERE "username" = ${username} LIMIT 1`;

		const user = _user[0];

		if (!user) {
			return Option.none();
		}

		return Option.some(user);
	},
);

// * Create user
type CreateUserType = ReturnType<
	typeof sqlBuilder<
		{
			username: string;
			password: string;
			display?: string;
			role?: 'USER' | 'ADMIN' | 'MODERATOR';
		},
		Option<UserDB>
	>
>;

export const createUser: CreateUserType = sqlBuilder(
	async ({ username, password, display, role }, sql) => {
		const hashedPassword = bcrypt.hashSync(password, 10);

		const result = await sql<
			UserDB[]
		>`INSERT INTO "User" ("display", "password", "username", "role") VALUES (${display || null}, ${hashedPassword}, ${username}, ${role || 'USER'}) RETURNING *`;

		return Option.of(result[0]);
	},
);

// * Revoke user hash (and optionally password)
type RevokeUserHashType = ReturnType<
	typeof sqlBuilder<
		{
			id: string;
			withPassword?: string | undefined;
		},
		Option<boolean>
	>
>;

export const revokeUserHash: RevokeUserHashType = sqlBuilder(
	async ({ id, withPassword }, sql) => {
		const _user = await sql`SELECT * FROM "User" WHERE "id" = ${id} LIMIT 1`;

		if (_user.length === 0) {
			return Option.none();
		}

		const columns = ['hash'];
		const data: Record<string, string> = {
			hash: uuidv4(),
		};

		if (withPassword) {
			data.password = bcrypt.hashSync(withPassword, 10);
			columns.push('password');
		}

		const result =
			await sql`UPDATE "User" SET ${sql(data, columns)} WHERE "id" = ${id} RETURNING *`;
		console.log({ result });

		return Option.some(true);
	},
);
