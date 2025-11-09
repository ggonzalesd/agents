import { itemServerFactory } from '$/game/prefab/item.server';

import { ComponentEcs } from '#/ecs';
import type { InventoryState } from '#/state/inventory.state';
import type { IVec3 } from '#/utils/math.util';

import { ItemServerBehavior } from '../item/itemServerBehavior.ecs';
import type { IContextAI } from '../context-ai/context.interface';

import { CharacterBodyServerEcs } from './CharacterBodyServer.ecs';

export class InventoryServerEcs extends ComponentEcs implements IContextAI {
	constructor(public inventoryState: InventoryState) {
		super();
	}

	public toStringContext(): string {
		const itemsList = Array.from(this.inventoryState.items.entries())
			.map(([id, item]) => `Slot ${id}: ${item.type}`)
			.join(', ');

		// return `- Inventory (Capacity: ${this.inventoryState.capacity}, Items: { ${itemsList} })`;
		return [
			`- Inventory:`,
			`   Capacity: ${this.inventoryState.capacity}`,
			`   Items: { ${itemsList} }`,
		].join('\n');
	}

	public isIdValid(id: number): boolean {
		if (Number.isNaN(id)) return false;
		if (!Number.isInteger(id)) return false;

		return id >= 0 && id < this.inventoryState.capacity;
	}

	public isIdFree(id: number): boolean {
		if (!this.isIdValid(id)) return false;
		return !this.inventoryState.items.has(id.toString());
	}

	public popItem(itemId: number) {
		if (!this.isIdValid(itemId)) return;

		const strId = itemId.toString();

		const item = this.inventoryState.items.get(strId);
		if (!item) return;

		this.inventoryState.items.delete(strId);
		return item;
	}

	/**
	 * Take an item from another inventory and add it to this one.
	 */
	public takeItemFromOther(
		other: InventoryServerEcs,
		itemId: number,
		newId: number,
	): void {
		if (!this.isIdFree(newId)) return;

		const item = other.popItem(itemId);
		if (!item) return;

		this.inventoryState.items.set(newId.toString(), item);
	}

	public moveItem(id: number, newId: number): void {
		if (newId < 0 || newId >= this.inventoryState.capacity) return;
		if (id === newId) return;

		const strId = id.toString();
		const newStrId = newId.toString();

		const item = this.inventoryState.items.get(strId);
		if (!item) return;

		const otherItem = this.inventoryState.items.get(newStrId);

		this.inventoryState.items.set(newStrId, item);

		if (otherItem) {
			this.inventoryState.items.set(strId, otherItem);
		} else {
			this.inventoryState.items.delete(strId);
		}
	}

	public dropItem(itemId: number): void {
		const strId = itemId.toString();
		const item = this.inventoryState.items.get(strId);
		if (!item) return;

		let spawnPosition: IVec3 = { x: 0, y: 0, z: 0 };

		this.world
			.getEntity(this.parent)
			.map((p) => p.getUnsafe(CharacterBodyServerEcs))
			.ifSome((c) => {
				spawnPosition = c.body.translation();
			});

		this.inventoryState.items.delete(strId);

		const itemEntity = itemServerFactory({
			world: this.world,
			name: `item-${itemId}-${Date.now()}`,
			pos: spawnPosition,
			stats: {
				amount: 1,
				type: item.type,
			},
		});

		this.world.addEntity(itemEntity);
	}

	public pickItemEntity(itemEntityId: string, newId: number): void {
		if (!this.isIdFree(newId)) return;

		const itemEntity = this.world.getEntity(itemEntityId).raw();
		if (!itemEntity) return;

		const itemServerBehavior = itemEntity.getUnsafe(ItemServerBehavior);
		if (!itemServerBehavior) return;

		this.inventoryState.items.set(
			newId.toString(),
			itemServerBehavior.state.item.clone(),
		);

		this.world.deleteEntity(itemEntity);
	}

	public getAvailableSlot(): number | null {
		for (let i = 0; i < this.inventoryState.capacity; i++) {
			if (this.isIdFree(i)) return i;
		}
		return null;
	}
}
