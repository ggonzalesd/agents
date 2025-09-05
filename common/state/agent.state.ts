import { Schema, type } from '@colyseus/schema';

import type { IVec3 } from '#/utils/math.util';

import { Vector3 } from './share.state';

export class AgentState extends Schema {
	@type(Vector3)
	public position: Vector3;

	@type('float32')
	public rotationY: number = 0;

	constructor(pos: IVec3) {
		super();
		this.position = new Vector3(pos);
	}
}
