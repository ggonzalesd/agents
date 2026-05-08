import * as RAPIER from '@dimforge/rapier3d-compat';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { ServerDataEcs } from './serverData.ecs';
import { classicNpcServerFactoryGenerator } from '../prefab/classicNpc.server';
import { npcServerFactoryGenerator } from '../prefab/npc.server';

import * as ClassicNPCRepository from '$/db/classic-npc.db';
import * as NPCRepository from '$/db/npc.db';
import * as InventoryRepository from '$/db/inventory.db';
import { defaultMap } from '#/maps/default.map';
import { ItemState } from '#/state/inventory.state';
import { InventoryServerEcs } from '../scripts/entity/InventoryServer.ecs';
import { MapLoaderEcs } from './world/map-loader.ecs';
import { buildMerchantDialogueConfig } from '../scripts/classic-npc/dialogue/merchant-dialogue.config';

import { floatingTextServerFactory } from '../prefab/floating-text.server';

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

		// ── Textos flotantes de ejemplo en el lobby ──────────────────────────────

		// 1. Texto grande: bienvenida
		this.world.addEntity(
			floatingTextServerFactory({
				world: this.world,
				name: 'floating-text-welcome',
				pos: { x: 0, y: 2, z: -5 },
				text: '¡Bienvenido al lobby!',
				fontSize: 36,
			}),
		);

		// 3. Colores personalizados: violeta sobre oscuro
		this.world.addEntity(
			floatingTextServerFactory({
				world: this.world,
				name: 'floating-text-custom-colors',
				pos: { x: -5, y: 2, z: 0 },
				text: 'Lobby de prueba',
				foreground: '#c4b5fd',
				background: '#1e1b4b',
			}),
		);
	}
}
