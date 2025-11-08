import { z } from 'zod';
import { apiResSchema } from '#/schema/api.schema';
import { agentDBSchema, entityDBSchema, npcDBSchema } from './db.schema';

export const createNpcRequestSchema = z.object({
	name: z.string().min(2).max(255),
	description: z.string().min(0).max(1024).optional(),
	identifier: z.string().min(2).max(255),
	display: z.string().min(2).max(255),
	x: z.string().min(1).max(255),
	y: z.string().min(1).max(255),
	z: z.string().min(1).max(255),
	skin: z.string().min(2).max(255),
});

export const getNpcResSchema = apiResSchema.extend({
	data: z.object({
		agent: agentDBSchema,
		entity: entityDBSchema,
		npc: npcDBSchema,
	}),
});

export const listNpcsResSchema = apiResSchema.extend({
	data: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			description: z.string(),
			identifier: z.string(),
			display: z.string(),
			x: z.string(),
			y: z.string(),
			z: z.string(),
			skin: z.string(),
		}),
	),
});
