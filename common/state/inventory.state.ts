import { Schema, type } from '@colyseus/schema';

import type { IVec3 } from '#/utils/math.util';

import { CharacterBodyState } from './character-body.state';

export class ItemState {
	@type('string')
	public type: string;

	@type('int32')
	public quantity: number = 1;

	constructor(type: string) {
		this.type = type;
	}
}

export class ItemEntityState extends Schema {
	@type('string')
	public type: string;

	@type('int32')
	public quantity: number = 1;

	@type(CharacterBodyState)
	public character: CharacterBodyState;

	constructor(pos: IVec3, type: string, quantity: number = 1) {
		super(pos);
		this.type = type;
		this.quantity = quantity;
		this.character = new CharacterBodyState(pos);
	}
}
