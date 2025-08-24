import type { Sql } from 'postgres';

import _sql from '$/config/db.config';

import type { RoleDB } from '$/models/Role.model';
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

	const _roles = await sql<
		RoleDB[]
	>`SELECT * FROM "Rol" WHERE "id" IN (SELECT "rolId" FROM "UserRol" WHERE "userId" = ${user.id})`;

	user.roles = _roles;

	return Option.some(user);
};
