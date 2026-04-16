import { Option } from '#/utils/Option';

import prisma from '$/config/prisma.config';
import type { PrismaTransactionClient } from '$/config/prisma.config';
import type { RefreshToken } from '$/generated/prisma/client';

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export const createRefreshToken = async (
	{ userId }: { userId: string },
	tx?: PrismaTransactionClient,
): Promise<RefreshToken> => {
	const db = tx ?? prisma;

	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

	return db.refreshToken.create({
		data: {
			userId,
			expiresAt,
		},
	});
};

export const getRefreshTokenByToken = async (
	{ token }: { token: string },
	tx?: PrismaTransactionClient,
): Promise<Option<RefreshToken>> => {
	const db = tx ?? prisma;

	const result = await db.refreshToken.findUnique({
		where: { token },
	});

	return Option.of(result);
};

export const deleteRefreshToken = async (
	{ id }: { id: string },
	tx?: PrismaTransactionClient,
): Promise<void> => {
	const db = tx ?? prisma;

	await db.refreshToken.delete({ where: { id } });
};

export const deleteRefreshTokenByToken = async (
	{ token }: { token: string },
	tx?: PrismaTransactionClient,
): Promise<void> => {
	const db = tx ?? prisma;

	await db.refreshToken.delete({ where: { token } }).catch(() => {});
};

export const deleteAllRefreshTokensByUserId = async (
	{ userId }: { userId: string },
	tx?: PrismaTransactionClient,
): Promise<number> => {
	const db = tx ?? prisma;

	const result = await db.refreshToken.deleteMany({
		where: { userId },
	});

	return result.count;
};

export const deleteExpiredRefreshTokens = async (
	tx?: PrismaTransactionClient,
): Promise<number> => {
	const db = tx ?? prisma;

	const result = await db.refreshToken.deleteMany({
		where: {
			expiresAt: { lt: new Date() },
		},
	});

	return result.count;
};
