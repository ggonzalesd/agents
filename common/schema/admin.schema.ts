import { z } from 'zod';

export const adminTeleportSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('to-player'),
		targetEntityId: z.string().min(1),
	}),
	z.object({
		type: z.literal('to-origin'),
	}),
]);

export type AdminTeleportPayload = z.infer<typeof adminTeleportSchema>;