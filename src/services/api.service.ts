import type { z } from 'zod';

import { httpService } from '@/services/http.service';

import {
	loginResSchema,
	profileResSchema,
	uploadSkinResSchema,
} from '#/schema/api.schema';

import {
	type createNpcRequestSchema,
	getNpcResSchema,
	listNpcsResSchema,
} from '#/schema/npc.schema';

import {
	dispatchError,
	type ErrorResponse,
	type OkResponse,
} from '#/utils/http-client.util';

export const loginService = async (payload: {
	username: string;
	password: string;
}): Promise<
	OkResponse<z.infer<typeof loginResSchema>['data']> | ErrorResponse
> => {
	try {
		const response = await httpService.post('/auth/login', payload);

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
		const response = await httpService.get('/auth/profile');

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

		const response = await httpService.put('/skin/upload', formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		});

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

export const getOneNPCService = async (
	npcId: string,
): Promise<z.infer<typeof getNpcResSchema>['data']> => {
	const response = await httpService.get(`/npc/${npcId}`);

	const body = getNpcResSchema.parse(response.data);

	return body.data;
};

export const createNPCService = async (
	payload: z.infer<typeof createNpcRequestSchema>,
): Promise<
	OkResponse<z.infer<typeof getNpcResSchema>['data']> | ErrorResponse
> => {
	try {
		const response = await httpService.post('/npc', payload);

		const body = getNpcResSchema.parse(response.data);

		return {
			ok: true,
			message: body.message,
			data: body.data,
		};
	} catch (error) {
		return dispatchError(error);
	}
};

export const updateNPCService = async (
	npcId: string,
	payload: z.infer<typeof createNpcRequestSchema>,
): Promise<{
	id: string;
	name: string;
	description: string;
}> => {
	const response = await httpService.put<
		OkResponse<{
			id: string;
			name: string;
			description: string;
		}>
	>(`/npc/${npcId}`, payload);

	// const body = getNpcResSchema.parse(response.data);

	return response.data.data;
};

export const getAllNPCsService = async (): Promise<
	OkResponse<z.infer<typeof listNpcsResSchema>['data']>
> => {
	const response = await httpService.get('/npc');
	const body = listNpcsResSchema.parse(response.data);

	return {
		ok: true,
		message: body.message,
		data: body.data,
	};
};
