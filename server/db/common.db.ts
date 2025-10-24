import type { Sql, PendingQuery, Row, Helper } from 'postgres';

export const selectOneByPropery = <T extends object, V>(
	{
		property,
		table,
		value,
		where,
	}: {
		table: string;
		property: string;
		value: V;
		where?: (
			p: string,
			v: V,
			sql: Sql,
		) => PendingQuery<Row[]> | Helper<string, []>;
	},
	sql: Sql,
) => {
	if (!where) {
		where = (p, v, sql) => sql`${sql(p)} = ${v as any}`;
	}

	return sql`SELECT * FROM ${sql(table)} WHERE ${where(property, value, sql)} LIMIT 1`.then(
		(rows) => rows[0] as T | undefined,
	);
};
