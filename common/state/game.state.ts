import { MapSchema, Schema, type } from '@colyseus/schema';

export class Vector3 extends Schema {
	@type('float32')
	public x: number = 0;

	@type('float32')
	public y: number = 0;

	@type('float32')
	public z: number = 0;
}

export class PlayerState extends Schema {
	@type('float32')
	public life: number = 100;

	@type(Vector3)
	public position: Vector3;

	constructor(pos: { x: number; y: number; z: number }) {
		super();
		this.position = new Vector3(pos);
	}
}

export class GameState extends Schema {
	@type({ map: PlayerState })
	public players = new MapSchema<PlayerState>();
}
