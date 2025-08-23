import { MapSchema, Schema, type } from '@colyseus/schema';

export class PlayerState extends Schema {
	@type('float32')
	public life!: number;

	constructor() {
		super();
		this.life = 100;
	}
}

export class GameState extends Schema {
	@type({ map: PlayerState })
	public players = new MapSchema<PlayerState>();
}
