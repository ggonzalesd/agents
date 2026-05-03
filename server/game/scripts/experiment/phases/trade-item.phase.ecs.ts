import { ItemState } from '#/state/inventory.state';

import { classicNpcServerFactoryGenerator } from '../../../prefab/classicNpc.server';
import { boxServerFactory } from '../../../prefab/box.server';
import { ClassicNpcBehaviorType } from '$/models/ClassicNPC.model';
import type { DialogueConfig } from '../../classic-npc/dialogue/dialogue.types';
import { getSlotPosition } from '$/services/slot-allocator.service';
import { InventoryServerEcs } from '../../entity/InventoryServer.ecs';
import { ServerDataEcs } from '../../serverData.ecs';
import { ExperimentPhaseEcs } from '../experiment-phase.ecs';
import { ExperimentManagerEcs } from '../experiment-manager.ecs';

const NPC_IDENTIFIER = 'trade-item-npc';
const NPC_SKIN = 'kanye';
const TRADE_CONV_ID = 'trade-item-conv';

const ITEM_NAMES: Record<string, string> = {
	sword: 'espada',
	potion: 'poción',
	cookie: 'galleta',
	seeds: 'semillas',
	coin: 'moneda',
	apple: 'manzana',
	green_apple: 'manzana verde',
	meat: 'carne',
};

export class TradeItemPhaseEcs extends ExperimentPhaseEcs {
	private npcName: string | null = null;
	private readonly spawnedBoxNames: string[] = [];
	private traded = false;

	private get giveItem(): string {
		return (this.definition.config?.giveItem as string) ?? 'sword';
	}

	private get receiveItem(): string {
		return (this.definition.config?.receiveItem as string) ?? 'potion';
	}

	private get giveItemName(): string {
		return ITEM_NAMES[this.giveItem] ?? this.giveItem;
	}

	private get receiveItemName(): string {
		return ITEM_NAMES[this.receiveItem] ?? this.receiveItem;
	}

	protected onMountPhase(): void {
		this.traded = false;

		const serverData = this.world.get(ServerDataEcs).raw();
		if (!serverData) return;

		const userId = this.runtime.userId;
		const slotPos = getSlotPosition(userId);
		const basePos = slotPos ?? { x: 0, y: 0, z: 0 };
		const npcPos = { x: basePos.x + 3, y: basePos.y, z: basePos.z + 3 };

		this.spawnBox(userId, basePos);
		this.spawnNpc(userId, npcPos, serverData.room);
	}

