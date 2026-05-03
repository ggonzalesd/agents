import { ComponentEcs } from '#/ecs';
import type { BoxState } from '#/state/box.state';

import { itemServerFactory } from '$/game/prefab/item.server';

import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';
import { ServerDataEcs } from '../serverData.ecs';

const BOX_DROP_ITEMS = ['sword', 'potion', 'cookie', 'seeds', 'coin'] as const;
const BOX_COLLIDER_RADIUS = 0.45;
const BOX_DROP_MIN_RADIUS = BOX_COLLIDER_RADIUS + 0.15;
const BOX_DROP_MAX_RADIUS = BOX_COLLIDER_RADIUS + 0.75;

export class BoxServerBehavior extends ComponentEcs {
	private static readonly DROP_HEIGHT = 3;

	public state: BoxState;
	private readonly customDropItems: string[] | null;
	private character: CharacterBodyServerEcs = null!;
	private serverData: ServerDataEcs = null!;
	constructor({ state, dropItems }: { state: BoxState; dropItems?: string[] }) {
		super();
		this.state = state;
		this.customDropItems = dropItems?.length ? dropItems : null;
	}

	onStart(): void {
		this.serverData = this.world
			.get(ServerDataEcs)
			.unwrap('ServerDataEcs not found');

		this.character = this.world
			.getEntity(this.parent)
			.map((entity) => entity.getUnsafe(CharacterBodyServerEcs))
			.unwrap('CharacterBodyServerEcs not found');

		const parent = this.world.getEntity(this.parent).unwrap('Parent not found');
		this.serverData.state.boxes.set(parent.name, this.state);

		this.callOnDelete(() => {
			this.serverData.state.boxes.delete(parent.name);
		});
	}

	public onHit(damage: number): void {
		const life = this.state.character.life;
		if (life <= 0) return;

		this.state.character.life = Math.max(0, life - damage);
		if (this.state.character.life > 0) return;

		const position = this.character.body.translation();
		this.serverData.room.broadcast('box:break', {
			id: this.parent,
			x: position.x,
			y: position.y + 0.75,
			z: position.z,
		});

		const dropPool = this.customDropItems ?? BOX_DROP_ITEMS;
		const itemType =
			dropPool[Math.floor(Math.random() * dropPool.length)];
		const angle = Math.random() * Math.PI * 2;
		const radius =
			BOX_DROP_MIN_RADIUS +
			Math.random() * (BOX_DROP_MAX_RADIUS - BOX_DROP_MIN_RADIUS);
		const itemEntity = itemServerFactory({
			world: this.world,
			name: `box-drop-${this.parent}-${Date.now()}`,
			pos: {
				x: position.x + Math.cos(angle) * radius,
				y: position.y + BoxServerBehavior.DROP_HEIGHT,
				z: position.z + Math.sin(angle) * radius,
			},
			stats: {
				amount: 1,
				type: itemType,
			},
		});

		this.world.addEntity(itemEntity);

		const parent = this.world.getEntity(this.parent).raw();
		if (!parent) return;

		this.world.deleteEntity(parent);
	}
}
