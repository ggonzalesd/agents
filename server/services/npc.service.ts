import type { z } from 'zod';

import * as NPCRepository from '$/db/npc.db';
import type { createNpcRequestSchema } from '#/schema/npc.schema';
import { HttpError } from '#/utils/HttpError';

export const getOneNPC = async (npcId: string) => {
	const npc = await NPCRepository.getNPCById({ npcId });

	return npc.orElseThrow(() => HttpError.notFound('NPC not found'));
};

export const getAllNPCs = async () => {
	const npcs = await NPCRepository.getAllNPCs({});

	return npcs;
};

export const createNPC = async ({
	payload,
}: {
	payload: z.infer<typeof createNpcRequestSchema>;
}) => {
	const npc = await NPCRepository.createNPC({
		agent: {
			display: payload.display,
			identifier: payload.identifier,
			positionX: Number(payload.x),
			positionY: Number(payload.y),
			positionZ: Number(payload.z),
		},
		entity: {
			life: 100,
			maxLife: 100,
			maxSaturation: 100,
			saturation: 100,
		},
		npc: {
			description: payload.description ?? 'A mysterious NPC',
			model: 'gpt-4.1-mini',
					skinKey: payload.skin,
		},
	});

	return npc.unwrap('Failed to create NPC');
};

export const updateNPC = async ({
	npcId,
	payload,
}: {
	npcId: string;
	payload: Partial<z.infer<typeof createNpcRequestSchema>>;
}) => {
	const npc = await NPCRepository.updateNPC({
		npcId,
		agent:
			payload.display ||
			payload.identifier ||
			payload.x ||
			payload.y ||
			payload.z
				? {
						display: payload.display,
						identifier: payload.identifier,
						positionX: payload.x ? Number(payload.x) : undefined,
						positionY: payload.y ? Number(payload.y) : undefined,
						positionZ: payload.z ? Number(payload.z) : undefined,
					}
				: undefined,
		npc:
			payload.description || payload.skin
				? {
						description: payload.description,
		skinKey: payload.skin,
					}
				: undefined,
	});

	return npc.unwrap('Failed to update NPC');
};
