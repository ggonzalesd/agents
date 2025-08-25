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
	 */
	public ifNone(fn: () => void): void {
		if (this.value == null) {
			fn();
		}
	}

	/**
	 * Executes a function if the Option instance contains a value
	 * @param fn - The function to execute
	 */
	public ifSome(fn: (value: T) => void): void {
		if (this.value != null) {
			fn(this.value);
		}
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
}
