import type { IVec3 } from '#/utils/math.util';
import { ArraySchema, MapSchema, Schema, type } from '@colyseus/schema';

import { PlayerState } from './player.state';
import { BoxState } from './box.state';
import { InventoryState, ItemEntityState } from './inventory.state';
import { CharacterBodyState } from './character-body.state';
import { MovementState } from './movement.state';

export class GridPointState extends Schema {
	@type('int32')
	public x: number = 0;

	@type('int32')
	public y: number = 0;

	constructor(point: { x: number; y: number } = { x: 0, y: 0 }) {
		super();
		this.x = point.x;
		this.y = point.y;
	}
}

export class NPCDebugPathState extends Schema {
	@type('boolean')
	public active: boolean = false;

	@type('int32')
	public revision: number = 0;

	@type([GridPointState])
	public points = new ArraySchema<GridPointState>();
}

export class NPCState extends Schema {
	@type('string')
	public skin: string;

	@type('string')
	public npcType: string = 'AI';

	@type('string')
	public behaviorState: string = 'IDLE';

	@type(CharacterBodyState)
	public character: CharacterBodyState;

	@type(MovementState)
	public movement: MovementState = new MovementState();

	@type(InventoryState)
	public inventory: InventoryState = new InventoryState();

	@type(NPCDebugPathState)
	public debugPath: NPCDebugPathState = new NPCDebugPathState();

	@type('boolean')
	public hasDialogue: boolean = false;

	@type('boolean')
	public hasInventory: boolean = false;

	constructor(
		pos: IVec3,
		skin: string,
		life = 100,
		maxLife = 100,
		npcType = 'AI',
	) {
		super();
		this.character = new CharacterBodyState(pos, life, maxLife);
		this.skin = skin;
		this.npcType = npcType;
	}
}

export class GameState extends Schema {
	@type({ map: PlayerState })
	public players = new MapSchema<PlayerState>();

	@type({ map: NPCState })
	public npcs = new MapSchema<NPCState>();

	@type({ map: ItemEntityState })
	public items = new MapSchema<ItemEntityState>();

	@type({ map: BoxState })
	public boxes = new MapSchema<BoxState>();
}
