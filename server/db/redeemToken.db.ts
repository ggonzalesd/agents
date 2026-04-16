import { Option } from '#/utils/Option';

import prisma from '$/config/prisma.config';
import type { PrismaTransactionClient } from '$/config/prisma.config';
import type { RedeemToken } from '$/generated/prisma/client';

export const createRedeemToken = async (
	{
		userId,
		validFrom,
		validUntil,
	}: {
		userId: string;
		validFrom: Date;
		validUntil: Date;
	},
	tx?: PrismaTransactionClient,
): Promise<RedeemToken> => {
	const db = tx ?? prisma;

	return db.redeemToken.create({
		data: {
			userId,
			validFrom,
			validUntil,
		},
	});
};

export const getRedeemTokenByToken = async (
	{ token }: { token: string },
	tx?: PrismaTransactionClient,
): Promise<
	Option<
		RedeemToken & {
			user: { id: string; username: string; hash: string; role: string };
		}
	>
> => {
	const db = tx ?? prisma;

	const result = await db.redeemToken.findUnique({
		where: { token },
		include: {
			user: {
				select: {
					id: true,
					username: true,
					hash: true,
					role: true,
				},
			},
		},
	});

	return Option.of(result);
};

export const deleteRedeemToken = async (
	{ id }: { id: string },
	tx?: PrismaTransactionClient,
): Promise<void> => {
	const db = tx ?? prisma;

	await db.redeemToken.delete({ where: { id } });
};

export const listAllRedeemTokens = async (
	tx?: PrismaTransactionClient,
): Promise<
	(RedeemToken & {
		user: { id: string; username: string; display: string | null };
	})[]
> => {
	const db = tx ?? prisma;

	return db.redeemToken.findMany({
		include: {
			user: {
				select: {
					id: true,
					username: true,
					display: true,
				},
			},
		},
		orderBy: { createdAt: 'desc' },
	});
};

export const deleteExpiredRedeemTokens = async (
	tx?: PrismaTransactionClient,
): Promise<number> => {
	const db = tx ?? prisma;

	const result = await db.redeemToken.deleteMany({
		where: {
			validUntil: { lt: new Date() },
		},
	});

	return result.count;
};
