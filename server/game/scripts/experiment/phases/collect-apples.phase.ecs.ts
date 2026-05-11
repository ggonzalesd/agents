import { classicNpcServerFactoryGenerator } from '../../../prefab/classicNpc.server';
import { treeServerFactory } from '../../../prefab/tree.server';
import { ClassicNpcBehaviorType } from '$/models/ClassicNPC.model';
import { ClassicNPCBehaviorStateEcs } from '../../classic-npc/classic-npc-behavior-state.ecs';
import { ClassicNpcDialogueEcs } from '../../classic-npc/dialogue/classic-npc-dialogue.ecs';
import type { DialogueConfig } from '../../classic-npc/dialogue/dialogue.types';
import { getSlotPosition } from '$/services/slot-allocator.service';
import { InventoryServerEcs } from '../../entity/InventoryServer.ecs';
import { ServerDataEcs } from '../../serverData.ecs';
import { ExperimentPhaseEcs } from '../experiment-phase.ecs';
import { ExperimentManagerEcs } from '../experiment-manager.ecs';
import type { NpcsSinLlmsExperimentRuntimeEcs } from '../handlers/npcs-sin-llms.experiment-runtime.ecs';

const NPC_IDENTIFIER = 'collect-apples-npc';
const NPC_SKIN = 'kanye';
const TREE_IDENTIFIER = 'collect-apples-tree';

const ASK_CONV_ID = 'collect-apples-ask';
const STATUS_CONV_ID = 'collect-apples-status';

const REQUIRED_APPLES = 5;
const INVENTORY_CHECK_INTERVAL_MS = 1000;

export class CollectApplesPhaseEcs extends ExperimentPhaseEcs {
	private npcName: string | null = null;
	private treeName: string | null = null;
	private inventoryCheckInterval: ReturnType<typeof setInterval> | null = null;
	private resolved = false;
	private accepted = false;
	private _statusNpc = 0;
	private _statusPlayer = 0;
	private _statusTotal = 0;

	protected onMountPhase(): void {
		this.resolved = false;
		this.accepted = false;

		const serverData = this.world.get(ServerDataEcs).raw();
		if (!serverData) return;

		const userId = this.runtime.userId;
		const slotPos = getSlotPosition(userId);
		const basePos = slotPos ?? { x: 0, y: 0, z: 0 };

		this.spawnTree(basePos);
		this.spawnNpc(userId, basePos, serverData.room);
	}

