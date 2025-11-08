import axios from 'axios';
import z, { flattenError } from 'zod';

type StandarError = {
	message: string;
	errors: {
		[key: string]: string[];
	};
};

const errorsSchema = z.record(z.string(), z.array(z.string()));

export function standarError(error: unknown): StandarError {
	if (typeof error === 'string') {
		return {
			message: error,
			errors: {},
		};
	}

	if (error instanceof z.ZodError) {
		const flattened = flattenError(error);

		return {
			message: 'Validation error',
			errors: flattened.fieldErrors,
		};
	}

	if (error instanceof axios.AxiosError && error.response?.data) {
		const data = error.response.data;
		const errorsParse = errorsSchema.safeParse(data?.errors);

		return {
			message: data?.message || error.message,
			errors: errorsParse.success ? errorsParse.data : {},
		};
	}

	if (error instanceof Error) {
		return {
			message: error.message,
			errors: {},
		};
	}

	return {
		message: 'Unknown error',
		errors: {},
	};
}
