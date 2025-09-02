import type { IVec3, IVec4 } from '#/utils/math.util';
import { Schema, type } from '@colyseus/schema';

export class Vector3 extends Schema {
	@type('float32')
	public x: number = 0;

	@type('float32')
	public y: number = 0;

	@type('float32')
	public z: number = 0;

	constructor(data: IVec3 = { x: 0, y: 0, z: 0 }) {
		super();
		this.x = data.x;
		this.y = data.y;
		this.z = data.z;
	}
}

export class Quaternion extends Vector3 {
	@type('float32')
	public w: number = 1;

	constructor(data: IVec4 = { x: 0, y: 0, z: 0, w: 1 }) {
		super(data);
		this.w = data.w;
	}
}
