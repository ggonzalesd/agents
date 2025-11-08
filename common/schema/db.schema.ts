import { z } from 'zod';

export const agentDBSchema = z.object({
	id: z.uuid(),
	display: z.string().min(2).max(255),
	identifier: z.string().min(2).max(255),
	positionX: z.number(),
	positionY: z.number(),
	positionZ: z.number(),
	rotation: z.number().optional(),
	metadata: z.object({}).catchall(z.any()),
	createdAt: z.date(),
});

export const entityDBSchema = z.object({
	id: z.uuid(),
	life: z.number(),
	maxLife: z.number(),
	saturation: z.number(),
	maxSaturation: z.number(),
});

export const npcDBSchema = z.object({
	id: z.uuid(),
	description: z.string().min(0).max(1024),
	model: z.string().min(2).max(255),
	skinUrl: z.string().min(2).max(255),
});
