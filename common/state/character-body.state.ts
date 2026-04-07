import { Schema, type } from '@colyseus/schema';

import type { IVec3 } from '#/utils/math.util';

import { Vector3 } from './share.state';

export class CharacterBodyState extends Schema {
	@type(Vector3)
	public position: Vector3;

	@type('float32')
	public rotationY: number = 0;

	@type('float32')
	public life: number = 100;

	@type('float32')
	public maxLife: number = 100;

	constructor(pos: IVec3, life = 100, maxLife = 100) {
		super();
		this.position = new Vector3(pos);
		this.life = life;
		this.maxLife = maxLife;
	}
}
