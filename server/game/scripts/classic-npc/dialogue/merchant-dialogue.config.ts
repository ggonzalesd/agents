import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Room } from 'colyseus';

import { dialogueConfigSchema } from '#/schema/dialogue.schema';
import type { DialogueConfig, ConversationEventCtx, StatementEventCtx, OptionEventCtx } from './dialogue.types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type DebugType = 'info' | 'warning' | 'error';

function broadcastDebug(room: Room, message: string, type: DebugType = 'info'): void {
	room.broadcast('dialogue:debug', { message, type });
}

export function buildMerchantDialogueConfig(room: Room): DialogueConfig {
	const jsonPath = resolve(
		process.cwd(),
		'server/game/data/dialogues/merchant-example.json',
	);
	const raw = JSON.parse(readFileSync(jsonPath, 'utf-8'));
	const data = dialogueConfigSchema.parse(raw);

	const config: DialogueConfig = {
		pickStrategy: data.pickStrategy,
		weights: data.weights,
		conversations: data.conversations.map((conv) => ({
			...conv,
			statements: Object.fromEntries(
				Object.entries(conv.statements).map(([stmtId, stmt]) => [
					stmtId,
					{
						...stmt,
						options: Object.fromEntries(
							Object.entries(stmt.options).map(([optId, opt]) => [
								optId,
								{
									...opt,
									onSelect: (ctx: OptionEventCtx) => {
										broadcastDebug(
											room,
											`[onSelect] conv="${ctx.conversationId}" stmt="${ctx.statementId}" opt="${ctx.optionId}" → next="${ctx.nextStatementId ?? 'END'}" player="${ctx.playerEntityId}"`,
											'info',
										);
									},
									onHover: (_ctx: OptionEventCtx) => {
										// onHover no se usa en server-side por ahora
									},
								},
							]),
						),
						onAsk: (ctx: StatementEventCtx) => {
							broadcastDebug(
								room,
								`[onAsk] conv="${ctx.conversationId}" stmt="${ctx.statementId}" player="${ctx.playerEntityId}"`,
								'info',
							);
						},
						onResponse: (ctx: OptionEventCtx) => {
							broadcastDebug(
								room,
								`[onResponse] conv="${ctx.conversationId}" stmt="${ctx.statementId}" eligió opt="${ctx.optionId}" → next="${ctx.nextStatementId ?? 'END'}"`,
								'warning',
							);
						},
					},
				]),
			),
			onStart: (ctx: ConversationEventCtx) => {
				broadcastDebug(
					room,
					`[onStart] conv="${ctx.conversationId}" npc="${ctx.npcEntityId}" player="${ctx.playerEntityId}"`,
					'info',
				);
			},
			onEnd: (ctx: ConversationEventCtx) => {
				broadcastDebug(
					room,
					`[onEnd] conv="${ctx.conversationId}" completada por player="${ctx.playerEntityId}"`,
					'info',
				);
			},
			onCancel: (ctx: ConversationEventCtx) => {
				broadcastDebug(
					room,
					`[onCancel] conv="${ctx.conversationId}" cancelada por player="${ctx.playerEntityId}"`,
					'warning',
				);
			},
		})),
	};

	return config;
}
