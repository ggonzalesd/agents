import { resolve } from 'node:path';
import type { Room } from 'colyseus';

import type { DialogueConfig, ConversationEventCtx } from './dialogue.types';
import { loadDialogueConfig } from './dialogue-config.builder';

const COIN_OPTION_IDS = ['o_coin_a_end', 'o_coin_b_end', 'o_coin_c_end'] as const;
const CONVERSATION_ID = 'gold-coin-main';

export function buildGoldCoinDialogueConfig(
	onCoinGiven: (playerEntityId: string) => void,
	room: Room,
	onDialogueEnd?: (ctx: ConversationEventCtx) => void,
): DialogueConfig {
	const jsonPath = resolve(
		process.cwd(),
		'server/game/data/dialogues/gold-coin-npc.json',
	);

	const optionHooks = Object.fromEntries(
		COIN_OPTION_IDS.map((optId) => [
			optId,
			{
				onSelect: (ctx: { playerEntityId: string; optionId: string }) => {
					room.broadcast('dialogue:debug', {
						message: `[gold-coin] Entregando moneda al jugador "${ctx.playerEntityId}" vía opción "${ctx.optionId}"`,
						type: 'info',
					});
					onCoinGiven(ctx.playerEntityId);
				},
			},
		]),
	);

	return loadDialogueConfig(jsonPath, {
		conversations: onDialogueEnd
			? {
					[CONVERSATION_ID]: {
						onEnd: onDialogueEnd,
					},
				}
			: undefined,
		options: optionHooks,
	});
}
