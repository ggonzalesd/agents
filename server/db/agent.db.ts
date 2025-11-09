import { metadataSchema } from '#/schema/utils.schema';
import { Option } from '#/utils/Option';

import type { AgentDB } from '$/models/Agent.model';

import { safeJSONParse } from '$/utils/transform.utils';
import * as SQL from '$/utils/sql';

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
type GetAgentByIdentifierType = SQL.InferSqlBuilder<
	{ identifier: string },
	Option<AgentDB>
>;

export const getAgentByIdentifier: GetAgentByIdentifierType = SQL.sqlBuilder(
	({ identifier }, sql) =>
		Option.future(
			SQL.findOne<AgentDB>(
				{
					table: AGENT_TABLE_NAME,
					data: {
						identifier,
					},
				},
				sql,
			),
		).then((op) => op.ifSome(applyMetadataParsing)),
);

// * Get agent by ID
type GetAgentByIdType = SQL.InferSqlBuilder<{ id: string }, Option<AgentDB>>;

export const getAgentById: GetAgentByIdType = SQL.sqlBuilder(({ id }, sql) =>
	Option.future(
		SQL.findOne<AgentDB>(
			{
				table: AGENT_TABLE_NAME,
				data: {
					id,
				},
			},
			sql,
		),
	).then((op) => op.ifSome(applyMetadataParsing)),
);

// * Create agent
type CreateAgentType = SQL.InferSqlBuilder<
	Omit<AgentDB, 'id' | 'createdAt'>,
	Option<AgentDB>
>;

export const createAgent: CreateAgentType = SQL.sqlBuilder(
	async (props, sql) => {
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

		return Option.future(
			sql<AgentDB[]>`
		INSERT INTO ${sql(AGENT_TABLE_NAME)} ${insertObject}
		RETURNING *`,
		).then((op) => op.map((agents) => agents[0]).ifSome(applyMetadataParsing));
	},
);

// * Save agent
type SaveAgentType = SQL.InferSqlBuilder<
	{
		identifier: string;
		data: Pick<AgentDB, 'positionX' | 'positionY' | 'positionZ' | 'metadata'>;
	},
	Option<AgentDB>
>;

export const saveAgent: SaveAgentType = SQL.sqlBuilder(
	async ({ identifier, data }, sql) => {
		const updateObject = sql(
			{
				...data,
				metadata: JSON.stringify(data.metadata),
			},
			'positionX',
			'positionY',
			'positionZ',
			'metadata',
		);

		return Option.future(
			sql<AgentDB[]>`
		UPDATE ${sql(AGENT_TABLE_NAME)}
		SET ${updateObject}
		WHERE "identifier" = ${identifier}
		RETURNING *`,
		).then((op) => op.map((agents) => agents[0]).ifSome(applyMetadataParsing));
	},
);
