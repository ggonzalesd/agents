import { resolve } from 'node:path';
import type { Room } from 'colyseus';

import { ItemState } from '#/state/inventory.state';
import type { DialogueConfig, ResolveNextCtx } from './dialogue.types';
import { loadDialogueConfig } from './dialogue-config.builder';
import { InventoryServerEcs } from '../../entity/InventoryServer.ecs';

type DebugType = 'info' | 'warning' | 'error';

function broadcastDebug(room: Room, message: string, type: DebugType = 'info'): void {
	room.broadcast('dialogue:debug', { message, type });
}

function resolveBuyPotion({ npcEntity, playerEntity }: ResolveNextCtx): string | null {
	const playerInventory = playerEntity.get(InventoryServerEcs).raw();
	if (!playerInventory) return 's_buy_fail';

	const coinEntry = Array.from(playerInventory.inventoryState.items.entries())
		.find(([_, item]) => item.type === 'coin');

	if (!coinEntry) return 's_buy_fail';

	const [coinSlot] = coinEntry;
	playerInventory.inventoryState.items.delete(coinSlot);

	const npcInventory = npcEntity.get(InventoryServerEcs).raw();
	if (npcInventory) {
		const freeSlot = npcInventory.getAvailableSlot();
		if (freeSlot !== null) {
			npcInventory.inventoryState.items.set(freeSlot.toString(), new ItemState('coin', 1, {}));
		}
	}

	return 's_buy_success';
}

export function buildMerchantDialogueConfig(room: Room): DialogueConfig {
	const jsonPath = resolve(
		process.cwd(),
		'server/game/data/dialogues/merchant-example.json',
	);

	return loadDialogueConfig(jsonPath, {
		conversations: {
			'merchant-greeting-a': {
				onStart: (ctx) => broadcastDebug(room, `[onStart] conv="${ctx.conversationId}" npc="${ctx.npcEntityId}" player="${ctx.playerEntityId}"`, 'info'),
				onEnd: (ctx) => broadcastDebug(room, `[onEnd] conv="${ctx.conversationId}" completada por player="${ctx.playerEntityId}"`, 'info'),
				onCancel: (ctx) => broadcastDebug(room, `[onCancel] conv="${ctx.conversationId}" cancelada por player="${ctx.playerEntityId}"`, 'warning'),
			},
			'merchant-greeting-b': {
				onStart: (ctx) => broadcastDebug(room, `[onStart] conv="${ctx.conversationId}" npc="${ctx.npcEntityId}" player="${ctx.playerEntityId}"`, 'info'),
				onEnd: (ctx) => broadcastDebug(room, `[onEnd] conv="${ctx.conversationId}" completada por player="${ctx.playerEntityId}"`, 'info'),
				onCancel: (ctx) => broadcastDebug(room, `[onCancel] conv="${ctx.conversationId}" cancelada por player="${ctx.playerEntityId}"`, 'warning'),
			},
		},
		statements: {
			's_greeting': {
				onAsk: (ctx) => broadcastDebug(room, `[onAsk] stmt="${ctx.statementId}" player="${ctx.playerEntityId}"`, 'info'),
			},
			's_alt_greeting': {
				onAsk: (ctx) => broadcastDebug(room, `[onAsk] stmt="${ctx.statementId}" player="${ctx.playerEntityId}"`, 'info'),
			},
		},
		options: {
			'o_quest': {
				onSelect: (ctx) => broadcastDebug(room, `[onSelect] opt="${ctx.optionId}" → next="${ctx.nextStatementId ?? 'END'}" player="${ctx.playerEntityId}"`, 'info'),
			},
			'o_bye': {
				onSelect: (ctx) => broadcastDebug(room, `[onSelect] opt="${ctx.optionId}" → END player="${ctx.playerEntityId}"`, 'info'),
			},
			'o_confirm_potion': {
				resolveNext: (ctx) => {
					const result = resolveBuyPotion(ctx);
					broadcastDebug(
						room,
						`[resolveNext] o_confirm_potion player="${ctx.playerEntityId}" → "${result ?? 'END'}"`,
						result === 's_buy_success' ? 'info' : 'warning',
					);
					return result;
				},
			},
		},
	});
}
