import axios from 'axios';
import type { z } from 'zod';

import {
	loginResSchema,
	profileResSchema,
	uploadSkinResSchema,
} from '#/schema/api.schema';
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

export const uploadSkinService = async (
	skin: File,
): Promise<
	OkResponse<z.infer<typeof uploadSkinResSchema>['data']> | ErrorResponse
> => {
	try {
		const formData = new FormData();
		formData.append('file', skin);

		const response = await axios.put(
			`${import.meta.env.VITE_API_URL}/api/v1/skin/upload`,
			formData,
			{
				headers: {
					'Content-Type': 'multipart/form-data',
				},
			},
		);

		const body = uploadSkinResSchema.parse(response.data);

		return {
			ok: true,
			message: body.message,
			data: body.data,
		};
	} catch (error) {
		return dispatchError(error);
	}
};
