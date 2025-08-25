import type { ComponentEcs } from './Component.ecs';
import { EntityEcs } from './Entity.ecs';
import { WorldEcs } from './World.ecs';

import { Option } from '#/utils/Option';

export class BaseEcs {
	protected components: Map<string, ComponentEcs> = new Map();

	private __world: WorldEcs = null!;
	private __entity: EntityEcs | null = null!;

	protected init(
		world: WorldEcs,
		entity: EntityEcs | null,
		components: Record<string, ComponentEcs>,
	) {
		this.__world = world;
		this.__entity = entity;

		for (const [name, component] of Object.entries(components)) {
			component.name = name;
			component.world = world;
			component.entity = Option.some(entity!);
			this.components.set(name, component);
		}

		for (const component of Object.values(components)) {
			component.onStart();
		}
	}

	public set(component: ComponentEcs, name?: string): BaseEcs {
		component.name = name ?? component.name;
		component.world = this.__world;
		component.entity = Option.some(this.__entity!);

		this.components.set(component.name, component);
		component.onStart();
		return this;
	}

	public getUnsafe<T extends ComponentEcs>(
		componentClass: new (...args: any[]) => T,
		name?: string,
	): T {
		const _name = name ?? componentClass.name;

		const component = this.components.get(_name);

		return component as T;
	}

	public get<T extends ComponentEcs>(
		componentClass: new (...args: any[]) => T,
		name?: string,
	): Option<T> {
		return Option.some(this.getUnsafe(componentClass, name));
	}

	protected update(delta: number) {
		for (const component of this.components.values()) {
			if (!component.active) continue;

			component.onLoop(delta);
		}
	}
}
