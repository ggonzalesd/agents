import { Option } from '#/utils/Option';
import { Stacker } from '#/utils/Stacker';
import { BaseEcs } from './Base.ecs';
import type { ComponentEcs } from './Component.ecs';
import type { EntityEcs } from './Entity.ecs';

export class WorldEcs extends BaseEcs {
	private entities: Map<string, EntityEcs> = new Map();
	public stacker: Stacker<string, any> = new Stacker();

	private __deferDelete: Set<EntityEcs> = new Set();
	private __deferAdd: Set<EntityEcs> = new Set();

	constructor(components: Record<string, ComponentEcs> = {}) {
		super();

		this.init(this, null, components);

		this.components.forEach((component) => {
			component.onStart();
			component.isSetup = true;
		});
	}

	getAll() {
		return [...this.entities.values()];
	}

	getEntity(_name: string | null | Option<string>): Option<EntityEcs> {
		if (_name == null) return Option.none();

		if (_name instanceof Option && _name.isNone()) {
			return Option.none();
		}

		const name = _name instanceof Option ? _name.unsafe() : _name;

		const entity = this.entities.get(name);

		return Option.of(entity);
	}

	addEntity(entity: EntityEcs) {
		entity.world = this;

		this.__deferAdd.add(entity);
	}

	deleteEntityById(id: string) {
		const entity = this.entities.get(id);
		if (entity) {
			this.deleteEntity(entity);
		}
	}

	deleteEntity(entity: EntityEcs) {
		entity.deleted = true;
		entity.active = false;

		this.__deferDelete.add(entity);
	}

	onUpdate(delta: number) {
		for (const entity of this.__deferAdd) {
			this.entities.set(entity.name, entity);
			entity.onStart();
		}
		if (this.__deferAdd.size > 0) {
			this.__deferAdd.clear();
		}

		this.update(delta);

		for (const entity of this.entities.values()) {
			if (!entity.active) continue;

			entity.onUpdate(delta);
		}

		for (const entity of this.__deferDelete) {
			entity.onDelete();
		}
		for (const entity of this.__deferDelete) {
			this.entities.delete(entity.name);
		}
		if (this.__deferDelete.size > 0) {
			this.__deferDelete.clear();
		}
	}

	onDelete() {
		const entities = [...this.entities.values()];
		for (const entity of entities) {
			entity.onDelete();
		}

		this.delete();
	}
}
