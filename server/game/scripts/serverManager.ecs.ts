import * as RAPIER from '@dimforge/rapier3d-compat';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { ServerDataEcs } from './serverData.ecs';
import { itemServerFactory } from '../prefab/item.server';
import { npcServerFactoryGenerator } from '../prefab/npc.server';

import * as NPCRepository from '$/db/npc.db';
import { defaultMap } from '#/maps/default.map';

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
				if (cell === 1) {
					const wallBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
						x + defaultMap.offsetX + 0.5,
						0,
						z + defaultMap.offsetY + 0.5,
					);
					const wallBody = physics.createRigidBody(wallBodyDesc);

					const wallColliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 1, 0.5);
					physics.createCollider(wallColliderDesc, wallBody);
				}
			});
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

		NPCRepository.getAllNPCs({}).then((npcs) =>
			npcs.forEach((one) => {
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

				this.world.addEntity(npc);
			}),
		);

		this.callOnDelete(() => {
			physics.removeCollider(collider, true);
			physics.removeRigidBody(body);

			console.log('ServerManagerEcs cleaned up');
		});
	}
}
