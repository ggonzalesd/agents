import { resolve } from 'path';

import { ItemState } from '#/state/inventory.state';
import type { ExperimentPhaseDefinition } from '#/experiments/guia-experimentacion-v4';

import { classicNpcServerFactoryGenerator } from '../../../prefab/classicNpc.server';
import { ClassicNpcBehaviorType } from '$/models/ClassicNPC.model';
import { buildGoldCoinDialogueConfig } from '../../classic-npc/dialogue/gold-coin-npc-dialogue.config';
import { getSlotPosition } from '$/services/slot-allocator.service';
import { InventoryServerEcs } from '../../entity/InventoryServer.ecs';
import { WorldEventBusEcs, WorldEventType } from '../../world-event-bus.ecs';
import { ServerDataEcs } from '../../serverData.ecs';
import { ExperimentPhaseEcs } from '../experiment-phase.ecs';
import type { ExperimentRuntimeEcs } from '../experiment-runtime.ecs';

const NPC_IDENTIFIER = 'gold-coin-merchant-npc';
const NPC_SKIN_URL = 'https://mc-heads.net/avatar/MHF_Steve/64';
const COIN_ITEM_TYPE = 'coin';

export class RequestGoldCoinPhaseEcs extends ExperimentPhaseEcs {
	private resolved = false;
	private npcName: string | null = null;

	constructor(
		definition: ExperimentPhaseDefinition,
		runtime: ExperimentRuntimeEcs,
	) {
		super(definition, runtime);
	}

	protected onMountPhase(): void {
		this.resolved = false;

		if (!this.runtime) return;

		const bus = this.world.get(WorldEventBusEcs).raw();
		if (!bus) return;

		const serverData = this.world.get(ServerDataEcs).raw();
		if (!serverData) return;

		const entityName = this.runtime.entityName;
		const userId = this.runtime.userId;

		this.onEvent(bus, WorldEventType.InventoryItemReceived, entityName, () => {
			this.handleCoinReceived();
		});

		this.spawnNpc(userId, serverData.room);
	}

	protected onUnmountPhase(): void {
		if (this.npcName) {
			this.world.getEntity(this.npcName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.npcName = null;
		}
	}

	public onRestartPhase(): void {
		this.resolved = false;
	}

	private spawnNpc(userId: string, room: Parameters<typeof buildGoldCoinDialogueConfig>[1]): void {
		const slotPos = getSlotPosition(userId);
		const pos = slotPos
			? { x: slotPos.x + 3, y: slotPos.y, z: slotPos.z + 3 }
			: { x: 3, y: 0, z: 3 };

		const npcName = `${NPC_IDENTIFIER}-${userId}`;

		const onCoinGiven = (playerEntityId: string): void => {
			this.giveCoinToPlayer(playerEntityId, npcName, room);
		};

		const dialogueConfig = buildGoldCoinDialogueConfig(onCoinGiven, room);

		const factory = classicNpcServerFactoryGenerator(this.world);
		const npcEntity = factory({
			id: npcName,
			name: npcName,
			display: 'Aldeano',
			description: 'Un aldeano que puede darte una moneda de oro si te lo ganas.',
			skin: NPC_SKIN_URL,
			pos,
			life: 100,
			maxLife: 100,
			config: {
				behaviorType: ClassicNpcBehaviorType.PASSIVE,
				aggroRange: 0,
				attackRange: 0,
				detectionRange: 8,
				attackDurationSec: 0,
				attackCooldownMs: 0,
				fleeHealthPercent: null,
				patrolRadius: 3,
				extraConfig: {},
			},
			dialogueConfig,
			room,
		});

		this.world.addEntity(npcEntity);
		this.npcName = npcName;
	}

	private giveCoinToPlayer(
		playerEntityId: string,
		giverEntityId: string,
		room: InstanceType<typeof import('colyseus').Room>,
	): void {
		if (this.resolved) return;

		const playerEntityOp = this.world.getEntity(playerEntityId);
		if (playerEntityOp.isNone()) return;

		const playerInventory = playerEntityOp.unwrap('').get(InventoryServerEcs).raw();
		if (!playerInventory) return;

		const freeSlot = playerInventory.getAvailableSlot();
		if (freeSlot === null) return;

		playerInventory.inventoryState.items.set(
			freeSlot.toString(),
			new ItemState(COIN_ITEM_TYPE, 1, {}),
		);

		for (const client of room.clients) {
			const identifier = (client.userData?.userInfo as { agent?: { identifier?: string } } | undefined)?.agent?.identifier;
			if (identifier === playerEntityId) {
				client.send('inventory:item_received', {
					item: { type: COIN_ITEM_TYPE, quantity: 1 },
					giverEntityId,
				});
				break;
			}
		}

		const bus = this.world.get(WorldEventBusEcs).raw();
		bus?.emit(WorldEventType.InventoryItemReceived, playerEntityId, {
			item: { type: COIN_ITEM_TYPE, quantity: 1 },
			giverEntityId,
		});
	}

	private handleCoinReceived(): void {
		if (this.resolved) return;
		this.resolved = true;
		void this.runtime?.resolveCurrentPhase();
	}
}
