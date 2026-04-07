import { Schema, type } from '@colyseus/schema';

import type { IVec3 } from '#/utils/math.util';

import { CharacterBodyState } from './character-body.state';
import { MovementState } from './movement.state';
import { InventoryState } from './inventory.state';

export class PlayerState extends Schema {
	@type('string')
	public sessionId: string;

	@type('string')
	public skin: string = 'default';

	@type(CharacterBodyState)
	public character: CharacterBodyState;

	@type(MovementState)
	public movement: MovementState = new MovementState();

	@type(InventoryState)
	public inventory: InventoryState = new InventoryState();

	constructor({
		pos,
		skin,
		sessionId,
		life,
		maxLife,
	}: {
		pos: IVec3;
		skin?: string;
		sessionId: string;
		life?: number;
		maxLife?: number;
	}) {
		super();
		this.character = new CharacterBodyState(pos, life, maxLife);
		this.skin = skin ?? this.skin;
		this.sessionId = sessionId;
	}
}
