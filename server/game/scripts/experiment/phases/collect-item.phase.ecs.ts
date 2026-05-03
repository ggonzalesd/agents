import { classicNpcServerFactoryGenerator } from '../../../prefab/classicNpc.server';
import { boxServerFactory } from '../../../prefab/box.server';
import { ClassicNpcBehaviorType } from '$/models/ClassicNPC.model';
import { ClassicNpcDialogueEcs } from '../../classic-npc/dialogue/classic-npc-dialogue.ecs';
import type { DialogueConfig } from '../../classic-npc/dialogue/dialogue.types';
import { getSlotPosition } from '$/services/slot-allocator.service';
import { InventoryServerEcs } from '../../entity/InventoryServer.ecs';
import { ServerDataEcs } from '../../serverData.ecs';
import { ExperimentPhaseEcs } from '../experiment-phase.ecs';
import { ExperimentManagerEcs } from '../experiment-manager.ecs';

const NPC_IDENTIFIER = 'collect-item-npc';
const NPC_SKIN = 'kanye';
const SENDER_CONV_ID = 'collect-item-ask';
const RECEIVER_CONV_ID = 'collect-item-deliver';

const MAX_BOXES = 12;
const BOX_SPAWN_RADIUS = 8;

const ITEM_NAMES: Record<string, string> = {
	sword: 'espadas',
	potion: 'pociones',
	cookie: 'galletas',
	seeds: 'semillas',
	coin: 'monedas',
	apple: 'manzanas',
	green_apple: 'manzanas verdes',
	meat: 'carnes',
};

export class CollectItemPhaseEcs extends ExperimentPhaseEcs {
	private npcName: string | null = null;
	private readonly spawnedBoxNames: string[] = [];
	private accepted = false;
	private delivered = false;

	private get targetItem(): string {
		return (this.definition.config?.targetItem as string) ?? 'seeds';
	}

	private get requiredAmount(): number {
		return (this.definition.config?.requiredAmount as number) ?? 3;
	}

	private get dropItems(): string[] {
		return (this.definition.config?.dropItems as string[]) ?? [this.targetItem];
	}

	private get itemName(): string {
		return ITEM_NAMES[this.targetItem] ?? this.targetItem;
	}

