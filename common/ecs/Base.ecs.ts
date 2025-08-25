import type { ComponentEcs } from './Component.ecs';

import { Option } from '#/utils/Option';

export class BaseEcs {
	protected components: Map<string, ComponentEcs> = new Map();

	private __world: any = null!;
	private __parent: string | null = null!;

	constructor() {}

	protected init(
		world: any,
		entity: any | null,
		components: Record<string, ComponentEcs>,
	) {
		this.__world = world;
		this.__parent = entity;

		for (const [name, component] of Object.entries(components)) {
			component.name = name;
			component.world = world;
			component.parent = this.__parent;
			this.components.set(name, component);
		}
	}

	/**
	 * Add a component to the entity.
	 * @param component - The component to add
	 * @param name - The name of the component, if not provided the component's name will be used
	 * @returns The current instance for chaining
	 */
	public set(component: ComponentEcs, name?: string): BaseEcs {
		component.name = name ?? component.name;
		component.world = this.__world;
		component.parent = this.__parent;

		this.components.set(component.name, component);
		component.onStart();
		return this;
	}

	/**
	 * Gets a component from the entity. Is **UNSAFE** to call if the component is not present
	 * @param componentClass - The class of the component to get
	 * @param name - The name of the component, if not provided the component's name will be used
	 * @returns The component instance or null if not found
	 */
	public getUnsafe<T extends ComponentEcs>(
		componentClass: new (...args: any[]) => T,
		name?: string,
	): T {
		const _name = name ?? componentClass.name;

		const component = this.components.get(_name);

		return component as T;
	}

	/**
	 * Gets a component from the entity.
	 * @param componentClass - The class of the component to get
	 * @param name - The name of the component, if not provided the component's name will be used
	 * @returns The component instance or null if not found
	 */
	public get<T extends ComponentEcs>(
		componentClass: new (...args: any[]) => T,
		name?: string,
	): Option<T> {
		return Option.some(this.getUnsafe(componentClass, name));
	}

	protected update(delta: number) {
		for (const component of this.components.values()) {
			if (!component.active || !component.isSetup) continue;

			component.onLoop(delta);
		}
	}
}
