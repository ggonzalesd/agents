import type { Sql } from 'postgres';

import _sql from '$/config/db.config';

// import type { UserDB } from '$/models/user.model';

// import { Option } from '#/utils/Option';
import type { WorldDB } from '$/models/world.model';

export const getWorlds = async (
	limit: number,
	offset: number,
	__sql?: Sql,
): Promise<WorldDB[]> => {
	const sql = __sql ?? _sql;

	const worlds = await sql<
		WorldDB[]
	>`SELECT * FROM "World" LIMIT ${limit} OFFSET ${offset}`;

	return worlds;
};
