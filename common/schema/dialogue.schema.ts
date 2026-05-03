import z from 'zod';

export const dialogueOptionSchema = z.object({
	id: z.string().min(1),
	text: z.string().min(1),
	nextStatementId: z.string().nullable(),
});

export const dialogueStatementSchema = z.object({
	id: z.string().min(1),
	text: z.string().min(1),
	options: z.record(z.string(), dialogueOptionSchema),
});

export const dialogueConversationSchema = z.object({
	id: z.string().min(1),
	rootStatementId: z.string().min(1),
	statements: z.record(z.string(), dialogueStatementSchema),
	reusable: z.boolean(),
	resumable: z.boolean(),
	enabled: z.boolean().optional().default(true),
});

export const dialogueConfigSchema = z.object({
	conversations: z.array(dialogueConversationSchema).min(1),
	pickStrategy: z.enum(['random', 'sequential', 'weighted']),
	weights: z.array(z.number().positive()).optional(),
});

export type DialogueOptionData = z.infer<typeof dialogueOptionSchema>;
export type DialogueStatementData = z.infer<typeof dialogueStatementSchema>;
export type DialogueConversationData = z.infer<typeof dialogueConversationSchema>;
export type DialogueConfigData = z.infer<typeof dialogueConfigSchema>;

// Payloads de mensajes Colyseus

export const dialogueStartPayloadSchema = z.object({
	npcEntityId: z.string(),
	conversationId: z.string(),
	statementId: z.string(),
	text: z.string(),
	options: z.array(
		z.object({
			id: z.string(),
			text: z.string(),
			index: z.number().int(),
		}),
	),
});

export const dialogueNextPayloadSchema = dialogueStartPayloadSchema;

export const dialogueEndPayloadSchema = z.object({
	npcEntityId: z.string(),
	conversationId: z.string(),
});

export const dialogueCancelPayloadSchema = dialogueEndPayloadSchema;

export const dialogueResponseMessageSchema = z.object({
	npcEntityId: z.string(),
	optionId: z.string(),
});

export const dialogueUnavailablePayloadSchema = z.object({
	npcEntityId: z.string(),
});

export type DialogueStartPayload = z.infer<typeof dialogueStartPayloadSchema>;
export type DialogueNextPayload = z.infer<typeof dialogueNextPayloadSchema>;
export type DialogueEndPayload = z.infer<typeof dialogueEndPayloadSchema>;
export type DialogueCancelPayload = z.infer<typeof dialogueCancelPayloadSchema>;
export type DialogueResponseMessage = z.infer<typeof dialogueResponseMessageSchema>;
export type DialogueUnavailablePayload = z.infer<typeof dialogueUnavailablePayloadSchema>;
