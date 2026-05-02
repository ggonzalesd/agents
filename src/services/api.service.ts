import type { z } from 'zod';

import { httpService } from '@/services/http.service';

import {
	loginResSchema,
	profileResSchema,
	uploadSkinResSchema,
	redeemTokenResSchema,
	redeemTokenListResSchema,
	refreshResSchema,
} from '#/schema/api.schema';
import {
	experimentStateApiResponseSchema,
	experimentListApiResponseSchema,
	experimentAdminActiveApiResponseSchema,
	submitExperimentFeedbackRequestSchema,
} from '#/schema/experiment.schema';

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
import {
	type createUserRequestSchema,
	getUserResSchema,
	listUsersResSchema,
} from '#/schema/user.schema';

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

// NPC Services

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

// User Services

export const getOneUserService = async (
	userId: string,
): Promise<z.infer<typeof getUserResSchema>['data']> => {
	const response = await httpService.get(`/user/${userId}`);
	const body = getUserResSchema.parse(response.data);

	return body.data;
};

export const createUserService = async (
	payload: z.infer<typeof createUserRequestSchema>,
): Promise<
	OkResponse<z.infer<typeof getUserResSchema>['data']> | ErrorResponse
> => {
	try {
		const response = await httpService.post('/user', payload);

		const body = getUserResSchema.parse(response.data);

		return {
			ok: true,
			message: body.message,
			data: body.data,
		};
	} catch (error) {
		return dispatchError(error);
	}
};

export const updateUserService = async (
	userId: string,
	payload: z.infer<typeof createUserRequestSchema>,
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
	>(`/user/${userId}`, payload);

	return response.data.data;
};

export const getAllUsersService = async (): Promise<
	OkResponse<z.infer<typeof listUsersResSchema>['data']>
> => {
	const response = await httpService.get('/user');
	const body = listUsersResSchema.parse(response.data);

	return {
		ok: true,
		message: body.message,
		data: body.data,
	};
};

// Mission Services

import {
	type CreateMissionInput,
	createMissionResSchema,
	getMissionResSchema,
	listMissionsResSchema,
	listMissionsWithAcceptancesResSchema,
	acceptMissionResSchema,
	completeMissionResSchema,
	abandonMissionResSchema,
} from '#/schema/mission.schema';

export const getOpenMissionsService = async (
	limit = 20,
): Promise<
	OkResponse<z.infer<typeof listMissionsResSchema>['data']> | ErrorResponse
> => {
	try {
		const response = await httpService.get(`/mission?limit=${limit}`);
		const body = listMissionsResSchema.parse(response.data);
		return { ok: true, message: body.message, data: body.data };
	} catch (error) {
		return dispatchError(error);
	}
};

export const getMissionsByEntityIdService = async (
	identifier: string,
	limit = 20,
): Promise<
	OkResponse<z.infer<typeof listMissionsResSchema>['data']> | ErrorResponse
> => {
	try {
		const response = await httpService.get(
			`/mission/entity/${identifier}?limit=${limit}`,
		);
		const body = listMissionsResSchema.parse(response.data);
		return { ok: true, message: body.message, data: body.data };
	} catch (error) {
		return dispatchError(error);
	}
};

export const getMyCreatedMissionsService = async (
	limit = 10,
): Promise<
	| OkResponse<z.infer<typeof listMissionsWithAcceptancesResSchema>['data']>
	| ErrorResponse
> => {
	try {
		const response = await httpService.get(
			`/mission/me/created?limit=${limit}`,
		);
		const body = listMissionsWithAcceptancesResSchema.parse(response.data);
		return { ok: true, message: body.message, data: body.data };
	} catch (error) {
		return dispatchError(error);
	}
};

export const getMyAcceptedMissionsService = async (
	limit = 10,
): Promise<
	| OkResponse<z.infer<typeof listMissionsWithAcceptancesResSchema>['data']>
	| ErrorResponse
> => {
	try {
		const response = await httpService.get(
			`/mission/me/accepted?limit=${limit}`,
		);
		const body = listMissionsWithAcceptancesResSchema.parse(response.data);
		return { ok: true, message: body.message, data: body.data };
	} catch (error) {
		return dispatchError(error);
	}
};

export const getMissionByIdService = async (
	missionId: string,
): Promise<
	OkResponse<z.infer<typeof getMissionResSchema>['data']> | ErrorResponse
> => {
	try {
		const response = await httpService.get(`/mission/${missionId}`);
		const body = getMissionResSchema.parse(response.data);
		return { ok: true, message: body.message, data: body.data };
	} catch (error) {
		return dispatchError(error);
	}
};

export const createMissionService = async (
	payload: CreateMissionInput,
): Promise<
	OkResponse<z.infer<typeof createMissionResSchema>['data']> | ErrorResponse
> => {
	try {
		const response = await httpService.post('/mission', payload);
		const body = createMissionResSchema.parse(response.data);
		return { ok: true, message: body.message, data: body.data };
	} catch (error) {
		return dispatchError(error);
	}
};

export const acceptMissionService = async (
	missionId: string,
): Promise<
	OkResponse<z.infer<typeof acceptMissionResSchema>['data']> | ErrorResponse
> => {
	try {
		const response = await httpService.post(`/mission/${missionId}/accept`);
		const body = acceptMissionResSchema.parse(response.data);
		return { ok: true, message: body.message, data: body.data };
	} catch (error) {
		return dispatchError(error);
	}
};

export const completeMissionService = async (
	missionId: string,
	acceptorId: string,
): Promise<
	OkResponse<z.infer<typeof completeMissionResSchema>['data']> | ErrorResponse
