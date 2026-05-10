import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

import { Option } from '#/utils/Option';
import { HttpError } from '#/utils/HttpError';

import type { UserDB } from '$/models/user.model';
import type { AgentDB } from '$/models/Agent.model';
import type { EntityDB } from '$/models/Entity.model';
import type { ProfileDB } from '$/models/Profile.model';
import type { Role } from '@prisma/client';
import prisma from '$/config/prisma.config';
import type { PrismaTransactionClient } from '$/config/prisma.config';

export type UserWithRelations = {
	user: UserDB;
	agent: AgentDB;
	entity: EntityDB;
	profile: ProfileDB;
};

const profileInclude = {
	User: true,
	Entity: {
		include: { agent: true },
	},
} as const;

function mapUserResult(row: {
	entityId: string;
	userId: string;
	banned: boolean;
	User: {
		id: string;
		username: string;
		password: string;
		display: string | null;
		hash: string;
		createdAt: Date;
		skin: string | null;
		role: Role;
	};
	Entity: {
		id: string;
		life: number;
		maxLife: number;
		saturation: number;
		maxSaturation: number;
		agent: {
			id: string;
			identifier: string;
			display: string;
			positionX: number;
			positionY: number;
			positionZ: number;
			rotation: number;
			metadata: unknown;
			createdAt: Date;
		};
	};
}): UserWithRelations {
	return {
		user: {
			id: row.User.id,
			username: row.User.username,
			password: row.User.password,
			display: row.User.display,
			hash: row.User.hash,
			createdAt: row.User.createdAt,
			skin: row.User.skin,
			role: row.User.role,
		},
		agent: {
			id: row.Entity.agent.id,
			identifier: row.Entity.agent.identifier,
			display: row.Entity.agent.display,
			positionX: row.Entity.agent.positionX,
			positionY: row.Entity.agent.positionY,
			positionZ: row.Entity.agent.positionZ,
			rotation: row.Entity.agent.rotation,
			metadata: (row.Entity.agent.metadata ?? {}) as Record<string, unknown>,
			createdAt: row.Entity.agent.createdAt,
		},
		entity: {
			id: row.Entity.id,
			life: row.Entity.life,
			maxLife: row.Entity.maxLife,
			saturation: row.Entity.saturation,
			maxSaturation: row.Entity.maxSaturation,
		},
		profile: {
			entityId: row.entityId,
			userId: row.userId,
			banned: row.banned,
		},
	};
}

// * Get user by username
export const getUserByUsername = async (
	{ username }: { username: string },
	tx?: PrismaTransactionClient,
): Promise<Option<UserDB>> => {
	const db = tx ?? prisma;
	const user = await db.user.findUnique({ where: { username } });
	return Option.of(user as UserDB | null);
};

// * Get all users (with Agent/Entity/Profile)
export const getAllUsers = async (
	_: Record<string, unknown>,
	tx?: PrismaTransactionClient,
): Promise<UserWithRelations[]> => {
	const db = tx ?? prisma;
	const rows = await db.profile.findMany({ include: profileInclude });
	return rows.map(mapUserResult);
};

// * Get user by ID (with Agent/Entity/Profile)
export const getUserById = async (
	{ userId }: { userId: string },
	tx?: PrismaTransactionClient,
): Promise<Option<UserWithRelations>> => {
	const db = tx ?? prisma;
	const row = await db.profile.findFirst({
		where: { userId },
		include: profileInclude,
	});
	if (!row) return Option.none();
	return Option.some(mapUserResult(row));
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

// * Create full user (User + Agent + Entity + Profile) in transaction
export const createFullUser = async (
	{
		user,
		agent,
	}: {
		user: {
			username: string;
			password: string;
			display?: string;
			skin?: string;
		};
		agent: Omit<AgentDB, 'id' | 'rotation' | 'metadata' | 'createdAt'>;
	},
	tx?: PrismaTransactionClient,
): Promise<Option<UserWithRelations>> => {
	const run = async (db: PrismaTransactionClient) => {
		const hashedPassword = bcrypt.hashSync(user.password, 10);

		const createdUser = await db.user.create({
			data: {
				username: user.username,
				password: hashedPassword,
				display: user.display ?? null,
				skin: user.skin ?? null,
				role: 'USER',
			},
		});

		const createdAgent = await db.agent.create({
			data: {
				display: agent.display,
				identifier: agent.identifier,
				positionX: agent.positionX,
				positionY: agent.positionY,
				positionZ: agent.positionZ,
				rotation: 0,
				metadata: {},
			},
		});

		await db.entity.create({
			data: {
				id: createdAgent.id,
				life: 100,
				maxLife: 100,
				saturation: 100,
				maxSaturation: 100,
			},
		});

		const row = await db.profile.create({
			data: {
				entityId: createdAgent.id,
				userId: createdUser.id,
				banned: false,
			},
			include: profileInclude,
		});

		return Option.some(mapUserResult(row));
	};

	if (tx) return run(tx);
	return prisma.$transaction((txClient) => run(txClient));
};

// * Update full user (User + Agent) in transaction
export const updateFullUser = async (
	{
		userId,
		user,
		agent,
	}: {
		userId: string;
		user?: Partial<Pick<UserDB, 'display' | 'skin'>> & { password?: string };
		agent?: Partial<
			Omit<AgentDB, 'id' | 'rotation' | 'metadata' | 'createdAt'>
		>;
	},
	tx?: PrismaTransactionClient,
): Promise<Option<UserWithRelations>> => {
	const run = async (db: PrismaTransactionClient) => {
		const existingProfile = await db.profile.findFirst({
			where: { userId },
		});
		if (!existingProfile) throw HttpError.notFound('User not found');

		if (user) {
			const userData: Record<string, unknown> = {};
			if (user.display !== undefined) userData.display = user.display;
			if (user.skin !== undefined) userData.skin = user.skin;
			if (user.password) userData.password = bcrypt.hashSync(user.password, 10);

			if (Object.keys(userData).length > 0) {
				await db.user.update({ where: { id: userId }, data: userData });
			}
		}

		if (agent) {
			await db.agent.update({
				where: { id: existingProfile.entityId },
				data: agent,
			});
		}

		return getUserById({ userId }, db);
	};

	if (tx) return run(tx);
	return prisma.$transaction((txClient) => run(txClient));
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
