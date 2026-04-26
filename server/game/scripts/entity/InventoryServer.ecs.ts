import { itemServerFactory } from '$/game/prefab/item.server';

import { ComponentEcs } from '#/ecs';
import { ItemState, type InventoryState } from '#/state/inventory.state';
import type { IVec3 } from '#/utils/math.util';

import { ItemServerBehavior } from '../item/itemServerBehavior.ecs';
import type { IContextAI } from '../context-ai/context.interface';

import { CharacterBodyServerEcs } from './CharacterBodyServer.ecs';
import { type ConsumeResult, applyItemEffects } from './item-effect.handler';

export class InventoryServerEcs extends ComponentEcs implements IContextAI {
	constructor(public inventoryState: InventoryState) {
		super();
	}

	public toStringContext(): string {
		const itemsList = Array.from(this.inventoryState.items.entries())
			.map(([id, item]) => {
				const label = id === '0' ? `Slot ${id}: ${item.type} [EQUIPPED]` : `Slot ${id}: ${item.type}`;
				return label;
			})
			.join(', ');

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

	public splitItem(fromSlot: number, toSlot: number, quantity: number): void {
		if (!this.isIdValid(fromSlot) || !this.isIdFree(toSlot)) return;

		const strFrom = fromSlot.toString();
		const item = this.inventoryState.items.get(strFrom);
		if (!item) return;

		if (quantity <= 0 || quantity >= item.quantity) return;

		item.quantity -= quantity;

		const metadataRecord: Record<string, string> = {};
		item.metadata.forEach((value, key) => {
			metadataRecord[key] = value;
		});

		this.inventoryState.items.set(
			toSlot.toString(),
			new ItemState(item.type, quantity, metadataRecord),
		);
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

		// Check if the itemEntity is within 2 meters of the character before picking it up
		const characterPosition = this.world
			.getEntity(this.parent)
			.map((p) => p.getUnsafe(CharacterBodyServerEcs))
			.map((c) => c.body.translation())
			.raw();
		console.log('Character Position:', characterPosition);
		if (!characterPosition) return;

		const itemPosition = itemEntity
			.getUnsafe(CharacterBodyServerEcs)
			.body.translation();

		const distanceSquared =
			(characterPosition.x - itemPosition.x) ** 2 +
			(characterPosition.y - itemPosition.y) ** 2 +
			(characterPosition.z - itemPosition.z) ** 2;

		if (distanceSquared >= 4) {
			console.log('Item is too far to pick up:', {
				distanceSquared,
			});
			return;
		}

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

	public consumeItem(slot: number): ConsumeResult {
		if (!this.isIdValid(slot)) {
			return { success: false, message: 'Invalid slot' };
		}

		const strSlot = slot.toString();
		const item = this.inventoryState.items.get(strSlot);
		if (!item) {
			return { success: false, message: 'No item in that slot' };
		}

		const parentEntity = this.world.getEntity(this.parent).raw();
		if (!parentEntity) {
			return { success: false, message: 'Entity not found' };
		}

		const result = applyItemEffects(parentEntity, item);

		if (result.success) {
			if (item.quantity <= 1) {
				this.inventoryState.items.delete(strSlot);
			} else {
				item.quantity -= 1;
			}
		}

		return result;
	}
}
