import type { IVec3 } from '#/utils/math.util';
import { MapSchema, Schema, type } from '@colyseus/schema';
import { CharacterState } from './character.state';
import { AgentState } from './agent.state';

export class NPCState extends Schema {
	@type(CharacterState)
	public character: CharacterState;

	constructor(pos: IVec3, skin: string) {
		super();
		this.character = new CharacterState(pos, skin);
	}
}

export class PlayerState extends Schema {
	@type('float32')
	public life: number = 100;

	@type(CharacterState)
	public character: CharacterState;

	constructor(pos: IVec3, skin: string) {
		super();
		this.character = new CharacterState(pos, skin);
	}
}

export class ItemEntityState extends AgentState {
	@type('string')
	public type: string;

	@type('int32')
	public quantity: number = 1;

	constructor(pos: IVec3, type: string, quantity: number = 1) {
		super(pos);
		this.type = type;
		this.quantity = quantity;
	}
}

export class GameState extends Schema {
	@type({ map: PlayerState })
	public players = new MapSchema<PlayerState>();

	@type({ map: NPCState })
	public npcs = new MapSchema<NPCState>();

	@type({ map: ItemEntityState })
	public items = new MapSchema<ItemEntityState>();
}
