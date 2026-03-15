import { Option } from '#/utils/Option';
import type { Helper, PendingQuery, Row, Sql } from 'postgres';
import { buildWhereClause } from './basic-sql.utils';

export function insertIntoTable<T extends object>(
	table: string,
	data: Partial<T>,
	sql: Sql,
): Promise<Option<T>> {
	const record: Record<string, unknown> = {};

	for (const key in data) {
		if (data[key] !== undefined) {
			record[key] = data[key];
		}
	}

	return Option.future(
		sql<T[]>`
		INSERT INTO ${sql(table)} ${sql(record)}
		RETURNING *`.then((rows) => rows[0]),
	);
}

export function updateTable<T extends object>(
	{
		table,
		where,
		data,
		whereFn,
	}: {
		table: string;
		where: Partial<T>;
		data?: Partial<T>;
		whereFn?: (
			data: Partial<T>,
			sql: Sql,
		) => PendingQuery<Row[]> | Helper<string, []>;
	},
	sql: Sql,
): Promise<Option<T>> {
	if (!whereFn) {
		whereFn = (data, sql) => sql`${buildWhereClause(data, sql)}`;
	}

	const record: Record<string, unknown> = {};

	for (const key in data) {
		if (data[key] !== undefined) {
			record[key] = data[key];
		}
	}

	return Option.future(
		sql<T[]>`
		UPDATE ${sql(table)}
		SET ${sql(record)}
		${where ? sql`WHERE ${whereFn(where, sql)}` : sql`WHERE FALSE`}
		RETURNING *`.then((rows) => rows[0]),
	);
}
