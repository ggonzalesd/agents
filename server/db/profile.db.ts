import { Option } from '#/utils/Option';
import type { ProfileDB } from '$/models/Profile.model';
import prisma from '$/config/prisma.config';
import type { PrismaTransactionClient } from '$/config/prisma.config';

export const PROFILE_TABLE_NAME = 'Profile';

// * Get profile by username
export const getProfileByUsername = async (
	{ username }: { username: string },
	tx?: PrismaTransactionClient,
): Promise<ProfileDB[]> => {
	const db = tx ?? prisma;
	const profiles = await db.profile.findMany({
		where: { User: { username } },
	});
	return profiles as ProfileDB[];
};

// * Get profiles by userId
export const getProfilesByUserId = async (
	{ userId }: { userId: string },
	tx?: PrismaTransactionClient,
): Promise<ProfileDB[]> => {
	const db = tx ?? prisma;
	const profiles = await db.profile.findMany({ where: { userId } });
	return profiles as ProfileDB[];
};

// * Get profile by entityId
export const getProfileByEntityId = async (
	{ entityId }: { entityId: string },
	tx?: PrismaTransactionClient,
): Promise<Option<ProfileDB>> => {
	const db = tx ?? prisma;
	const profile = await db.profile.findUnique({ where: { entityId } });
	return Option.of(profile as ProfileDB | null);
};

// * Create profile
export const createProfile = async (
	{ userId, entityId }: { userId: string; entityId: string },
	tx?: PrismaTransactionClient,
): Promise<ProfileDB> => {
	const db = tx ?? prisma;
	const profile = await db.profile.create({ data: { userId, entityId } });
	return profile as ProfileDB;
};