	protected onMountPhase(): void {
		this.accepted = false;
		this.delivered = false;

		const serverData = this.world.get(ServerDataEcs).raw();
		if (!serverData) return;

		const userId = this.runtime.userId;
		const slotPos = getSlotPosition(userId);
		const basePos = slotPos ?? { x: 0, y: 0, z: 0 };
		const npcPos = { x: basePos.x + 3, y: basePos.y, z: basePos.z + 3 };

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

	private getHaveAmount(playerEntityId: string): number {
		const playerEntity = this.world.getEntity(playerEntityId).raw();
		if (!playerEntity) return 0;

		const inventory = playerEntity.get(InventoryServerEcs).raw();
		if (!inventory) return 0;

		let count = 0;
		for (const item of inventory.inventoryState.items.values()) {
			if (item.type === this.targetItem) {
				count += item.quantity;
			}
		}
		return count;
	}

	private consumeItems(playerEntityId: string): void {
		const playerEntity = this.world.getEntity(playerEntityId).raw();
		if (!playerEntity) return;

		const inventory = playerEntity.get(InventoryServerEcs).raw();
		if (!inventory) return;

		let remaining = this.requiredAmount;
		for (const [slotStr, item] of inventory.inventoryState.items.entries()) {
			if (remaining <= 0) break;
			if (item.type !== this.targetItem) continue;

			if (item.quantity <= remaining) {
				remaining -= item.quantity;
				inventory.inventoryState.items.delete(slotStr);
			} else {
				item.quantity -= remaining;
				remaining = 0;
			}
		}
	}

	private handlePhaseSuccess(): void {
		this.world.get(ExperimentManagerEcs).ifSome((manager) => {
			manager.handlePhaseSuccess(this.runtime.userId);
		});
	}

	private handlePhaseFailure(): void {
		this.world.get(ExperimentManagerEcs).ifSome((manager) => {
			manager.handlePhaseFailure(this.runtime.userId, 'No aceptaste la misión.');
		});
	}

	private spawnBoxes(userId: string): void {
		const serverData = this.world.get(ServerDataEcs).raw();
		if (!serverData) return;

		const slotPos = getSlotPosition(userId);
		const basePos = slotPos ?? { x: 0, y: 0, z: 0 };

		for (let i = 0; i < MAX_BOXES; i++) {
			const angle = (Math.PI * 2 * i) / MAX_BOXES + (Math.random() - 0.5) * 0.5;
			const radius = 3 + Math.random() * (BOX_SPAWN_RADIUS - 3);
			const pos = {
				x: basePos.x + Math.cos(angle) * radius,
				y: basePos.y,
				z: basePos.z + Math.sin(angle) * radius,
			};

			const boxName = `collect-box-${userId}-${i}`;
			const box = boxServerFactory({
				world: this.world,
				name: boxName,
				pos,
				skin: i % 2 === 0 ? 'box_stacked' : 'crate',
				dropItems: this.dropItems,
			});

			this.world.addEntity(box);
			this.spawnedBoxNames.push(boxName);
		}
	}

	private buildVariables(): Record<string, string> {
		return {
			ITEM_NAME: this.itemName,
			AMOUNT: String(this.requiredAmount),
		};
	}

	private spawnNpc(
		userId: string,
		pos: { x: number; y: number; z: number },
		room: import('colyseus').Room,
	): void {
		const npcName = `${NPC_IDENTIFIER}-${userId}`;
		this.npcName = npcName;


		const conv1: DialogueConfig['conversations'][number] = {
			id: SENDER_CONV_ID,
			rootStatementId: 's_root',
			reusable: false,
			resumable: false,
			oneShot: true,
			enabled: true,
			onEnd: () => {
				if (this.accepted) {
					this.world.getEntity(npcName).ifSome((entity) => {
						entity.get(ClassicNpcDialogueEcs).raw()?.enableConversation(RECEIVER_CONV_ID);
					});
					this.spawnBoxes(userId);
				} else {
					this.handlePhaseFailure();
				}
			},
			statements: {
				s_root: {
					id: 's_root',
					text: '¡Eh, tú! Necesito que me consigas %AMOUNT% %ITEM_NAME%. ¿Puedes ayudarme?',
					options: {
						o_accept: {
							id: 'o_accept',
							text: 'Claro, buscaré los %ITEM_NAME%.',
							nextStatementId: 's_accept',
						},
						o_refuse: {
							id: 'o_refuse',
							text: 'Lo siento, no puedo ahora.',
							nextStatementId: 's_refuse',
						},
					},
				},
				s_accept: {
					id: 's_accept',
					text: 'Perfecto. Busca entre las cajas del campamento. Vuelve cuando las tengas.',
					options: {
						o_ok: {
							id: 'o_ok',
							text: 'Entendido, ya vuelvo.',
							nextStatementId: null,
						},
					},
				},
				s_refuse: {
					id: 's_refuse',
					text: 'Qué lástima... Quizás otro día.',
					options: {
						o_end: {
							id: 'o_end',
							text: 'Lo siento.',
							nextStatementId: null,
						},
					},
				},
			},
		};

		const conv2: DialogueConfig['conversations'][number] = {
			id: RECEIVER_CONV_ID,
			rootStatementId: 's_root',
			reusable: true,
			resumable: false,
			oneShot: false,
			enabled: false,
			onEnd: () => {
				if (this.delivered) {
					this.handlePhaseSuccess();
				}
			},
			statements: {
				s_root: {
					id: 's_root',
					text: '¿Ya conseguiste las %AMOUNT% %ITEM_NAME%?',
					options: {
						o_have: {
							id: 'o_have',
							text: 'Sí, aquí tienes.',
							nextStatementId: null,
						},
						o_not_yet: {
							id: 'o_not_yet',
							text: 'Todavía no, sigo buscando.',
							nextStatementId: null,
						},
					},
				},
				s_not_enough: {
					id: 's_not_enough',
					text: 'Solo tienes %HAVE% %ITEM_NAME%, necesito %AMOUNT%. Sigue buscando.',
					options: {
						o_ok: {
							id: 'o_ok',
							text: 'Entendido, seguiré buscando.',
							nextStatementId: null,
						},
					},
				},
				s_thanks: {
					id: 's_thanks',
					text: '¡Gracias! Exactamente lo que necesitaba. Estas %ITEM_NAME% son muy importantes para mí.',
					options: {
						o_end: {
							id: 'o_end',
							text: 'De nada, fue un placer.',
							nextStatementId: null,
						},
					},
				},
			},
		};

		const dialogueConfig: DialogueConfig = {
			pickStrategy: 'sequential',
			variables: () => ({
				...this.buildVariables(),
				HAVE: '0',
			}),
			conversations: [
				{
					...conv1,
					statements: Object.fromEntries(
						Object.entries(conv1.statements).map(([stmtId, stmt]) => [
							stmtId,
							{
								...stmt,
								options: Object.fromEntries(
									Object.entries(stmt.options).map(([optId, opt]) => [
										optId,
										{
											...opt,
											onSelect:
												optId === 'o_accept'
													? () => {
															this.accepted = true;
														}
													: undefined,
										},
									]),
								),
							},
						]),
					),
				},
				conv2,
			],
		};

		conv2.statements.s_root.options.o_have.resolveNext = (ctx) => {
			const have = this.getHaveAmount(ctx.playerEntityId);

			this.world.getEntity(npcName).ifSome((entity) => {
				entity.get(ClassicNpcDialogueEcs).raw()?.updateVariables({
					...this.buildVariables(),
					HAVE: String(have),
				});
			});

			if (have >= this.requiredAmount) {
				this.delivered = true;
				this.consumeItems(ctx.playerEntityId);
				return 's_thanks';
			}
			return 's_not_enough';
		};

		const factory = classicNpcServerFactoryGenerator(this.world);
		const npcEntity = factory({
			id: npcName,
			name: npcName,
			display: 'Recolector',
			description: 'Un aldeano que necesita que le consigan objetos.',
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
