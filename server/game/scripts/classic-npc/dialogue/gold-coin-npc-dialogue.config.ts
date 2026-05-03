import { resolve } from 'path';
import type { Room } from 'colyseus';

import type { DialogueConfig } from './dialogue.types';
import { loadDialogueConfig } from './dialogue-config.builder';

const COIN_STATEMENT_IDS = ['s_coin_route_a', 's_coin_route_b', 's_coin_route_c'] as const;

export function buildGoldCoinDialogueConfig(
	onCoinGiven: (playerEntityId: string) => void,
	room: Room,
): DialogueConfig {
	const jsonPath = resolve(
		process.cwd(),
		'server/game/data/dialogues/gold-coin-npc.json',
	);

	const statementHooks = Object.fromEntries(
		COIN_STATEMENT_IDS.map((stmtId) => [
			stmtId,
			{
				onAsk: (ctx: { playerEntityId: string; statementId: string }) => {
					room.broadcast('dialogue:debug', {
						message: `[gold-coin] Entregando moneda al jugador "${ctx.playerEntityId}" vía ruta "${ctx.statementId}"`,
						type: 'info',
					});
					onCoinGiven(ctx.playerEntityId);
				},
			},
		]),
	);

	return loadDialogueConfig(jsonPath, {
		statements: statementHooks,
	});
}
