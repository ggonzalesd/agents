import * as RAPIER from '@dimforge/rapier3d-compat';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { ServerDataEcs } from './serverData.ecs';
import { classicNpcServerFactoryGenerator } from '../prefab/classicNpc.server';
import { itemServerFactory } from '../prefab/item.server';
import { npcServerFactoryGenerator } from '../prefab/npc.server';
import { boxServerFactory } from '../prefab/box.server';
import { triggerZoneServerFactory } from '../prefab/trigger-zone.server';
import type { IVec3 } from '#/utils/math.util';

import * as ClassicNPCRepository from '$/db/classic-npc.db';
import * as NPCRepository from '$/db/npc.db';
import * as InventoryRepository from '$/db/inventory.db';
import { defaultMap } from '#/maps/default.map';
import { ItemState } from '#/state/inventory.state';
import { InventoryServerEcs } from '../scripts/entity/InventoryServer.ecs';
import { MapLoaderEcs } from './world/map-loader.ecs';
import { buildMerchantDialogueConfig } from '../scripts/classic-npc/dialogue/merchant-dialogue.config';

import type { BoxSkin } from '#/state/box.state';
import { WorldEventBusEcs, WorldEventType } from './world-event-bus.ecs';

const BOX_SPAWNS: { pos: IVec3; skin: BoxSkin }[] = [
	{ pos: { x: 4, y: 0, z: 3 }, skin: 'box_stacked' },
	{ pos: { x: -3, y: 0, z: -5 }, skin: 'crate' },
	{ pos: { x: 6, y: 0, z: -4 }, skin: 'box_stacked' },
	{ pos: { x: -5, y: 0, z: 6 }, skin: 'crate' },
	{ pos: { x: 7, y: 0, z: 2 }, skin: 'box_stacked' },
	{ pos: { x: -6, y: 0, z: -3 }, skin: 'crate' },
	{ pos: { x: 3, y: 0, z: -7 }, skin: 'box_stacked' },
	{ pos: { x: -4, y: 0, z: 4 }, skin: 'crate' },
];

export class ServerManagerEcs extends ComponentEcs {
	onStart(): void {
		const physics = this.world
			.get(ServerDataEcs)
			.map((sd) => sd.worldPhysic)
			.unwrap('World physic not found');

		const mapLoader = this.world
			.get(MapLoaderEcs)
			.unwrap('MapLoaderEcs not found');

		// Create Plane
		const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, -1, 0);
		const body = physics.createRigidBody(bodyDesc);
		const colliderDesc = RAPIER.ColliderDesc.cuboid(100, 1, 100);
		const collider = physics.createCollider(colliderDesc, body);

		// Cargar el mapa del lobby a través de MapLoaderEcs para mantener el estándar
		mapLoader.mountMap('lobby', defaultMap, { x: 0, y: 0, z: 0 });

		BOX_SPAWNS.forEach(({ pos, skin }, index) => {
			console.log(`Spawning box-${index} at`, pos, 'skin:', skin);
			const box = boxServerFactory({
				world: this.world,
				name: `box-${index}`,
				pos,
				skin,
			});
			this.world.addEntity(box);
		});

		// Random Object
		const types = ['sword', 'potion', 'cookie', 'seeds', 'coin'] as const;

		for (let i = 0; i < 10; i++) {
			const item = itemServerFactory({
				world: this.world,
				name: `item1_${Math.random().toString(36).substring(7)}`,
				pos: { x: 0, y: 5, z: Math.random() * 10 - 5 },
				stats: {
					amount: 1,
					type: types[Math.floor(Math.random() * types.length)],
				},
			});
			this.world.addEntity(item);
		}

		// Trigger zone en el lobby
		const trigger = triggerZoneServerFactory({
			world: this.world,
			name: 'trigger-lobby-1',
			pos: { x: 0, y: 1, z: 0 },
			radius: 3,
			height: 5,
			color: 0xff0000,
		});
		this.world.addEntity(trigger);

		this.world.get(WorldEventBusEcs).ifSome((bus) => {
			bus.on(WorldEventType.EntityEnterTrigger, (entityName, payload) => {
				console.log(
					` = = = = = = ${entityName} entered trigger with payload:`,
					payload,
				);
			});
		});

		const npcServerFactory = npcServerFactoryGenerator(this.world);
		const classicNpcServerFactory = classicNpcServerFactoryGenerator(
			this.world,
		);

		const serverData = this.world
			.get(ServerDataEcs)
			.unwrap('ServerDataEcs not found in ServerManagerEcs');

		Promise.all([
			NPCRepository.getAllNPCs({}),
			ClassicNPCRepository.getAllClassicNPCs({}),
		]).then(([npcs, classicNpcs]) => {
			npcs.forEach(async (one) => {
				console.log('Spawning NPC:', one.npc.model);

				const npc = npcServerFactory({
					id: one.npc.id,
					model: one.npc.model,
					name: one.agent.identifier,
					description: one.npc.description,
					display: one.agent.display,
					pos: {
						x: one.agent.positionX,
						y: one.agent.positionY,
						z: one.agent.positionZ,
					},
					life: one.entity.life,
					maxLife: one.entity.maxLife,
				});

				const inventoryOp = npc.get(InventoryServerEcs);
				if (inventoryOp.isSome()) {
					const inventoryEcs = inventoryOp.unwrap();
					const savedItems = await InventoryRepository.getItemsByEntityId({
						entityId: one.npc.id,
					});
					for (const item of savedItems) {
						const metadata = (item.metadata ?? {}) as Record<string, string>;
						inventoryEcs.inventoryState.items.set(
							item.slot,
							new ItemState(item.type, item.quantity, metadata),
						);
					}
				}

				this.world.addEntity(npc);
			});

			classicNpcs.forEach(async (one) => {
				console.log('Spawning Classic NPC:', one.agent.identifier);

				const dialogueConfig = buildMerchantDialogueConfig(serverData.room);

				const npc = classicNpcServerFactory({
					id: one.classicNpc.id,
					name: one.agent.identifier,
					description: one.classicNpc.description,
					display: one.agent.display,
					config: one.config,
					skin: one.classicNpc.skinKey,
					pos: {
						x: one.agent.positionX,
						y: one.agent.positionY,
						z: one.agent.positionZ,
					},
					life: one.entity.life,
					maxLife: one.entity.maxLife,
					dialogueConfig,
					room: serverData.room,
				});

				const inventoryOp = npc.get(InventoryServerEcs);
				if (inventoryOp.isSome()) {
					const inventoryEcs = inventoryOp.unwrap();
					const savedItems = await InventoryRepository.getItemsByEntityId({
						entityId: one.classicNpc.id,
					});
					for (const item of savedItems) {
						const metadata = (item.metadata ?? {}) as Record<string, string>;
						inventoryEcs.inventoryState.items.set(
							item.slot,
							new ItemState(item.type, item.quantity, metadata),
						);
					}
				}

				this.world.addEntity(npc);
			});
		});

		this.callOnDelete(() => {
			physics.removeCollider(collider, true);
			physics.removeRigidBody(body);
			mapLoader.unmountMap('lobby');

			console.log('ServerManagerEcs cleaned up');
		});
	}
}
