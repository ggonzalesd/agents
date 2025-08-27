import { Option } from './Option';

export class Stacker<T extends string, V = any> {
	private stacks: Map<T, V[]> = new Map();

	constructor(private maxStack: number = 100) {}

	stack(key: T, value: V, maxStack?: number): boolean {
		const stack = this.stacks.get(key) || [];

		if (stack.length >= (maxStack ?? this.maxStack)) {
			return false;
		}

		stack.push(value);
		this.stacks.set(key, stack);
		return true;
	}

	stackLoss(key: T, value: V, maxStack?: number) {
		const stack = this.stacks.get(key) || [];

		this.stacks.set(key, stack);

		if (stack.length >= (maxStack ?? this.maxStack)) {
			stack.shift();
		}

		stack.push(value);
		this.stacks.set(key, stack);
	}

	one(key: T): Option<V> {
		const value = this.stacks.get(key)?.shift();
		return Option.of(value);
	}

	dispatch(key: T, callback: (value: V) => void): void {
		const stack = [...(this.stacks.get(key) || [])];
		this.stacks.delete(key);
		stack.forEach(callback);
	}

	free(key: T) {
		this.stacks.delete(key);
	}
}
