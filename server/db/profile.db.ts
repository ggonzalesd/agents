import { Option } from '#/utils/Option';
import { sqlBuilder, type InferSqlBuilder } from '$/config/db.config';
import type { ProfileDB } from '$/models/Profile.model';

export const PROFILE_TABLE_NAME = 'Profile';

// * Get profiles by userId
type GetProfilesByUserIdType = InferSqlBuilder<{ userId: string }, ProfileDB[]>;

export const getProfilesByUserId: GetProfilesByUserIdType = sqlBuilder(
	async ({ userId }, sql) => {
		const profiles = await sql<
			ProfileDB[]
		>`SELECT * FROM ${sql(PROFILE_TABLE_NAME)} WHERE ${sql('userId')} = ${userId}`;

		return profiles;
	},
);

// * Get profile by entityId
type GetProfileByEntityIdType = InferSqlBuilder<
	{ entityId: string },
	Option<ProfileDB>
>;

export const getProfileByEntityId: GetProfileByEntityIdType = sqlBuilder(
	async ({ entityId }, sql) => {
		const result = await sql<
			ProfileDB[]
		>`SELECT * FROM ${sql(PROFILE_TABLE_NAME)} WHERE ${sql(
			'entityId',
		)} = ${entityId} LIMIT 1`;

		if (result.length === 0) {
			return Option.none();
		}

		return Option.of(result[0]);
	},
);

// * Create profile
type CreateProfileType = InferSqlBuilder<
	{ userId: string; entityId: string },
	ProfileDB
>;

export const createProfile: CreateProfileType = sqlBuilder(
	async ({ userId, entityId }, sql) => {
		const result = await sql<ProfileDB[]>`INSERT INTO ${sql(
			PROFILE_TABLE_NAME,
		)} ("userId", "entityId") VALUES (${userId}, ${entityId}) RETURNING *`;

		return result[0];
	},
);
