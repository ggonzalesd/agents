import type { Request, Response } from 'express';

import { jsonResponse } from '#/utils/HttpResponse';
import { HttpError } from '#/utils/HttpError';
import type { CreateMissionInput } from '#/schema/mission.schema';

import { getAuth } from '$/utils/req.utils';

import * as MissionService from '$/services/mission.service';
import * as ProfileService from '$/services/profile.service';
import * as AgentRepository from '$/db/agent.db';

export const getOpenMissionsController = async (
	req: Request,
	res: Response,
) => {
	const auth = getAuth(req);
	const userInfo = await ProfileService.getUserInfo(auth.payload.username);
	const missions = await MissionService.getOpenMissions(
		undefined,
		userInfo.entity.id,
	);

	res.json(
		jsonResponse.ok({ missions }, { message: 'Open missions retrieved' }),
	);
};

export const getMissionsByEntityIdController = async (
	req: Request,
	res: Response,
) => {
	const { identifier } = req.params as { identifier: string };
	const agentOpt = await AgentRepository.getAgentByIdentifier({ identifier });
	const agent = agentOpt.orElseThrow(() =>
		HttpError.notFound('Entity not found'),
	);

	const missions = await MissionService.getMissionsByEntityId(agent.id);

	res.json(
		jsonResponse.ok({ missions }, { message: 'Entity missions retrieved' }),
	);
};

export const getMissionByIdController = async (req: Request, res: Response) => {
	const { id } = req.params as { id: string };

	const mission = await MissionService.getMission(id);

	res.json(jsonResponse.ok({ mission }, { message: 'Mission retrieved' }));
};

export const getMyCreatedMissionsController = async (
	req: Request,
	res: Response,
) => {
	const auth = getAuth(req);
	const userInfo = await ProfileService.getUserInfo(auth.payload.username);

	const missions = await MissionService.getMissionsCreatedBy({
		creatorId: userInfo.entity.id,
		creatorType: 'USER',
	});

	res.json(
		jsonResponse.ok(
			{ missions },
			{ message: 'Your created missions retrieved' },
		),
	);
};

export const getMyAcceptedMissionsController = async (
	req: Request,
	res: Response,
) => {
	const auth = getAuth(req);
	const userInfo = await ProfileService.getUserInfo(auth.payload.username);

	const missions = await MissionService.getMissionsAcceptedBy({
		acceptorId: userInfo.entity.id,
		acceptorType: 'USER',
	});

	res.json(
		jsonResponse.ok(
			{ missions },
			{ message: 'Your accepted missions retrieved' },
		),
	);
};

export const createMissionController = async (req: Request, res: Response) => {
	const auth = getAuth(req);
	const userInfo = await ProfileService.getUserInfo(auth.payload.username);
	const payload = req.body as CreateMissionInput;

	const mission = await MissionService.createMission({
		creatorId: userInfo.entity.id,
		creatorType: 'USER',
		payload,
	});

	res.status(201).json(
		jsonResponse.ok(
			{ mission },
			{
				message: 'Mission created successfully',
				status: 201,
			},
		),
	);
};

export const acceptMissionController = async (req: Request, res: Response) => {
	const auth = getAuth(req);
	const userInfo = await ProfileService.getUserInfo(auth.payload.username);
	const { id } = req.params as { id: string };

	const acceptance = await MissionService.acceptMission({
		missionId: id,
		acceptorId: userInfo.entity.id,
		acceptorType: 'USER',
	});

	res.json(jsonResponse.ok({ acceptance }, { message: 'Mission accepted' }));
};

export const completeMissionController = async (
	req: Request,
	res: Response,
) => {
	const auth = getAuth(req);
	const userInfo = await ProfileService.getUserInfo(auth.payload.username);
	const { id, acceptorId } = req.params as { id: string; acceptorId: string };

	const mission = await MissionService.completeMission({
		missionId: id,
		acceptorId,
		creatorId: userInfo.entity.id,
		creatorType: 'USER',
	});

	res.json(jsonResponse.ok({ mission }, { message: 'Mission completed' }));
};

export const abandonMissionController = async (req: Request, res: Response) => {
	const auth = getAuth(req);
	const userInfo = await ProfileService.getUserInfo(auth.payload.username);
	const { id } = req.params as { id: string };

	const acceptance = await MissionService.abandonMission({
		missionId: id,
		acceptorId: userInfo.entity.id,
		acceptorType: 'USER',
	});

	res.json(jsonResponse.ok({ acceptance }, { message: 'Mission abandoned' }));
};

export const cancelMissionController = async (req: Request, res: Response) => {
	const auth = getAuth(req);
	const userInfo = await ProfileService.getUserInfo(auth.payload.username);
	const { id } = req.params as { id: string };

	const mission = await MissionService.cancelMission({
		missionId: id,
		creatorId: userInfo.entity.id,
		creatorType: 'USER',
	});

	res.json(jsonResponse.ok({ mission }, { message: 'Mission cancelled' }));
};
