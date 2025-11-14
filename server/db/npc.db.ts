import { HttpError } from '#/utils/HttpError';
import { Option } from '#/utils/Option';
import type { AgentDB } from '$/models/Agent.model';
import type { EntityDB } from '$/models/Entity.model';

import type { NPCDB } from '$/models/NPC.model';

import * as SQL from '$/utils/sql';
import { AGENT_TABLE_NAME } from './agent.db';
import { ENTITY_TABLE_NAME } from './entity.db';

export const NPC_TABLE_NAME = 'NPC';

type GetNPCByIdType = SQL.InferSqlBuilder<
	{
		npcId: string;
	},
	Option<{
		npc: NPCDB;
		entity: EntityDB;
		agent: AgentDB;
	}>
>;

export const getNPCById: GetNPCByIdType = SQL.sqlBuilder(
	async ({ npcId }, sql) => {
		const npc = await sql<
			{ npc: NPCDB; entity: EntityDB; agent: AgentDB }[]
		>`SELECT npc.id, row_to_json(npc) AS npc, row_to_json(e) as entity, row_to_json(a) as agent FROM "NPC" npc join "Entity" e on npc.id = e.id join "Agent" a on a.id = e.id WHERE npc.id = ${npcId}`.then(
			(npcs) => {
				if (npcs.length === 0) {
					return null;
				}
				const npc = npcs[0];
				npc.agent.createdAt = new Date(npc.agent.createdAt);
				return npc;
			},
		);

		return Option.of(npc);
	},
);

type UpdateNPCType = SQL.InferSqlBuilder<
	{
		npcId: string;
		agent?: Partial<
			Omit<AgentDB, 'id' | 'rotation' | 'metadata' | 'createdAt'>
		>;
		entity?: Partial<Omit<EntityDB, 'id'>>;
		npc?: Partial<Omit<NPCDB, 'id'>>;
	},
	Option<{
		npc: NPCDB;
		entity: EntityDB;
		agent: AgentDB;
	}>
>;

export const updateNPC: UpdateNPCType = SQL.sqlBuilder(
	async ({ npcId, agent, entity, npc }, sql) => {
		return sql.begin(async (tx) => {
			// Validate Existence
			const existingNPC = await SQL.findOne<NPCDB>(
				{
					data: {
						id: npcId,
					},
					table: NPC_TABLE_NAME,
				},
				tx,
			);

			if (!existingNPC) {
				throw HttpError.notFound('NPC not found');
			}

			if (agent) {
				await SQL.updateTable<AgentDB>(
					{
						table: AGENT_TABLE_NAME,
						where: {
							id: npcId,
						},
						data: agent,
					},
					tx,
				);
			}

			if (entity) {
				await SQL.updateTable<EntityDB>(
					{
						table: ENTITY_TABLE_NAME,
						where: {
							id: npcId,
						},
						data: entity,
					},
					tx,
				);
			}

			if (npc) {
				await SQL.updateTable<NPCDB>(
					{
						table: NPC_TABLE_NAME,
						where: {
							id: npcId,
						},
						data: npc,
					},
					tx,
				);
			}

			const updatedNPC = await getNPCById({ npcId }, tx);

			return updatedNPC;
		});
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

type CreateNPCType = SQL.InferSqlBuilder<
	{
		npc: Omit<NPCDB, 'id'>;
		entity: Omit<EntityDB, 'id'>;
		agent: Omit<AgentDB, 'id' | 'rotation' | 'metadata' | 'createdAt'>;
	},
	Option<{
		npc: NPCDB;
		entity: EntityDB;
		agent: AgentDB;
	}>
>;

export const createNPC: CreateNPCType = SQL.sqlBuilder(
	async ({ npc, entity, agent }, sql) => {
		return sql.begin(async (tx) => {
			const createdAgentOp = await SQL.insertIntoTable<AgentDB>(
				'Agent',
				{
					...agent,
					rotation: 0,
					metadata: {},
				},
				tx,
			);
			if (createdAgentOp.isNone()) {
				return Option.none();
			}
			const createdAgent = createdAgentOp.unwrap();

			const createdEntityOp = await SQL.insertIntoTable<EntityDB>(
				'Entity',
				{
					...entity,
					id: createdAgent.id,
				},
				tx,
			);
			if (createdEntityOp.isNone()) {
				return Option.none();
			}
			const createdEntity = createdEntityOp.unwrap();

			const createdNPCOp = await SQL.insertIntoTable<NPCDB>(
				'NPC',
				{
					...npc,
					id: createdAgent.id,
				},
				tx,
			);
			if (createdNPCOp.isNone()) {
				return Option.none();
			}
			const createdNPC = createdNPCOp.unwrap();

			if (createdAgentOp.isNone()) {
				return Option.none();
			}

			return Option.of({
				npc: createdNPC,
				entity: createdEntity,
				agent: createdAgent,
			});
		});
	},
);
