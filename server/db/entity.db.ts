import { Option } from '#/utils/Option';
import type { EntityDB } from '$/models/Entity.model';

import * as SQL from '$/utils/sql.utils';
import { AGENT_TABLE_NAME } from './agent.db';

const ENTITY_TABLE_NAME = 'Entity';

// * Get entity by ID
type GetEntityById = SQL.InferSqlBuilder<{ id: string }, Option<EntityDB>>;

export const getEntityById: GetEntityById = SQL.sqlBuilder(({ id }, sql) =>
	SQL.selectByProperty<EntityDB, string>(
		{
			table: ENTITY_TABLE_NAME,
			property: 'id',
			value: id,
		},
		sql,
	).then(Option.of),
);

// * Create entity
type CreateEntityType = SQL.InferSqlBuilder<
	{
		id: string;
		life: number;
		maxLife: number;
		saturation: number;
		maxSaturation: number;
	},
	Option<EntityDB>
>;

export const createEntity: CreateEntityType = SQL.sqlBuilder(
	async ({ id, life, maxLife, saturation, maxSaturation }, sql) => {
		const result = await sql<
			EntityDB[]
		>`INSERT INTO ${sql(ENTITY_TABLE_NAME)} ("id", "life", "maxLife", "saturation", "maxSaturation") VALUES (${id}, ${life}, ${maxLife}, ${saturation}, ${maxSaturation}) RETURNING *`;

		return Option.of(result[0]);
	},
);

// * Save entity
type SaveEntityType = SQL.InferSqlBuilder<
	{
		identifier: string;
		data: Pick<EntityDB, 'life' | 'saturation'>;
	},
	Option<EntityDB>
>;

export const saveEntity: SaveEntityType = SQL.sqlBuilder(
	async ({ identifier, data }, sql) => {
		const setObject = sql(data, 'life', 'saturation');

		const result = await sql<EntityDB[]>`
		UPDATE ${sql(ENTITY_TABLE_NAME)}
		SET ${setObject}
		WHERE "id" in (
			SELECT "id" FROM ${sql(AGENT_TABLE_NAME)} WHERE "identifier" = ${identifier} LIMIT 1
		)
		RETURNING *`;

		return Option.of(result[0]);
	},
);
