import type { IFollowOption } from './follow-option.interface';

export class StopMovementOption implements IFollowOption {
	loop(_delta: number): void {
		// Stop movement logic
	}

	isDone(): boolean {
		return true; // Stop condition
	}

	toContextString(): string {
		return ['# Movement: You are stopped'].join('\n');
	}
}
