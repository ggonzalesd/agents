import { Schema, type } from '@colyseus/schema';

import type { IVec3 } from '#/utils/math.util';

import { Vector3 } from './share.state';

export class TriggerZoneState extends Schema {
	@type(Vector3)
	public position: Vector3;

	@type('float32')
	public radius: number;

	@type('float32')
	public height: number;

	@type('int32')
	public color: number;

	constructor(pos: IVec3, radius = 2, height = 4, color = 0xff0000) {
		super();
		this.position = new Vector3(pos);
		this.radius = radius;
		this.height = height;
		this.color = color;
	}
}
