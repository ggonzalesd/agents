import * as RAPIER from '@dimforge/rapier3d-compat';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { ServerDataEcs } from './serverData.ecs';
import { animalServerFactoryGenerator } from '../prefab/animal.server';
import { itemServerFactory } from '../prefab/item.server';
import { npcServerFactoryGenerator } from '../prefab/npc.server';
import { treeServerFactory } from '../prefab/tree.server';
import { boxServerFactory } from '../prefab/box.server';
import type { IVec3 } from '#/utils/math.util';

import * as NPCRepository from '$/db/npc.db';
import * as InventoryRepository from '$/db/inventory.db';
import { defaultMap, PHYSICS_SOLID } from '#/maps/default.map';
import { ItemState } from '#/state/inventory.state';
import { InventoryServerEcs } from '../scripts/entity/InventoryServer.ecs';

import type { BoxSkin } from '#/state/box.state';

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

const DEER_SPAWNS: { name: string; display: string; pos: IVec3 }[] = [
	{ name: 'deer-1', display: 'Venado 1', pos: { x: 8, y: 0, z: 6 } },
	{ name: 'deer-2', display: 'Venado 2', pos: { x: 10, y: 0, z: 8 } },
	{ name: 'deer-3', display: 'Venado 3', pos: { x: 6, y: 0, z: 9 } },
];

export class ServerManagerEcs extends ComponentEcs {
	onStart(): void {
		const physics = this.world
			.get(ServerDataEcs)
			.map((sd) => sd.worldPhysic)
			.unwrap('World physic not found');

		// Create Plane
		const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, -1, 0);
		const body = physics.createRigidBody(bodyDesc);

		const colliderDesc = RAPIER.ColliderDesc.cuboid(100, 1, 100);
		const collider = physics.createCollider(colliderDesc, body);

		defaultMap.grid.forEach((row, z) => {
			row.forEach((cell, x) => {
				if (PHYSICS_SOLID.has(cell)) {
					const wallBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
						x + defaultMap.offsetX + 0.5,
						0,
						z + defaultMap.offsetY + 0.5,
					);
					const wallBody = physics.createRigidBody(wallBodyDesc);

					const wallColliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 1, 0.5);
					physics.createCollider(wallColliderDesc, wallBody);
				}

				if (cell === 5) {
					const tree = treeServerFactory({
						world: this.world,
						name: `tree-${x}-${z}`,
						pos: {
							x: x + defaultMap.offsetX + 0.5,
							y: 0,
							z: z + defaultMap.offsetY + 0.5,
						},
					});
					this.world.addEntity(tree);
				}
			});
		});

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

		const npcServerFactory = npcServerFactoryGenerator(this.world);
		const animalServerFactory = animalServerFactoryGenerator(this.world);

		NPCRepository.getAllNPCs({}).then((npcs) =>
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
			}),
		);

		DEER_SPAWNS.forEach(({ name, display, pos }) => {
			const deer = animalServerFactory({
				name,
				display,
				pos,
				skin: 'deer',
				life: 60,
				maxLife: 60,
				profile: {
					species: 'deer',
					homeRadius: 10,
					threatRadius: 7,
					fleeDistance: 12,
					minIdleMs: 1500,
					maxIdleMs: 4000,
					fleeRecoverMs: 2500,
					panicDurationMs: 5000,
					counterAttackRadius: 2.25,
					stareAfterAttackMs: 900,
				},
			});

			this.world.addEntity(deer);
		});

		this.callOnDelete(() => {
			physics.removeCollider(collider, true);
			physics.removeRigidBody(body);

			console.log('ServerManagerEcs cleaned up');
		});
	}
}
