import { flattenError, ZodError } from 'zod';
import { AxiosError } from 'axios';

export type ErrorResponse = { ok: false; message: string; error: any };
export type OkResponse<T> = { ok: true; message: string; data: T };

export function dispatchError(error: unknown): ErrorResponse {
	if (error instanceof ZodError) {
		console.error('ZodError', error);
		return {
			ok: false,
			message: 'Invalid response from server',
			error: flattenError(error),
		};
	}

	if (error instanceof AxiosError) {
		return {
			ok: false,
			message: error.response?.data?.message || 'Request failed',
			error: error.response?.data || null,
		};
	}

	if (error instanceof Error) {
		return {
			ok: false,
			message: error.message,
			error: null,
		};
	}

	return {
		ok: false,
		message: 'Login failed',
		error: null,
	};
}
