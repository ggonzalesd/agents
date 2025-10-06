import type { Sql } from 'postgres';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

import _sql from '$/config/db.config';

import type { UserDB } from '$/models/user.model';

import { Option } from '#/utils/Option';

export const getUserByUsername = async (
	username: string,
	__sql?: Sql,
): Promise<Option<UserDB>> => {
	const sql = __sql ?? _sql;

	const _user = await sql<
		UserDB[]
	>`SELECT * FROM "User" WHERE "username" = ${username} LIMIT 1`;

	const user = _user[0];
	if (!user) {
		return Option.none();
	}

	return Option.some(user);
};

export const createUser = async (
	{
		username,
		password,
		display,
		role,
	}: {
		username: string;
		password: string;
		display?: string;
		role?: 'USER' | 'ADMIN' | 'MODERATOR';
	},
	__sql?: Sql,
) => {
	const sql = __sql ?? _sql;

	const hashedPassword = bcrypt.hashSync(password, 10);

	const result = await sql<
		UserDB[]
	>`INSERT INTO "User" ("display", "password", "username", "role") VALUES (${display || null}, ${hashedPassword}, ${username}, ${role || 'USER'}) RETURNING *`;

	return Option.of(result[0]);
};

export const revokeUserHash = async (
	id: string,
	withPassword?: string | undefined,
	__sql?: Sql,
) => {
	const sql = __sql ?? _sql;

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
};
