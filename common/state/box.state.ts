import { Schema, type } from '@colyseus/schema';

import type { IVec3 } from '#/utils/math.util';

import { CharacterBodyState } from './character-body.state';

export type BoxSkin = 'box_stacked' | 'crate';

export class BoxState extends Schema {
	@type(CharacterBodyState)
	public character: CharacterBodyState;

	@type('string')
	public skin: BoxSkin;

	constructor(
		pos: IVec3,
		skin: BoxSkin = 'box_stacked',
		life = 30,
		maxLife = 30,
	) {
		super();
		this.character = new CharacterBodyState(pos, life, maxLife);
		this.skin = skin;
	}
}
