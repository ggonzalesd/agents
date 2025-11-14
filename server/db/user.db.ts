import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

import { Option } from '#/utils/Option';

import type { UserDB } from '$/models/user.model';

import * as SQL from '$/utils/sql';

const USER_TABLE_NAME = 'User';

// * Get user by username
type GetUserByUsernameType = SQL.InferSqlBuilder<
	{ username: string },
	Option<UserDB>
>;

export const getUserByUsername: GetUserByUsernameType = SQL.sqlBuilder(
	async ({ username }, sql) => {
		return SQL.findOne<UserDB>(
			{
				table: USER_TABLE_NAME,
				data: {
					username,
				},
			},
			sql,
		).then(Option.of);
	},
);

// * Create user
type CreateUserType = SQL.InferSqlBuilder<
	{
		username: string;
		password: string;
		display?: string;
		role?: 'USER' | 'ADMIN' | 'MODERATOR';
	},
	Option<UserDB>
>;

export const createUser: CreateUserType = SQL.sqlBuilder(
	async ({ username, password, display, role }, sql) => {
		const hashedPassword = bcrypt.hashSync(password, 10);

		const result = await sql<
			UserDB[]
		>`INSERT INTO "User" ("display", "password", "username", "role") VALUES (${display || null}, ${hashedPassword}, ${username}, ${role || 'USER'}) RETURNING *`;

		return Option.of(result[0]);
	},
);

// * Revoke user hash (and optionally password)
type RevokeUserHashType = SQL.InferSqlBuilder<
	{
		id: string;
		withPassword?: string | undefined;
	},
	Option<boolean>
>;

export const revokeUserHash: RevokeUserHashType = SQL.sqlBuilder(
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
