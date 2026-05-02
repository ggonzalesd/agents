import { ComponentEcs } from '#/ecs';

import { itemServerFactory } from '$/game/prefab/item.server';

import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';
import { ServerDataEcs } from '../serverData.ecs';

const TREE_DROP_PROBABILITY = 0.25;
const TREE_HIT_COOLDOWN_MS = 400;
const TREE_DROP_ITEM = 'apple';
const TREE_COLLIDER_RADIUS = 0.35;
const TREE_DROP_MIN_RADIUS = TREE_COLLIDER_RADIUS + 0.3;
const TREE_DROP_MAX_RADIUS = TREE_COLLIDER_RADIUS + 1.2;

export class TreeServerBehavior extends ComponentEcs {
	private static readonly DROP_HEIGHT = 4;

	private character: CharacterBodyServerEcs = null!;
	private serverData: ServerDataEcs = null!;
	private lastHitAt = 0;

	onStart(): void {
		this.serverData = this.world
			.get(ServerDataEcs)
			.unwrap('ServerDataEcs not found');

		this.character = this.world
			.getEntity(this.parent)
			.map((entity) => entity.getUnsafe(CharacterBodyServerEcs))
			.unwrap('CharacterBodyServerEcs not found');
	}

	public onHit(attackerId: string): void {
		const now = Date.now();
		if (now - this.lastHitAt < TREE_HIT_COOLDOWN_MS) return;
		this.lastHitAt = now;

		const position = this.character.body.translation();
		this.serverData.room.broadcast('tree:hit', {
			id: this.parent,
			attackerId,
			x: position.x,
			y: position.y + 1,
			z: position.z,
		});

		if (Math.random() >= TREE_DROP_PROBABILITY) return;

		const angle = Math.random() * Math.PI * 2;
		const radius =
			TREE_DROP_MIN_RADIUS +
			Math.random() * (TREE_DROP_MAX_RADIUS - TREE_DROP_MIN_RADIUS);
		const itemEntity = itemServerFactory({
			world: this.world,
			name: `tree-drop-${this.parent}-${Date.now()}`,
			pos: {
				x: position.x + Math.cos(angle) * radius,
				y: position.y + TreeServerBehavior.DROP_HEIGHT,
				z: position.z + Math.sin(angle) * radius,
			},
			stats: {
				amount: 1,
				type: TREE_DROP_ITEM,
			},
		});

		this.world.addEntity(itemEntity);
	}
}
