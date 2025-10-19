export const Result = {
	success<T>(value: T): { success: true; value: T } {
		return { success: true, value };
	},

	failure<E>(error: E): { success: false; error: E } {
		return { success: false, error };
	},

	isSuccess<T, E>(
		result: { success: true; value: T } | { success: false; error: E },
	): result is { success: true; value: T } {
		return result.success;
	},

	wrapAsync<T, E>(
		promise: Promise<T>,
	): Promise<{ success: true; value: T } | { success: false; error: E }> {
		return promise
			.then((value) => Result.success<T>(value))
			.catch((error) => Result.failure<E>(error));
	},

	wrap<T, E>(
		fn: () => T,
	): { success: true; value: T } | { success: false; error: E } {
		try {
			const value = fn();
			return Result.success<T>(value);
		} catch (error) {
			return Result.failure<E>(error as E);
		}
	},
};
