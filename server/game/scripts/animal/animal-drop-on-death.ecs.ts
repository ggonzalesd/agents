import { ComponentEcs, type EntityEcs } from '#/ecs';

import { itemServerFactory } from '$/game/prefab/item.server';

import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';
import { AnimalProfileEcs } from './animal-profile.ecs';

export class AnimalDropOnDeathEcs extends ComponentEcs {
	private entityParent: EntityEcs = null!;
	private character: CharacterBodyServerEcs = null!;
	private profile: AnimalProfileEcs = null!;
	private dropHandled = false;

	onStart(): void {
		this.entityParent = this.world
			.getEntity(this.parent)
			.unwrap('Parent not found');

		this.character = this.entityParent
			.get(CharacterBodyServerEcs)
			.unwrap('CharacterBodyServerEcs not found');

		this.profile = this.entityParent
			.get(AnimalProfileEcs)
			.unwrap('AnimalProfileEcs not found');
	}

	onLoop(): void {
		if (!this.character.isDead) {
			this.dropHandled = false;
			return;
		}

		if (this.dropHandled) return;

		this.dropHandled = true;

		const drop = this.profile.profile.drop;
		if (!drop) return;
		if (Math.random() > drop.chance) return;

		const position = this.character.body.translation();
		const itemEntity = itemServerFactory({
			world: this.world,
			name: `animal-drop-${this.parent}-${Date.now()}`,
			pos: {
				x: position.x,
				y: position.y + 2,
				z: position.z,
			},
			stats: {
				amount: drop.quantity,
				type: drop.itemType,
			},
		});

		this.world.addEntity(itemEntity);
	}
}
