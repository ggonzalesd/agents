import type { Helper, PendingQuery, Row, Sql, TransactionSql } from 'postgres';

import sql from '$/config/db.config';

/**
 * Ejecuta una transacción SQL.
 * @param t - Objeto de transacción o conexión SQL.
 * @param cb - Función callback que recibe el objeto de transacción SQL.
 * @returns Una promesa que resuelve con el resultado de la transacción.
 */
export function transaction<T>(
	t: TransactionSql | Sql,
	cb: (sql: Sql) => Promise<T>,
) {
	const wrappedCb = (tx: TransactionSql) => cb(tx as unknown as Sql);
	if ('savepoint' in t) {
		return t.savepoint(wrappedCb) as Promise<T>;
	}
	return t.begin(wrappedCb) as Promise<T>;
}

/**
 * Construye una consulta SQL utilizando un objeto de argumentos.
 * @param fn - Función que recibe los argumentos y el objeto SQL.
 * @returns Una función que recibe los argumentos y un objeto SQL opcional.
 */
export function sqlBuilder<P extends { [key: string]: unknown }, R>(
	fn: (args: P, sql: Sql) => Promise<R>,
) {
	return (args: P, __sql?: TransactionSql | Sql): Promise<R> =>
		fn({ ...args } as P, (__sql ?? sql) as Sql);
}

/**
 * Construye una cláusula WHERE para consultas SQL basándose en un objeto de datos.
 * @param data - Objeto que contiene las propiedades y valores para la cláusula WHERE.
 * @returns Una cláusula WHERE para consultas SQL.
 */
export function buildWhereClause<T extends { [key: string]: any }>(
	data: T,
	sql: Sql,
) {
	return Object.entries(data)
		.filter(([_, value]) => value !== undefined)
		.flatMap(([key, value], index, arr) => [
			sql`${sql(key)} = ${value as any}`,
			index < arr.length - 1 ? sql` AND ` : sql``,
		]);
}

/**
 * Tipo utilitario para inferir el tipo de retorno de una función sqlBuilder.
 */
export type InferSqlBuilder<
	P extends { [key: string]: unknown },
	R,
> = ReturnType<typeof sqlBuilder<P, R>>;

/**
 * Tipo reutilizable para cláusulas WHERE en consultas SQL.
 */
export type WhereClause<V> = (
	p: string,
	v: V,
	sql: Sql,
) => PendingQuery<Row[]> | Helper<string, []>;

/**
 * Tipo reutilizable para parámetros de selección básicos en consultas SQL.
 * @template V - Tipo del valor de la propiedad para la cláusula WHERE.
 */
export type BaseSelectParams<V> = {
	table: string;
	property: string;
	value: V;
	where?: WhereClause<V>;
};
