export interface IFollowOption {
	loop(delta: number): void;
	isDone(): boolean;
	toContextString(): string;
}
