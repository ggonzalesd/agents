type UnwrapOption<T> = T extends Option<infer U> ? UnwrapOption<U> : T;

type Fn<I, O> = (input: I) => O;

type PipeValue<Value, Fns extends Fn<any, any>[]> = Fns extends [
	Fn<infer I, infer O>,
	...infer Rest,
]
	? Value extends I
		? Rest extends [Fn<O, any>, ...any[]]
			? PipeValue<O, Rest>
			: O
		: never
	: Value;

export function chain<Value, Fns extends Fn<any, any>[]>(
	value: Value,
	...fns: Fns
): PipeValue<Value, Fns> {
	return fns.reduce((acc, fn) => fn(acc), value) as any;
}

export class Option<T = unknown> {
	private value: T | null;

	private constructor(value?: T | null) {
		this.value = value ?? null;
	}

	public collapse(): Option<UnwrapOption<T>> {
		let current: any = this as Option<any>;

		while (current.value instanceof Option) {
			current = current.value;
		}

		return current as Option<UnwrapOption<T>>;
	}

	/**
	 * Pipes the value through a series of functions
	 * @param fns - The functions to apply
	 * @returns The final result wrapped in an Option
	 */
	pipe<Fns extends Fn<any, any>[]>(...fns: Fns): Option<PipeValue<T, Fns>> {
		if (this.value == null) {
			return Option.none() as any;
		}

		const result = fns.reduce((acc, fn) => fn(acc), this.value);

		return Option.of(result) as any;
	}

	/**
	 * Wraps a promise in an Option
	 * @param promise - The promise to wrap
	 * @returns A promise that resolves to an Option
	 */
	static future<U>(promise: Promise<U | null | undefined>) {
		return promise.then((value) => Option.of(value));
	}

	/**
	 * Creates a new Option instance with a value
	 * @param value - The value to wrap
	 * @returns A new Option instance
	 */
	static of<U>(value?: U | null | undefined): Option<U> {
		return new Option(value);
	}

	/**
	 * Creates a new Option instance with a value
	 * @param value - The value to wrap
	 * @returns A new Option instance
	 */
	static some<U>(value: U): Option<U> {
		return new Option(value);
	}

	/**
	 * Creates a new Option instance with no value
	 * @returns A new Option instance
	 */
	static none<U>(): Option<U> {
		return new Option(null!);
	}

	/**
	 * Gets the value wrapped in the Option instance, **UNSAFE!**
	 * @deprecated Use `unwrap` instead
	 * @returns The wrapped value
	 */
	public unsafe(): T {
		return this.value as T;
	}

	/**
	 * Gets the raw value wrapped in the Option instance
	 * @returns The wrapped value or null
	 */
	public raw(): T | null {
		return this.value;
	}

	/**
	 * Gets the value wrapped in the Option instance, throws if no value is present
	 * @returns The wrapped value
	 */
	public unwrap(message = 'No value present'): T {
		if (this.value === null) {
			throw new Error(message);
		}
		return this.value;
	}

	/**
	 * Checks if the Option instance contains a value
	 * @returns True if a value is present, false otherwise
	 */
	public isSome(): boolean {
		return this.value != null;
	}

	/**
	 * Checks if the Option instance contains no value
	 * @returns True if no value is present, false otherwise
	 */
	public isNone(): boolean {
		return this.value == null;
	}

	/**
	 * Executes a function if the Option instance contains no value
	 * @param fn - The function to execute
	 * @returns The Option instance
	 */
	public ifNone(...fn: Array<() => void>): Option<T> {
		const value = this.value;
		if (value == null) {
			fn.forEach((f) => f());
		}
		return this;
	}

	/**
	 * Executes functions if the Option instance contains a value
	 * @param fn - The function to execute
	 * @returns The Option instance
	 */
	public ifSome(...fns: Array<(value: T) => void>): Option<T> {
		const value = this.value;
		if (value != null) {
			fns.forEach((fn) => fn(value));
		}
		return this;
	}

	/**
	 * Returns the value wrapped in the Option instance, or a default value if no value is present
	 * @param value - The default value to return if no value is present
	 * @returns The wrapped value or the default value
	 */
	public orElse(value: T): T {
		if (this.value == null) {
			return value;
		}
		return this.value;
	}

