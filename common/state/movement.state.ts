import { Schema, type } from '@colyseus/schema';

export class MovementState extends Schema {
	@type('boolean')
	public isMoving = false;
	@type('boolean')
	public isJumping = false;
	@type('boolean')
	public isRunning = false;
}
