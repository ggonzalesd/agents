import type { IVec3 } from '#/utils/math.util';
import { MapSchema, Schema, type } from '@colyseus/schema';

import { PlayerState } from './player.state';
import { ItemEntityState } from './inventory.state';
import { CharacterBodyState } from './character-body.state';

export class NPCState extends Schema {
	@type('string')
	public skin: string;

	@type(CharacterBodyState)
	public character: CharacterBodyState;

	constructor(pos: IVec3, skin: string) {
		super();
		this.character = new CharacterBodyState(pos);
		this.skin = skin;
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
