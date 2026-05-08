import { Schema, type } from '@colyseus/schema';

import type { IVec3 } from '#/utils/math.util';

import { Vector3 } from './share.state';

export class FloatingTextState extends Schema {
	@type(Vector3)
	public position: Vector3;

	@type('string')
	public text: string;

	@type('string')
	public foreground: string;

	@type('string')
	public background: string;

	@type('float32')
	public fontSize: number;

	constructor(
		pos: IVec3,
		text: string,
		foreground: string = '#ffffff',
		background: string = '#000000',
		fontSize: number = 20,
	) {
		super();
		this.position = new Vector3(pos);
		this.text = text;
		this.foreground = foreground;
		this.background = background;
		this.fontSize = fontSize;
	}
}
