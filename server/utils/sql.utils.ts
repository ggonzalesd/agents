import { Option } from '#/utils/Option';
import sql from '$/config/db.config';
import type { Helper, PendingQuery, Row, Sql, TransactionSql } from 'postgres';

export function transaction<T>(
	t: TransactionSql | Sql,
	cb: (sql: TransactionSql) => Promise<T>,
) {
	const trx = 'savepoint' in t ? t.savepoint.bind(t) : t.begin.bind(t);
	return trx(cb);
}

export function sqlBuilder<P extends { [key: string]: unknown }, R>(
	fn: (args: P, sql: TransactionSql | Sql) => Promise<R>,
) {
	return (args: P, __sql?: TransactionSql | Sql): Promise<R> => {
		const _sql = __sql ?? sql;
		return fn({ ...args, sql: _sql } as P, sql);
	};
}

export type InferSqlBuilder<
	P extends { [key: string]: unknown },
	R,
> = ReturnType<typeof sqlBuilder<P, R>>;

// Tipos reutilizables
type WhereClause<V> = (
	p: string,
	v: V,
	sql: Sql,
) => PendingQuery<Row[]> | Helper<string, []>;

type BaseSelectParams<V> = {
	table: string;
	property: string;
	value: V;
	where?: WhereClause<V>;
};

// Overload signatures compactos
export function selectByProperty<T extends object, V>(
	params: BaseSelectParams<V> & { many: true },
	sql: Sql,
): Promise<T[]>;

export function selectByProperty<T extends object, V>(
	params: BaseSelectParams<V> & { many: false },
	sql: Sql,
): Promise<T | undefined>;

export function selectByProperty<T extends object, V>(
	params: BaseSelectParams<V> & { many?: boolean },
	sql: Sql,
): Promise<T | undefined>;

// Implementation
export function selectByProperty<T extends object, V>(
	{
		property,
		table,
		value,
		many = false, // Por defecto busca UNO (más común para selectByProperty)
		where,
	}: BaseSelectParams<V> & { many?: boolean },
	sql: Sql,
): Promise<T[] | T | undefined> {
	if (!where) {
		where = (p, v, sql) => sql`${sql(p)} = ${v as any}`;
	}

	if (many) {
		return sql<
			T[]
		>`SELECT * FROM ${sql(table)} WHERE ${where(property, value, sql)}`.then(
			(rows) => rows as T[],
		);
	} else {
		return sql`SELECT * FROM ${sql(table)} WHERE ${where(property, value, sql)} LIMIT 1`.then(
			(rows) => rows[0] as T | undefined,
		);
	}
}

export function insertIntoTable<T extends object>(
	table: string,
	data: Partial<T>,
	sql: TransactionSql | Sql,
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
