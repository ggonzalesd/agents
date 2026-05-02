import { readFileSync } from 'fs';

import { dialogueConfigSchema } from '#/schema/dialogue.schema';
import type {
	ConversationHooks,
	DialogueConfig,
	OptionHooks,
	StatementHooks,
} from './dialogue.types';

export type DialogueHooks = {
	conversations?: Record<string, ConversationHooks>;
	statements?: Record<string, StatementHooks>;
	options?: Record<string, OptionHooks>;
};

export function loadDialogueConfig(jsonPath: string, hooks: DialogueHooks = {}): DialogueConfig {
	const raw = JSON.parse(readFileSync(jsonPath, 'utf-8'));
	const data = dialogueConfigSchema.parse(raw);

	return {
		pickStrategy: data.pickStrategy,
		weights: data.weights,
		conversations: data.conversations.map((conv) => ({
			...conv,
			...hooks.conversations?.[conv.id],
			statements: Object.fromEntries(
				Object.entries(conv.statements).map(([stmtId, stmt]) => [
					stmtId,
					{
						...stmt,
						...hooks.statements?.[stmtId],
						options: Object.fromEntries(
							Object.entries(stmt.options).map(([optId, opt]) => [
								optId,
								{
									...opt,
									...hooks.options?.[optId],
								},
							]),
						),
					},
				]),
			),
		})),
	};
}
