import { MapSchema, type } from '@colyseus/schema';
import { Vector3 } from './share.state';
import type { IVec3 } from '#/utils/math.util';
import { ItemState } from './inventory.state';
import { AgentState } from './agent.state';

export class CharacterState extends AgentState {
	@type('boolean')
	public isMoving: boolean = false;

	@type('string')
	public skin: string = 'default';

	@type({ map: ItemState })
	inventory: MapSchema<ItemState> = new MapSchema<ItemState>();

	constructor(pos: IVec3, skin: string = 'default') {
		super(pos);
		this.position = new Vector3(pos);
		this.skin = skin;
	}
}
