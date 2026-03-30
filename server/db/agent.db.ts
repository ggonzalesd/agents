import { metadataSchema } from '#/schema/utils.schema';
import { Option } from '#/utils/Option';

import type { AgentDB } from '$/models/Agent.model';
import prisma from '$/config/prisma.config';
import type { PrismaTransactionClient } from '$/config/prisma.config';
import type { Prisma } from '$/generated/prisma/client';

function applyMetadataParsing(agent: {
	metadata: string | { [key: string]: unknown };
}) {
	if (agent == null) return;

	const metadataSafe = metadataSchema.safeParse(agent.metadata);
	agent.metadata = metadataSafe.success ? metadataSafe.data : {};
}

export const AGENT_TABLE_NAME = 'Agent';

// * Get agent by Identifier
export const getAgentByIdentifier = async (
	{ identifier }: { identifier: string },
	tx?: PrismaTransactionClient,
): Promise<Option<AgentDB>> => {
	const db = tx ?? prisma;
	const agent = await db.agent.findUnique({ where: { identifier } });
	if (!agent) return Option.none();
	applyMetadataParsing(agent as unknown as AgentDB);
	return Option.some(agent as unknown as AgentDB);
};

// * Get agent by ID
export const getAgentById = async (
	{ id }: { id: string },
	tx?: PrismaTransactionClient,
): Promise<Option<AgentDB>> => {
	const db = tx ?? prisma;
	const agent = await db.agent.findUnique({ where: { id } });
	if (!agent) return Option.none();
	applyMetadataParsing(agent as unknown as AgentDB);
	return Option.some(agent as unknown as AgentDB);
};

// * Create agent
export const createAgent = async (
	props: Omit<AgentDB, 'id' | 'createdAt'>,
	tx?: PrismaTransactionClient,
): Promise<Option<AgentDB>> => {
	const db = tx ?? prisma;
	const agent = await db.agent.create({
		data: {
			display: props.display,
			identifier: props.identifier,
			positionX: props.positionX,
			positionY: props.positionY,
			positionZ: props.positionZ,
			rotation: props.rotation,
			metadata: props.metadata as unknown as Prisma.InputJsonValue,
		},
	});
	applyMetadataParsing(agent as unknown as AgentDB);
	return Option.some(agent as unknown as AgentDB);
};

// * Save agent
export const saveAgent = async (
	{
		identifier,
		data,
	}: {
		identifier: string;
		data: Pick<AgentDB, 'positionX' | 'positionY' | 'positionZ' | 'metadata'>;
	},
	tx?: PrismaTransactionClient,
): Promise<Option<AgentDB>> => {
	const db = tx ?? prisma;

	const existing = await db.agent.findUnique({ where: { identifier } });
	if (!existing) return Option.none();

	const agent = await db.agent.update({
		where: { identifier },
		data: {
			positionX: data.positionX,
			positionY: data.positionY,
			positionZ: data.positionZ,
			metadata: data.metadata as unknown as Prisma.InputJsonValue,
		},
	});
	applyMetadataParsing(agent as unknown as AgentDB);
	return Option.some(agent as unknown as AgentDB);
};
