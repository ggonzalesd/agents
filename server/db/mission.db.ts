import { Option } from '#/utils/Option';
import type {
	EntityType,
	MissionDB,
	MissionAcceptanceDB,
	MissionWithAcceptances,
	AcceptanceStatus,
} from '$/models/Mission.model';
import {
	MissionStatus,
	AcceptanceStatus as PrismaAcceptanceStatus,
} from '@prisma/client';
import type { EntityType as PrismaEntityType } from '@prisma/client';
import prisma from '$/config/prisma.config';

// ─────────────────────────────────────────────────────────────────────────────
// Create Mission
// ─────────────────────────────────────────────────────────────────────────────

export const createMission = async ({
	creatorId,
	creatorType,
	title,
	description,
	rewardItemType,
	rewardItemQty,
}: {
	creatorId: string;
	creatorType: EntityType;
	title: string;
	description: string;
	rewardItemType?: string | null;
	rewardItemQty?: number | null;
}): Promise<MissionDB> => {
	const mission = await prisma.mission.create({
		data: {
			creatorId,
			creatorType: creatorType as PrismaEntityType,
			title,
			description,
			rewardItemType: rewardItemType ?? null,
			rewardItemQty: rewardItemQty ?? null,
		},
	});
	return mission as unknown as MissionDB;
};

// ─────────────────────────────────────────────────────────────────────────────
// Get Mission by ID
// ─────────────────────────────────────────────────────────────────────────────

export const getMissionById = async ({
	missionId,
}: {
	missionId: string;
}): Promise<Option<MissionWithAcceptances>> => {
	const mission = await prisma.mission.findUnique({
		where: { id: missionId },
		include: { acceptances: true },
	});
	if (!mission) return Option.none();
	return Option.some(mission as unknown as MissionWithAcceptances);
};

// ─────────────────────────────────────────────────────────────────────────────
// Get Open Missions
// ─────────────────────────────────────────────────────────────────────────────