	protected onUnmountPhase(): void {
		if (this.npcName) {
			this.world.getEntity(this.npcName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.npcName = null;
		}

		for (const boxName of this.spawnedBoxNames) {
			this.world.getEntity(boxName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
		}
		this.spawnedBoxNames.length = 0;
	}

	private hasItem(playerEntityId: string, itemType: string): boolean {
		const playerEntity = this.world.getEntity(playerEntityId).raw();
		if (!playerEntity) return false;

		const inventory = playerEntity.get(InventoryServerEcs).raw();
		if (!inventory) return false;

		for (const item of inventory.inventoryState.items.values()) {
			if (item.type === itemType) {
				return true;
			}
		}
		return false;
	}

	private consumeItem(playerEntityId: string, itemType: string): void {
		const playerEntity = this.world.getEntity(playerEntityId).raw();
		if (!playerEntity) return;

		const inventory = playerEntity.get(InventoryServerEcs).raw();
		if (!inventory) return;

		for (const [slotStr, item] of inventory.inventoryState.items.entries()) {
			if (item.type === itemType) {
				if (item.quantity <= 1) {
					inventory.inventoryState.items.delete(slotStr);
				} else {
					item.quantity -= 1;
				}
				return;
			}
		}
	}

	private giveItemToPlayer(playerEntityId: string, itemType: string): void {
		const playerEntity = this.world.getEntity(playerEntityId).raw();
		if (!playerEntity) return;

		const inventory = playerEntity.get(InventoryServerEcs).raw();
		if (!inventory) return;

		const freeSlot = inventory.getAvailableSlot();
		if (freeSlot === null) return;

		inventory.inventoryState.items.set(
			freeSlot.toString(),
			new ItemState(itemType, 1, {}),
		);
	}

	private handlePhaseSuccess(): void {
		this.world.get(ExperimentManagerEcs).ifSome((manager) => {
			manager.handlePhaseSuccess(this.runtime.userId);
		});
	}

	private spawnBox(
		userId: string,
		basePos: { x: number; y: number; z: number },
	): void {
		const boxPos = {
			x: basePos.x + 6,
			y: basePos.y,
			z: basePos.z + 2,
		};

		const boxName = `trade-box-${userId}`;
		const box = boxServerFactory({
			world: this.world,
			name: boxName,
			pos: boxPos,
			skin: 'crate',
			dropItems: [this.giveItem],
		});

		this.world.addEntity(box);
		this.spawnedBoxNames.push(boxName);
	}

	private spawnNpc(
		userId: string,
		pos: { x: number; y: number; z: number },
		room: import('colyseus').Room,
	): void {
		const npcName = `${NPC_IDENTIFIER}-${userId}`;
		this.npcName = npcName;

		const conv: DialogueConfig['conversations'][number] = {
			id: TRADE_CONV_ID,
			rootStatementId: 's_root',
			reusable: true,
			resumable: false,
			oneShot: false,
			enabled: true,
			onEnd: () => {
				if (this.traded) {
					this.handlePhaseSuccess();
				}
			},
			statements: {
				s_root: {
					id: 's_root',
					text: '¡Eh, viajero! Necesito una %GIVE_ITEM_NAME% con urgencia. Si me consigues una, te daré una %RECEIVE_ITEM_NAME% a cambio. ¿Tienes una?',
					options: {
						o_have: {
							id: 'o_have',
							text: 'Sí, aquí tienes la %GIVE_ITEM_NAME%.',
							nextStatementId: null,
						},
						o_not_yet: {
							id: 'o_not_yet',
							text: 'Todavía no, dame un momento.',
							nextStatementId: null,
						},
					},
				},
				s_not_enough: {
					id: 's_not_enough',
					text: 'No veo ninguna %GIVE_ITEM_NAME% en tu inventario. Consigue una y vuelve a hablarme.',
					options: {
						o_ok: {
							id: 'o_ok',
							text: 'Entendido, ya vuelvo.',
							nextStatementId: null,
						},
					},
				},
				s_thanks: {
					id: 's_thanks',
					text: '¡Perfecto! Aquí tienes tu %RECEIVE_ITEM_NAME%. Trato justo, ¿no?',
					options: {
						o_end: {
							id: 'o_end',
							text: 'Trato justo. ¡Gracias!',
							nextStatementId: null,
						},
					},
				},
			},
		};

		const dialogueConfig: DialogueConfig = {
			pickStrategy: 'sequential',
			variables: () => ({
				GIVE_ITEM_NAME: this.giveItemName,
				RECEIVE_ITEM_NAME: this.receiveItemName,
			}),
			conversations: [conv],
		};

		conv.statements.s_root.options.o_have.resolveNext = (ctx) => {
			if (this.hasItem(ctx.playerEntityId, this.giveItem)) {
				this.consumeItem(ctx.playerEntityId, this.giveItem);
				this.giveItemToPlayer(ctx.playerEntityId, this.receiveItem);
				this.traded = true;
				return 's_thanks';
			}
			return 's_not_enough';
		};

		const factory = classicNpcServerFactoryGenerator(this.world);
		const npcEntity = factory({
			id: npcName,
			name: npcName,
			display: 'Mercader',
			description: 'Un mercader que busca intercambiar objetos.',
			skin: NPC_SKIN,
			pos,
			life: 100,
			maxLife: 100,
			config: {
				id: npcName,
				npcId: npcName,
				behaviorType: ClassicNpcBehaviorType.PASSIVE,
				aggroRange: 0,
				attackRange: 0,
				detectionRange: 8,
				attackDurationSec: 0,
				attackCooldownMs: 0,
				fleeHealthPercent: null,
				patrolRadius: 0,
				extraConfig: {},
			},
			dialogueConfig,
			room,
		});

		this.world.addEntity(npcEntity);
	}
}
