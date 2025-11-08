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
		await new Promise((resolve) => setTimeout(resolve, 500));

		const npcs = [
			{
				id: '1',
				name: 'Guardia',
				description: 'NPC que protege la ciudad',
				identifier: 'guard_001',
				display: 'Guardia de la Ciudad',
				x: '10',
				y: '20',
				z: '30',
				skin: 'default',
			},
			{
				id: '2',
				name: 'Vendedor',
				description: 'NPC que vende objetos',
				identifier: 'vendor_001',
				display: 'Vendedor Ambulante',
				x: '15',
				y: '25',
				z: '35',
				skin: 'default',
			},
		];

		return res.status(200).json(
			jsonResponse.ok(npcs, {
				message: 'NPCs retrieved successfully',
				status: 200,
			}),
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
