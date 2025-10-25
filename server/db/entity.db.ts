import { Option } from '#/utils/Option';
import type { EntityDB } from '$/models/Entity.model';

import * as SQL from '$/utils/sql.utils';

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
