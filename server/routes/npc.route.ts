import { Router } from 'express';
import type z from 'zod';

import { createNpcRequestSchema } from '#/schema/npc.schema';
import { jsonResponse } from '#/utils/HttpResponse';

import * as AuthMiddleware from '$/middlewares/auth.middleware';
import * as RoleMiddleware from '$/middlewares/role.middleware';
import * as ParseMiddleware from '$/middlewares/parse.middleware';

import * as NPCService from '$/services/npc.service';

const router = Router();

router.get(
	'/',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN', 'MOD', 'USER'),
	async (_req, res) => {
		const npcs = await NPCService.getAllNPCs();

		return res.status(200).json(
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
					skin: npc.skinUrl,
				})),
				{
					message: 'All NPCs retrieved successfully',
					status: 200,
				},
			),
		);
	},
);

router.post(
	'/',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN', 'MOD'),
	ParseMiddleware.parseWithSchema(createNpcRequestSchema, 'body'),
	async (req, res) => {
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
	},
);

export default router;
