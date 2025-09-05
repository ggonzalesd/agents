import { type } from '@colyseus/schema';

export class ItemState {
	@type('string')
	public type: string;

	@type('int32')
	public quantity: number = 1;

	constructor(type: string) {
		this.type = type;
	}
}
