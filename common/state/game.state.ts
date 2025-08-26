import { MapSchema, Schema, type } from '@colyseus/schema';

export class Vector3 extends Schema {
	@type('float32')
	public x: number = 0;

	@type('float32')
	public y: number = 0;

	@type('float32')
	public z: number = 0;

	constructor(data: { x: number; y: number; z: number }) {
		super();
		this.x = data.x;
		this.y = data.y;
		this.z = data.z;
	}
}

export class Quaternion extends Vector3 {
	@type('float32')
	public w: number = 1;

	constructor(data: { x: number; y: number; z: number; w: number }) {
		super(data);
		this.w = data.w;
	}
}

export class PlayerState extends Schema {
	@type('float32')
	public life: number = 100;

	@type(Vector3)
	public position: Vector3;

	@type(Quaternion)
	public rotation: Quaternion;

	constructor(pos: { x: number; y: number; z: number }) {
		super();
		this.position = new Vector3(pos);
		this.rotation = new Quaternion({ x: 0, y: 0, z: 0, w: 1 });
	}
}

export class GameState extends Schema {
	@type({ map: PlayerState })
	public players = new MapSchema<PlayerState>();
}
