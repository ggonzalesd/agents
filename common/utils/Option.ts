export class Option<T = unknown> {
	private value: T | null;

	private constructor(value?: T | null) {
		this.value = value ?? null;
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
	public unwrap(): T {
		if (this.value === null) {
			throw new Error('No value present');
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
	public ifNone(fn: () => void): Option<T> {
		if (this.value == null) {
			fn();
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

	/**
	 * Populates the Option instance with a value
	 * @param value - The value to wrap
	 * @returns The Option instance
	 */
	public populate(value: T): Option<T> {
		this.value = value;
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
		this.value = op.raw();
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
	public giveTo(op: Option<T>): void {
		op.populate(this.value!);
		this.value = null;
	}
}
