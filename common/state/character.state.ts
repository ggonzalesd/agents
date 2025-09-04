import { Schema, type } from '@colyseus/schema';
import { Vector3 } from './share.state';
import type { IVec3 } from '#/utils/math.util';

export class CharacterState extends Schema {
	@type(Vector3)
	public position: Vector3;

	@type('float32')
	public rotationY: number = 0;

	@type('boolean')
	public isMoving: boolean = false;

	@type('string')
	public skin: string = 'default';

	constructor(pos: IVec3, skin: string = 'default') {
		super();
		this.position = new Vector3(pos);
		this.skin = skin;
	}
}
