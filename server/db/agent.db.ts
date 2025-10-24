import { metadataSchema } from '#/schema/utils.schema';
import { Option } from '#/utils/Option';

import { sqlBuilder, type InferSqlBuilder } from '$/config/db.config';
import type { AgentDB } from '$/models/Agent.model';
import { safeJSONParse } from '$/utils/transform.utils';
import { selectOneByPropery } from './common.db';

function applyMetadataParsing(agent: {
	metadata: string | { [key: string]: any };
}) {
	if (agent == null) {
		return;
	}

	const metadataSafe = metadataSchema.safeParse(safeJSONParse(agent.metadata));

	if (metadataSafe.success) {
		agent.metadata = metadataSafe.data;
	} else {
		agent.metadata = {};
	}
}

export const AGENT_TABLE_NAME = 'Agent';

// * Get agent by Identifier
type GetAgentByIdentifierType = InferSqlBuilder<
	{ identifier: string },
	Option<AgentDB>
>;

export const getAgentByIdentifier: GetAgentByIdentifierType = sqlBuilder(
	async ({ identifier }, sql) => {
		const agent = await selectOneByPropery<AgentDB, string>(
			{
				table: AGENT_TABLE_NAME,
				property: 'identifier',
				value: identifier,
			},
			sql,
		);

		if (!agent) {
			return Option.none();
		}

		applyMetadataParsing(agent);

		return Option.some(agent);
	},
);

// * Get agent by ID
type GetAgentByIdType = InferSqlBuilder<{ id: string }, Option<AgentDB>>;

export const getAgentById: GetAgentByIdType = sqlBuilder(
	async ({ id }, sql) => {
		const agent = await selectOneByPropery<AgentDB, string>(
			{
				table: AGENT_TABLE_NAME,
				property: 'id',
				value: id,
			},
			sql,
		);

		if (!agent) {
			return Option.none();
		}

		applyMetadataParsing(agent);

		return Option.some(agent);
	},
);

// * Create agent
type CreateAgentType = InferSqlBuilder<
	{
		identifier: string;
		display: string;
		positionX: number;
		positionY: number;
		positionZ: number;
		rotation: number;
		metadata: { [key: string]: any };
	},
	Option<AgentDB>
>;

export const createAgent: CreateAgentType = sqlBuilder(async (props, sql) => {
	const insertObject = sql(
		{
			...props,
			metadata: JSON.stringify(props.metadata),
		},
		'display',
		'identifier',
		'positionX',
		'positionY',
		'positionZ',
		'rotation',
		'metadata',
	);

	const result = await sql<AgentDB[]>`
		INSERT INTO ${sql(AGENT_TABLE_NAME)} ${insertObject}
		RETURNING *
	`;

	applyMetadataParsing(result[0]);

	return Option.of(result[0]);
});
