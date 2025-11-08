import type { z } from 'zod';

import * as NPCRepository from '$/db/npc.db';
import type { createNpcRequestSchema } from '#/schema/npc.schema';

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
			skinUrl: payload.skin,
		},
	});

	return npc.unwrap('Failed to create NPC');
};
