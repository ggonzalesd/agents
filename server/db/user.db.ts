import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

import { Option } from '#/utils/Option';

import type { UserDB } from '$/models/user.model';
import type { Role } from '$/generated/prisma/client';
import prisma from '$/config/prisma.config';
import type { PrismaTransactionClient } from '$/config/prisma.config';

// * Get user by username
export const getUserByUsername = async (
	{ username }: { username: string },
	tx?: PrismaTransactionClient,
): Promise<Option<UserDB>> => {
	const db = tx ?? prisma;
	const user = await db.user.findUnique({ where: { username } });
	return Option.of(user as UserDB | null);
};

// * Create user
export const createUser = async (
	{
		username,
		password,
		display,
		role,
	}: {
		username: string;
		password: string;
		display?: string;
		role?: Role;
	},
	tx?: PrismaTransactionClient,
): Promise<Option<UserDB>> => {
	const db = tx ?? prisma;
	const hashedPassword = bcrypt.hashSync(password, 10);

	const user = await db.user.create({
		data: {
			username,
			password: hashedPassword,
			display: display ?? null,
			role: role ?? 'USER',
		},
	});

	return Option.of(user as UserDB);
};

// * Revoke user hash (and optionally password)
export const revokeUserHash = async (
	{ id, withPassword }: { id: string; withPassword?: string },
	tx?: PrismaTransactionClient,
): Promise<Option<boolean>> => {
	const db = tx ?? prisma;

	const user = await db.user.findUnique({ where: { id } });
	if (!user) return Option.none();

	const data: { hash: string; password?: string } = { hash: uuidv4() };
	if (withPassword) {
		data.password = bcrypt.hashSync(withPassword, 10);
	}

	const result = await db.user.update({ where: { id }, data });
	console.log({ result });

	return Option.some(true);
};
