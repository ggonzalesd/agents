import type { Request, Response } from 'express';
import type z from 'zod';

import { jsonResponse } from '#/utils/HttpResponse';
import type { createNpcRequestSchema } from '#/schema/npc.schema';

import * as NPCService from '$/services/npc.service';

export const getOneNPCController = async (
	req: Request<{ id: string }>,
	res: Response,
) => {
	const { id } = req.params;

	const npc = await NPCService.getOneNPC(id);

	res.status(200).json(
		jsonResponse.ok(
			{
				id: npc.npc.id,
				name: npc.agent.display,
				description: npc.npc.description,
				identifier: npc.agent.identifier,
				display: npc.agent.display,
				x: npc.agent.positionX.toString(),
				y: npc.agent.positionY.toString(),
				z: npc.agent.positionZ.toString(),
				skin: npc.npc.skinKey,
			},
			{
				message: 'NPC retrieved successfully',
				status: 200,
			},
		),
	);
};

export const getAllNPCsController = async (_req: Request, res: Response) => {
	const npcs = await NPCService.getAllNPCs();

	res.status(200).json(
		jsonResponse.ok(
			npcs.map(({ agent, npc }) => ({
				id: npc.id,
				name: agent.display,
				description: npc.description,
				identifier: agent.identifier,
				display: agent.display,
				x: agent.positionX.toString(),
				y: agent.positionY.toString(),
				z: agent.positionZ.toString(),
				skin: npc.skinKey,
			})),
			{
				message: 'All NPCs retrieved successfully',
				status: 200,
			},
		),
	);
};

export const createNPCController = async (req: Request, res: Response) => {
	const payload = req.body as z.infer<typeof createNpcRequestSchema>;

	const npc = await NPCService.createNPC({
		payload,
	});

	return res.status(201).json(
		jsonResponse.ok(npc, {
			message: 'NPC created successfully',
			status: 201,
		}),
	);
};

export const updateNPCController = async (
	req: Request<{ id: string }>,
	res: Response,
) => {
	const { id } = req.params;
	const payload = req.body as Partial<z.infer<typeof createNpcRequestSchema>>;

	const npc = await NPCService.updateNPC({
		npcId: id,
		payload,
	});

	return res.status(200).json(
		jsonResponse.ok(npc, {
			message: 'NPC updated successfully',
			status: 200,
		}),
	);
};
