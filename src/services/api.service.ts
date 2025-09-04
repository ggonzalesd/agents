import axios from 'axios';
import { z } from 'zod';

import { loginResSchema, profileResSchema } from '#/schema/api.schema';
import {
	dispatchError,
	type ErrorResponse,
	type OkResponse,
} from '#/utils/http-client.util';

axios.defaults.withCredentials = true;

export const loginService = async (payload: {
	username: string;
	password: string;
}): Promise<
	OkResponse<z.infer<typeof loginResSchema>['data']> | ErrorResponse
> => {
	try {
		const response = await axios.post(
			`${import.meta.env.VITE_API_URL}/api/v1/auth/login`,
			payload,
		);

		const body = loginResSchema.parse(response.data);

		return {
			ok: true,
			message: body.message,
			data: body.data,
		};
	} catch (error) {
		return dispatchError(error);
	}
};

export const profileService = async (): Promise<
	OkResponse<z.infer<typeof profileResSchema>['data']> | ErrorResponse
> => {
	try {
		const response = await axios.get(
			`${import.meta.env.VITE_API_URL}/api/v1/auth/profile`,
		);

		const body = profileResSchema.parse(response.data);

		return {
			ok: true,
			message: body.message,
			data: body.data,
		};
	} catch (error) {
		return dispatchError(error);
	}
};
