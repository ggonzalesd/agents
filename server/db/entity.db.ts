import { Option } from '#/utils/Option';
import { sqlBuilder, type InferSqlBuilder } from '$/config/db.config';
import type { EntityDB } from '$/models/Entity.model';
import { selectOneByPropery } from './common.db';

const ENTITY_TABLE_NAME = 'Entity';

// * Get entity by ID
type GetEntityById = InferSqlBuilder<{ id: string }, Option<EntityDB>>;

export const getEntityById: GetEntityById = sqlBuilder(async ({ id }, sql) => {
	const entity = await selectOneByPropery<EntityDB, string>(
		{
			table: ENTITY_TABLE_NAME,
			property: 'id',
			value: id,
		},
		sql,
	);

	if (!entity) {
		return Option.none();
	}

	return Option.some(entity);
});

// * Create entity
type CreateEntityType = InferSqlBuilder<
	{
		id: string;
		life: number;
		maxLife: number;
		saturation: number;
		maxSaturation: number;
	},
	Option<EntityDB>
>;

export const createEntity: CreateEntityType = sqlBuilder(
	async ({ id, life, maxLife, saturation, maxSaturation }, sql) => {
		const result = await sql<
			EntityDB[]
		>`INSERT INTO ${sql(ENTITY_TABLE_NAME)} ("id", "life", "maxLife", "saturation", "maxSaturation") VALUES (${id}, ${life}, ${maxLife}, ${saturation}, ${maxSaturation}) RETURNING *`;

		return Option.of(result[0]);
	},
);
