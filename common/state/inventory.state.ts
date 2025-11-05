import { MapSchema, Schema, type } from '@colyseus/schema';

import type { IVec3 } from '#/utils/math.util';

import { CharacterBodyState } from './character-body.state';

export class ItemState extends Schema {
	@type('string')
	public type: string;

	@type('int32')
	public quantity: number = 1;

	@type({ map: 'string' })
	public metadata: MapSchema<string>;

	constructor(
		type: string,
		quantity = 1,
		metadata: Record<string, string> = {},
	) {
		super();
		this.type = type;
		this.quantity = quantity;
		this.metadata = new MapSchema<string>(metadata);
	}
}

export class ItemEntityState extends Schema {
	@type(ItemState)
	public item: ItemState;

	@type(CharacterBodyState)
	public character: CharacterBodyState;

	constructor(
		pos: IVec3,
		type: string,
		quantity: number = 1,
		metadata: Record<string, string> = {},
	) {
		super();
		this.item = new ItemState(type, quantity, metadata);
		this.character = new CharacterBodyState(pos);
	}
}

export class InventoryState extends Schema {
	@type('boolean')
	public isOpen: boolean = false;

	@type('int32')
	public capacity: number = 20;

	@type({ map: ItemState })
	public items: MapSchema<ItemState> = new MapSchema<ItemState>();

	constructor(isOpen: boolean = false, capacity: number = 9 * 4) {
		super();
		this.isOpen = isOpen;
		this.capacity = capacity;
	}
}