	protected onUnmountPhase(): void {
		if (this.inventoryCheckInterval !== null) {
			clearInterval(this.inventoryCheckInterval);
			this.inventoryCheckInterval = null;
		}

		if (this.npcName) {
			this.world.getEntity(this.npcName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.npcName = null;
		}

		if (this.treeName) {
			const serverData = this.world.get(ServerDataEcs).raw();
			if (serverData) {
				serverData.room.broadcast('experiment:instance:remove', {
					id: this.treeName,
				});
			}

			this.world.getEntity(this.treeName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.treeName = null;
		}
	}

	private getNpcAppleCount(): number {
		if (!this.npcName) return 0;

		const npcEntity = this.world.getEntity(this.npcName).raw();
		if (!npcEntity) return 0;

		const inventory = npcEntity.get(InventoryServerEcs).raw();
		if (!inventory) return 0;

		let count = 0;
		for (const item of inventory.inventoryState.items.values()) {
			if (item.type === 'green_apple') {
				count += item.quantity;
			}
		}
		return count;
	}

	private getPlayerAppleCount(): number {
		const playerEntity = this.world.getEntity(this.runtime.entityName).raw();
		if (!playerEntity) return 0;

		const inventory = playerEntity.get(InventoryServerEcs).raw();
		if (!inventory) return 0;

		let count = 0;
		for (const item of inventory.inventoryState.items.values()) {
			if (item.type === 'green_apple') {
				count += item.quantity;
			}
		}
		return count;
	}

	private getCombinedAppleCount(): { npc: number; player: number; total: number } {
		const npc = this.getNpcAppleCount();
		const player = this.getPlayerAppleCount();
		return { npc, player, total: npc + player };
	}

	private startInventoryCheck(): void {
		this.inventoryCheckInterval = setInterval(() => {
			const appleCount = this.getNpcAppleCount();
			if (appleCount >= REQUIRED_APPLES) {
				this.handlePhaseSuccess();
			}
		}, INVENTORY_CHECK_INTERVAL_MS);
	}

	private handlePhaseSuccess(): void {
		if (this.resolved) return;
		this.resolved = true;
		this.world.get(ExperimentManagerEcs).ifSome((manager) => {
			manager.handlePhaseSuccess(this.runtime.userId);
		});
	}

	private handlePhaseFailure(reason: string): void {
		if (this.resolved) return;
		this.resolved = true;
		this.world.get(ExperimentManagerEcs).ifSome((manager) => {
			manager.handlePhaseFailure(this.runtime.userId, reason);
		});
	}

	private spawnTree(basePos: { x: number; y: number; z: number }): void {
		const treeName = `${TREE_IDENTIFIER}-${this.runtime.userId}`;
		this.treeName = treeName;

		const angle = Math.random() * Math.PI * 2;
		const radius = 5 + Math.random() * 3;

		const pos = {
			x: basePos.x + Math.cos(angle) * radius,
			y: basePos.y - 1,
			z: basePos.z + Math.sin(angle) * radius,
		};

		const treeEntity = treeServerFactory({
			world: this.world,
			name: treeName,
			pos,
		});

		this.world.addEntity(treeEntity);

		const serverData = this.world.get(ServerDataEcs).raw();
		if (serverData) {
			serverData.room.broadcast('experiment:instance:create', {
				id: treeName,
				type: 'tree',
				x: pos.x,
				y: pos.y,
				z: pos.z,
				metadata: {},
			});
		}
	}

	private spawnNpc(
		userId: string,
		pos: { x: number; y: number; z: number },
		room: import('colyseus').Room,
	): void {
		const npcName = `${NPC_IDENTIFIER}-${userId}`;
		this.npcName = npcName;

		const conv1: DialogueConfig['conversations'][number] = {
			id: ASK_CONV_ID,
			rootStatementId: 's_root',
			reusable: true,
			resumable: true,
			oneShot: false,
			enabled: true,
			onEnd: () => {
				if (this.accepted) {
					this.world.getEntity(npcName).ifSome((entity) => {
						entity.get(ClassicNPCBehaviorStateEcs).ifSome((state) => {
							state.setBehaviorType(ClassicNpcBehaviorType.COLLECTOR);
						});
						const dialogue = entity.get(ClassicNpcDialogueEcs).raw();
						dialogue?.disableConversation(ASK_CONV_ID);
						dialogue?.enableConversation(STATUS_CONV_ID);
					});
					this.startInventoryCheck();
				} else {
					this.handlePhaseFailure('No aceptaste la misión.');
				}
			},
			statements: {
				s_root: {
					id: 's_root',
					text: '¡Hola! Necesito %AMOUNT% manzanas verdes para hacer una tarta. ¿Puedes ayudarme a recolectarlas?',
					options: {
						o_accept: {
							id: 'o_accept',
							text: 'Claro, te ayudo a recolectarlas.',
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
					text: '¡Genial! Voy a buscar entre los árboles cercanos. Espera aquí.',
					options: {
						o_ok: {
							id: 'o_ok',
							text: 'Entendido, te espero.',
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

		const dialogueConfig: DialogueConfig = {
			pickStrategy: 'sequential',
			variables: () => ({
				AMOUNT: String(REQUIRED_APPLES),
				NPC_COUNT: String(this._statusNpc),
				PLAYER_COUNT: String(this._statusPlayer),
				TOTAL_COUNT: String(this._statusTotal),
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
				{
					id: STATUS_CONV_ID,
					rootStatementId: 's_status_root',
					reusable: true,
					resumable: false,
					oneShot: false,
					enabled: false,
					onStart: () => {
						const { npc, player, total } = this.getCombinedAppleCount();
						this._statusNpc = npc;
						this._statusPlayer = player;
						this._statusTotal = total;
					},
					onEnd: () => {
						const { total } = this.getCombinedAppleCount();
						if (total >= REQUIRED_APPLES) {
							this.handlePhaseSuccess();
						}
					},
					statements: {
						s_status_root: {
							id: 's_status_root',
							text: 'Yo tengo %NPC_COUNT% manzanas y tú tienes %PLAYER_COUNT%. En total llevamos %TOTAL_COUNT% de %AMOUNT%.',
							options: {
								o_ok: {
									id: 'o_ok',
									text: 'Entendido, seguimos.',
									nextStatementId: null,
								},
							},
						},
					},
				},
			],
		};

		const factory = classicNpcServerFactoryGenerator(this.world);
		const pathfinder =
			(this.runtime as NpcsSinLlmsExperimentRuntimeEcs).experimentPathfinder ??
			undefined;

		const npcEntity = factory({
			id: npcName,
			name: npcName,
			display: 'Recolector',
			description: 'Un NPC que necesita manzanas verdes.',
			skin: NPC_SKIN,
			pos,
			life: 100,
			maxLife: 100,
			config: {
				id: npcName,
				npcId: npcName,
				behaviorType: ClassicNpcBehaviorType.PASSIVE,
				aggroRange: 12,
				attackRange: 2,
				detectionRange: 15,
				attackDurationSec: 5,
				attackCooldownMs: 500,
				fleeHealthPercent: null,
				patrolRadius: 10,
				extraConfig: {},
			},
			dialogueConfig,
			room,
			pathfinder,
		});

		this.world.addEntity(npcEntity);
	}
}
