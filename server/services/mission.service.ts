import type { CreateMissionInput, EntityType } from '#/schema/mission.schema';
import { HttpError } from '#/utils/HttpError';
import * as MissionRepository from '$/db/mission.db';

export const createMission = async ({
	creatorId,
	creatorType,
	payload,
}: {
	creatorId: string;
	creatorType: EntityType;
	payload: CreateMissionInput;
}) => {
	const mission = await MissionRepository.createMission({
		creatorId,
		creatorType,
		title: payload.title,
		description: payload.description,
		rewardItemType: payload.rewardItemType ?? null,
		rewardItemQty: payload.rewardItemQty ?? null,
	});

	return mission;
};

export const getMission = async (missionId: string) => {
	const mission = await MissionRepository.getMissionById({ missionId });

	return mission.orElseThrow(() => HttpError.notFound('Mission not found'));
};

export const getOpenMissions = async (
	limit?: number,
	excludeCreatorId?: string,
) => {
	return MissionRepository.getOpenMissions({ limit, excludeCreatorId });
};

export const getMissionsByEntityId = async (
	entityId: string,
	limit?: number,
) => {
	return MissionRepository.getMissionsByEntityId({ entityId, limit });
};

export const getMissionsCreatedBy = async ({
	creatorId,
	creatorType,
	limit,
}: {
	creatorId: string;
	creatorType: EntityType;
	limit?: number;
}) => {
	return MissionRepository.getMissionsCreatedBy({
		creatorId,
		creatorType,
		limit,
	});
};

export const getMissionsAcceptedBy = async ({
	acceptorId,
	acceptorType,
	limit,
}: {
	acceptorId: string;
	acceptorType: EntityType;
	limit?: number;
}) => {
	return MissionRepository.getMissionsAcceptedBy({
		acceptorId,
		acceptorType,
		limit,
	});
};

export const acceptMission = async ({
	missionId,
	acceptorId,
	acceptorType,
}: {
	missionId: string;
	acceptorId: string;
	acceptorType: EntityType;
}) => {
	// Get mission to validate
	const missionOpt = await MissionRepository.getMissionById({ missionId });
	const mission = missionOpt.orElseThrow(() =>
		HttpError.notFound('Mission not found'),
	);

	// Cannot accept own mission
	if (
		mission.creatorId === acceptorId &&
		mission.creatorType === acceptorType
	) {
		throw HttpError.badRequest('Cannot accept your own mission');
	}

	// Mission must be open
	if (mission.status !== 'OPEN' && mission.status !== 'IN_PROGRESS') {
		throw HttpError.badRequest('Mission is not available for acceptance');
	}

	const acceptance = await MissionRepository.acceptMission({
		missionId,
		acceptorId,
		acceptorType,
	});

	return acceptance.orElseThrow(() =>
		HttpError.badRequest(
			'Failed to accept mission, you may have already accepted it',
		),
	);
};

export const completeMission = async ({
	missionId,
	acceptorId,
	creatorId,
	creatorType,
}: {
	missionId: string;
	acceptorId: string;
	creatorId: string;
	creatorType: EntityType;
}) => {
	// Verify acceptor has an active acceptance
	const acceptorOpt = await MissionRepository.getAcceptance({
		missionId,
		acceptorId,
		acceptorType: 'USER', // Check both types
	});

	const npcAcceptorOpt = await MissionRepository.getAcceptance({
		missionId,
		acceptorId,
		acceptorType: 'NPC',
	});

	if (acceptorOpt.isNone() && npcAcceptorOpt.isNone()) {
		throw HttpError.badRequest('Acceptor has not accepted this mission');
	}

	const acceptance = acceptorOpt.isSome()
		? acceptorOpt.unwrap()
		: npcAcceptorOpt.unwrap();

	if (acceptance.status !== 'ACTIVE') {
		throw HttpError.badRequest('Mission acceptance is not active');
	}

	const result = await MissionRepository.completeMission({
		missionId,
		acceptorId,
		creatorId,
		creatorType,
	});

	return result.orElseThrow(() =>
		HttpError.forbidden('Only the creator can complete this mission'),
	);
};

export const abandonMission = async ({
	missionId,
	acceptorId,
	acceptorType,
}: {
	missionId: string;
	acceptorId: string;
	acceptorType: EntityType;
}) => {
	const acceptanceOpt = await MissionRepository.getAcceptance({
		missionId,
		acceptorId,
		acceptorType,
	});

	const acceptance = acceptanceOpt.orElseThrow(() =>
		HttpError.notFound('You have not accepted this mission'),
	);

	if (acceptance.status !== 'ACTIVE') {
		throw HttpError.badRequest('Cannot abandon a non-active mission');
	}

	const result = await MissionRepository.updateAcceptanceStatus({
		acceptanceId: acceptance.id,
		status: 'ABANDONED',
	});

	return result.orElseThrow(() =>
		HttpError.server('Failed to abandon mission'),
	);
};

export const cancelMission = async ({
	missionId,
	creatorId,
	creatorType,
}: {
	missionId: string;
	creatorId: string;
	creatorType: EntityType;
}) => {
	const result = await MissionRepository.cancelMission({
		missionId,
		creatorId,
		creatorType,
	});

	return result.orElseThrow(() =>
		HttpError.forbidden('Cannot cancel this mission'),
	);
};
