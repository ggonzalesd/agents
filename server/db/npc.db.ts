import { Option } from '#/utils/Option';
import type { AgentDB } from '$/models/Agent.model';
import type { EntityDB } from '$/models/Entity.model';

import type { NPCDB } from '$/models/NPC.model';

import * as SQL from '$/utils/sql.utils';

type GetNPCByIdType = SQL.InferSqlBuilder<
	{
		npcId: string;
	},
	Option<NPCDB>
>;

export const getNPCById: GetNPCByIdType = SQL.sqlBuilder(
	async ({ npcId }, sql) => {
		const npc = await SQL.selectByProperty<NPCDB, string>(
			{
				table: 'NPC',
				property: 'id',
				value: npcId,
				many: false,
			},
			sql,
		);

		return Option.of(npc);
	},
);

type GetAllNPCsType = SQL.InferSqlBuilder<
	{ [key: string]: unknown },
	{
		npc: NPCDB;
		entity: EntityDB;
		agent: AgentDB;
	}[]
>;

export const getAllNPCs: GetAllNPCsType = SQL.sqlBuilder((_, sql) =>
	sql<
		{ npc: NPCDB; entity: EntityDB; agent: AgentDB }[]
	>`SELECT npc.id, row_to_json(npc) AS npc, row_to_json(e) as entity, row_to_json(a) as agent FROM "NPC" npc join "Entity" e on npc.id = e.id join "Agent" a on a.id = e.id`.then(
		(npcs) => {
			npcs.forEach((npc) => {
				npc.agent.createdAt = new Date(npc.agent.createdAt);
			});
			return npcs;
		},
	),
);