	/**
	 * Returns the value wrapped in the Option instance, or throws an error if no value is present
	 * @param error - The error to throw if no value is present
	 * @returns The wrapped value
	 */
	public orElseThrow(error: Error | (() => Error)): T {
		if (this.value == null) {
			throw typeof error === 'function' ? error() : error;
		}
		return this.value;
	}

	/**
	 * Maps the value wrapped in the Option instance to a new value
	 * @param fn - The function to apply to the wrapped value
	 * @returns A new Option instance with the mapped value
	 */
	public map<U>(fn: (value: T) => U): Option<U> {
		if (this.value == null) {
			return Option.none() as unknown as Option<U>;
		}
		return Option.some(fn(this.value));
	}

	public pick<U extends Array<any>>(
		this: Option<U>,
		index: number,
	): Option<U[number]>;
	public pick<U extends Record<string, any>, K extends keyof U>(
		this: Option<U>,
		key: K,
	): Option<U[K]>;
	public pick(this: Option<any>, key: string): Option<unknown>;

	public pick(this: Option<any>, key: any): Option<any> {
		if (this.value == null) return Option.none();

		if (Array.isArray(this.value) && typeof key === 'number') {
			return Option.of(this.value[key]);
		}

		if (typeof this.value === 'object' && typeof key === 'string') {
			return Option.of(this.value[key]);
		}

		return Option.none();
	}

	/**
	 * Populates the Option instance with a value
	 * @param value - The value to wrap
	 * @returns The Option instance
	 */
	public populate(value: T): Option<T> {
		this.value = value ?? null;
		return this;
	}

	/**
	 * Clears the value wrapped in the Option instance
	 * @returns The Option instance
	 */
	public clear(): Option<T> {
		this.value = null;
		return this;
	}

	/**
	 * Copies the value from another Option instance
	 * @param op - The Option instance to copy from
	 * @returns The Option instance
	 */
	public copy(op: Option<T>): Option<T> {
		this.value = op.raw() ?? null;
		return this;
	}

	/**
	 * Clones the Option instance
	 * @returns A new Option instance with the same value
	 */
	public clone(): Option<T> {
		return new Option(this.value);
	}

	/**
	 * Gives the value to another option instance, **consuming** the original value
	 * @param op - The Option instance to give the value to
	 */
	public giveTo(op: Option<T>) {
		op.populate(this.value!);
		this.value = null;
		return op;
	}

	/**
	 * Returns a new Option instance if the filter function returns true for the wrapped value
	 * @param fn - The filter function to apply
	 * @returns A new Option instance with the wrapped value if the filter function returns true, or an empty Option instance otherwise
	 */
	public filter(...fn: Array<(value: T) => boolean>): Option<T> {
		if (this.value == null) return Option.none();

		const value = this.value;
		if (fn.every((f) => f(value))) {
			return this;
		}

		return Option.none();
	}

	static zip(): Option<unknown>;
	static zip<T extends readonly Option<any>[]>(
		...options: T
	): Option<{ [K in keyof T]: T[K] extends Option<infer U> ? U : never }>;
	static zip<R extends Record<string, Option<any>>>(
		options: R,
	): Option<{ [K in keyof R]: R[K] extends Option<infer U> ? U : never }>;

	static zip(...args: any[]): Option<any> {
		if (
			args.length === 1 &&
			typeof args[0] === 'object' &&
			!Array.isArray(args[0])
		) {
			const record = args[0];
			const result: any = {};

			if (Object.keys(record).length === 0) {
				return Option.none();
			}

			for (const key in record) {
				const opt = record[key];
				if (opt.value == null) return Option.none();
				result[key] = opt.value;
			}

			return Option.some(result);
		}

		const opts = args as Option<any>[];
		if (opts.some((opt) => opt.value == null)) return Option.none();
		return Option.some(opts.map((opt) => opt.value));
	}

	build(fn: (opt: Option<T>) => null | undefined): Option<unknown>;
	build<R extends readonly Option<any>[]>(
		fn: (opt: Option<T>) => R,
	): Option<{ [K in keyof R]: R[K] extends Option<infer U> ? U : never }>;
	build<R extends Record<string, Option<any>>>(
		fn: (opt: Option<T>) => R,
	): Option<{ [K in keyof R]: R[K] extends Option<infer U> ? U : never }>;

	build(fn: (opt: Option<T>) => any): Option<unknown> {
		const result = fn(this);

		if (result == null) return Option.none();

		if (Array.isArray(result)) {
			return Option.zip(...result);
		} else {
			return Option.zip(result);
		}
	}
}
