export class Option<T = unknown> {
	private value: T | null;

	private constructor(value: T | null) {
		this.value = value;
	}

	static some<U>(value: U): Option<U> {
		return new Option(value);
	}

	static none<U>(): Option<U> {
		return new Option(null!);
	}

	public unwrap(): T {
		if (this.value === null) {
			throw new Error('No value present');
		}
		return this.value;
	}

	public isSome(): boolean {
		return this.value != null;
	}

	public isNone(): boolean {
		return this.value == null;
	}

	public ifNone(fn: () => void): void {
		if (this.value == null) {
			fn();
		}
	}

	public orElse(value: T): T {
		if (this.value == null) {
			return value;
		}
		return this.value;
	}

	public orElseThrow(error: Error): T {
		if (this.value == null) {
			throw error;
		}
		return this.value;
	}

	public map<U>(fn: (value: T) => U): Option<U> {
		if (this.value == null) {
			return Option.none() as unknown as Option<U>;
		}
		return Option.some(fn(this.value));
	}
}