export const getOpenMissions = async ({
	limit = 20,
	excludeCreatorId,
}: {
	limit?: number;
	excludeCreatorId?: string;
}): Promise<MissionDB[]> => {
	const missions = await prisma.mission.findMany({
		where: {
			status: MissionStatus.OPEN,
			...(excludeCreatorId ? { creatorId: { not: excludeCreatorId } } : {}),
		},
		orderBy: { createdAt: 'desc' },
		take: limit,
	});
	return missions as unknown as MissionDB[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Get Missions Created By Entity
// ─────────────────────────────────────────────────────────────────────────────

export const getMissionsCreatedBy = async ({
	creatorId,
	creatorType,
	limit = 10,
}: {
	creatorId: string;
	creatorType: EntityType;
	limit?: number;
}): Promise<MissionWithAcceptances[]> => {
	const missions = await prisma.mission.findMany({
		where: {
			creatorId,
			creatorType: creatorType as PrismaEntityType,
		},
		include: { acceptances: true },
		orderBy: { createdAt: 'desc' },
		take: limit,
	});
	return missions as unknown as MissionWithAcceptances[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Get Missions Accepted By Entity
// ─────────────────────────────────────────────────────────────────────────────

export const getMissionsAcceptedBy = async ({
	acceptorId,
	acceptorType,
	limit = 10,
}: {
	acceptorId: string;
	acceptorType: EntityType;
	limit?: number;
}): Promise<MissionWithAcceptances[]> => {
	const acceptances = await prisma.missionAcceptance.findMany({
		where: {
			acceptorId,
			acceptorType: acceptorType as PrismaEntityType,
		},
		include: { mission: { include: { acceptances: true } } },
		orderBy: { acceptedAt: 'desc' },
		take: limit,
	});

	return acceptances.map((acc) => ({
		...acc.mission,
		acceptances: [acc],
	})) as unknown as MissionWithAcceptances[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Get Missions By Entity (open missions created by a specific entity)
// ─────────────────────────────────────────────────────────────────────────────

export const getMissionsByEntityId = async ({
	entityId,
	limit = 20,
}: {
	entityId: string;
	limit?: number;
}): Promise<MissionDB[]> => {
	const missions = await prisma.mission.findMany({
		where: { creatorId: entityId, status: MissionStatus.OPEN },
		orderBy: { createdAt: 'desc' },
		take: limit,
	});
	return missions as unknown as MissionDB[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Accept Mission
// ─────────────────────────────────────────────────────────────────────────────

export const acceptMission = async ({
	missionId,
	acceptorId,
	acceptorType,
}: {
	missionId: string;
	acceptorId: string;
	acceptorType: EntityType;
}): Promise<Option<MissionAcceptanceDB>> => {
	return prisma.$transaction(async (tx) => {
		const mission = await tx.mission.findUnique({ where: { id: missionId } });
		if (!mission || mission.status !== MissionStatus.OPEN) {
			return Option.none<MissionAcceptanceDB>();
		}

		const existing = await tx.missionAcceptance.findFirst({
			where: {
				missionId,
				acceptorId,
				acceptorType: acceptorType as PrismaEntityType,
			},
		});
		if (existing) return Option.none<MissionAcceptanceDB>();

		await tx.mission.update({
			where: { id: missionId },
			data: { status: MissionStatus.IN_PROGRESS },
		});

		const acceptance = await tx.missionAcceptance.create({
			data: {
				missionId,
				acceptorId,
				acceptorType: acceptorType as PrismaEntityType,
			},
		});

		return Option.some(acceptance as unknown as MissionAcceptanceDB);
	});
};

// ─────────────────────────────────────────────────────────────────────────────
// Update Acceptance Status
// ─────────────────────────────────────────────────────────────────────────────

export const updateAcceptanceStatus = async ({
	acceptanceId,
	status,
}: {
	acceptanceId: string;
	status: AcceptanceStatus;
}): Promise<Option<MissionAcceptanceDB>> => {
	const completedAt =
		status === 'COMPLETED' || status === 'FAILED' ? new Date() : null;

	try {
		const acceptance = await prisma.missionAcceptance.update({
			where: { id: acceptanceId },
			data: {
				status: status as PrismaAcceptanceStatus,
				completedAt,
			},
		});
		return Option.some(acceptance as unknown as MissionAcceptanceDB);
	} catch {
		return Option.none();
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// Complete Mission (by creator)
// ─────────────────────────────────────────────────────────────────────────────

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
}): Promise<Option<MissionDB>> => {
	return prisma.$transaction(async (tx) => {
		const mission = await tx.mission.findFirst({
			where: {
				id: missionId,
				creatorId,
				creatorType: creatorType as PrismaEntityType,
			},
		});
		if (!mission) return Option.none<MissionDB>();

		await tx.missionAcceptance.updateMany({
			where: { missionId, acceptorId },
			data: {
				status: PrismaAcceptanceStatus.COMPLETED,
				completedAt: new Date(),
			},
		});

		const updated = await tx.mission.update({
			where: { id: missionId },
			data: {
				status: MissionStatus.COMPLETED,
				completedAt: new Date(),
			},
		});

		return Option.some(updated as unknown as MissionDB);
	});
};

// ─────────────────────────────────────────────────────────────────────────────
// Cancel Mission (by creator)
// ─────────────────────────────────────────────────────────────────────────────

export const cancelMission = async ({
	missionId,
	creatorId,
	creatorType,
}: {
	missionId: string;
	creatorId: string;
	creatorType: EntityType;
}): Promise<Option<MissionDB>> => {
	try {
		const mission = await prisma.mission.updateMany({
			where: {
				id: missionId,
				creatorId,
				creatorType: creatorType as PrismaEntityType,
				status: { not: MissionStatus.COMPLETED },
			},
			data: { status: MissionStatus.CANCELLED },
		});

		if (mission.count === 0) return Option.none();

		const updated = await prisma.mission.findUnique({
			where: { id: missionId },
		});
		return Option.of(updated as unknown as MissionDB);
	} catch {
		return Option.none();
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// Get Active Acceptances for Mission
// ─────────────────────────────────────────────────────────────────────────────

export const getActiveAcceptances = async ({
	missionId,
}: {
	missionId: string;
}): Promise<MissionAcceptanceDB[]> => {
	const acceptances = await prisma.missionAcceptance.findMany({
		where: {
			missionId,
			status: PrismaAcceptanceStatus.ACTIVE,
		},
	});
	return acceptances as unknown as MissionAcceptanceDB[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Get Acceptance by Mission and Acceptor
// ─────────────────────────────────────────────────────────────────────────────

export const getAcceptance = async ({
	missionId,
	acceptorId,
	acceptorType,
}: {
	missionId: string;
	acceptorId: string;
	acceptorType: EntityType;
}): Promise<Option<MissionAcceptanceDB>> => {
	const acceptance = await prisma.missionAcceptance.findFirst({
		where: {
			missionId,
			acceptorId,
			acceptorType: acceptorType as PrismaEntityType,
		},
	});
	return Option.of(acceptance as unknown as MissionAcceptanceDB | null);
};