> => {
	try {
		const response = await httpService.post(
			`/mission/${missionId}/complete/${acceptorId}`,
		);
		const body = completeMissionResSchema.parse(response.data);
		return { ok: true, message: body.message, data: body.data };
	} catch (error) {
		return dispatchError(error);
	}
};

export const abandonMissionService = async (
	missionId: string,
): Promise<
	OkResponse<z.infer<typeof abandonMissionResSchema>['data']> | ErrorResponse
> => {
	try {
		const response = await httpService.post(`/mission/${missionId}/abandon`);
		const body = abandonMissionResSchema.parse(response.data);
		return { ok: true, message: body.message, data: body.data };
	} catch (error) {
		return dispatchError(error);
	}
};

export const cancelMissionService = async (
	missionId: string,
): Promise<
	OkResponse<z.infer<typeof completeMissionResSchema>['data']> | ErrorResponse
> => {
	try {
		const response = await httpService.delete(`/mission/${missionId}`);
		const body = completeMissionResSchema.parse(response.data);
		return { ok: true, message: body.message, data: body.data };
	} catch (error) {
		return dispatchError(error);
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// Redeem Token Services
// ─────────────────────────────────────────────────────────────────────────────

export const redeemLoginService = async (payload: {
	token: string;
}): Promise<
	OkResponse<z.infer<typeof loginResSchema>['data']> | ErrorResponse
> => {
	try {
		const response = await httpService.post('/auth/login/redeem', payload);
		const body = loginResSchema.parse(response.data);
		return { ok: true, message: body.message, data: body.data };
	} catch (error) {
		return dispatchError(error);
	}
};

export const createRedeemTokenService = async (payload: {
	userId: string;
	validFrom: string;
	validUntil: string;
}): Promise<
	OkResponse<z.infer<typeof redeemTokenResSchema>['data']> | ErrorResponse
> => {
	try {
		const response = await httpService.post('/auth/redeem-token', payload);
		const body = redeemTokenResSchema.parse(response.data);
		return { ok: true, message: body.message, data: body.data };
	} catch (error) {
		return dispatchError(error);
	}
};

export const listRedeemTokensService = async (): Promise<
	OkResponse<z.infer<typeof redeemTokenListResSchema>['data']> | ErrorResponse
> => {
	try {
		const response = await httpService.get('/auth/redeem-token');
		const body = redeemTokenListResSchema.parse(response.data);
		return { ok: true, message: body.message, data: body.data };
	} catch (error) {
		return dispatchError(error);
	}
};

export const deleteRedeemTokenService = async (
	tokenId: string,
): Promise<OkResponse<null> | ErrorResponse> => {
	try {
		await httpService.delete(`/auth/redeem-token/${tokenId}`);
		return { ok: true, message: 'Token deleted', data: null };
	} catch (error) {
		return dispatchError(error);
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// Refresh Token Service
// ─────────────────────────────────────────────────────────────────────────────

export const refreshTokenService = async (): Promise<
	OkResponse<z.infer<typeof refreshResSchema>['data']> | ErrorResponse
> => {
	try {
		const response = await httpService.post('/auth/refresh');
		const body = refreshResSchema.parse(response.data);
		return { ok: true, message: body.message, data: body.data };
	} catch (error) {
		return dispatchError(error);
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// Experiment Services
// ─────────────────────────────────────────────────────────────────────────────

export const getMyAvailableExperimentsService = async (): Promise<
	OkResponse<z.infer<typeof experimentListApiResponseSchema>['data']> | ErrorResponse
> => {
	try {
		const response = await httpService.get('/experiment/me/available');
		const body = experimentListApiResponseSchema.parse(response.data);
		return { ok: true, message: body.message, data: body.data };
	} catch (error) {
		return dispatchError(error);
	}
};

export const getMyExperimentService = async (
	experimentKey: string,
): Promise<
	OkResponse<z.infer<typeof experimentStateApiResponseSchema>['data']> | ErrorResponse
> => {
	try {
		const response = await httpService.get(`/experiment/me/${experimentKey}`);
		const body = experimentStateApiResponseSchema.parse(response.data);
		return { ok: true, message: body.message, data: body.data };
	} catch (error) {
		return dispatchError(error);
	}
};

export const getActiveExperimentService = async (): Promise<
	OkResponse<z.infer<typeof experimentAdminActiveApiResponseSchema>['data']> | ErrorResponse
> => {
	try {
		const response = await httpService.get('/experiment/admin/active');
		const body = experimentAdminActiveApiResponseSchema.parse(response.data);
		return { ok: true, message: body.message, data: body.data };
	} catch (error) {
		return dispatchError(error);
	}
};

export const submitExperimentFeedbackService = async (
	payload: z.infer<typeof submitExperimentFeedbackRequestSchema>,
): Promise<
	OkResponse<z.infer<typeof experimentStateApiResponseSchema>['data']> | ErrorResponse
> => {
	try {
		const response = await httpService.post('/experiment/me/feedback', payload);
		const body = experimentStateApiResponseSchema.parse(response.data);
		return { ok: true, message: body.message, data: body.data };
	} catch (error) {
		return dispatchError(error);
	}
};

export const resetExperimentService = async (
	experimentKey: string,
): Promise<
	OkResponse<z.infer<typeof experimentStateApiResponseSchema>['data']> | ErrorResponse
> => {
	try {
		const response = await httpService.post('/experiment/me/reset', { experimentKey });
		const body = experimentStateApiResponseSchema.parse(response.data);
		return { ok: true, message: body.message, data: body.data };
	} catch (error) {
		return dispatchError(error);
	}
};
