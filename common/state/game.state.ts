import type { IVec3 } from '#/utils/math.util';
import { MapSchema, Schema, type } from '@colyseus/schema';
import { CharacterState } from './character.state';

export class PlayerState extends Schema {
	@type('float32')
	public life: number = 100;

	@type(CharacterState)
	public character: CharacterState;

	constructor(pos: IVec3) {
		super();
		this.character = new CharacterState(pos);
	}
}

export class GameState extends Schema {
	@type({ map: PlayerState })
	public players = new MapSchema<PlayerState>();
}
