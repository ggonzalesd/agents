import type { Helper, PendingQuery, Row, Sql } from 'postgres';
import { buildWhereClause } from './basic-sql.utils';

// Select Many
export function findMany<V extends { [key: string]: any }>(
	{
		table,
		data,
		where,
		limit,
		offset,
	}: {
		table: string;
		data?: Partial<V>;
		where?: (
			data: Partial<V>,
			sql: Sql,
		) => PendingQuery<Row[]> | Helper<string, []>;
		limit?: number;
		offset?: number;
	},
	sql: Sql,
): Promise<V[]> {
	if (!where) {
		where = (data, sql) => sql`${buildWhereClause(data, sql)}`;
	}

	return sql<V[]>`SELECT * FROM ${sql(table)}
		${data ? sql`WHERE ${where(data, sql)}` : sql``}
		${limit !== undefined ? sql`LIMIT ${limit}` : sql``}
		${offset !== undefined ? sql` OFFSET ${offset}` : sql``}
	`.then((rows) => rows);
}

export function findOne<V extends { [key: string]: any }>(
	{
		table,
		data,
		where,
	}: {
		table: string;
		data: Partial<V>;
		where?: (
			data: Partial<V>,
			sql: Sql,
		) => PendingQuery<Row[]> | Helper<string, []>;
	},
	sql: Sql,
): Promise<V | null> {
	if (!where) {
		where = (data, sql) => sql`${buildWhereClause(data, sql)}`;
	}

	return sql<V[]>`SELECT * FROM ${sql(table)}
		WHERE ${where(data, sql)}
		LIMIT 1`.then((rows) => rows[0] ?? null);
}
