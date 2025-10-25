import { Option } from '#/utils/Option';
import type { ProfileDB } from '$/models/Profile.model';

import * as SQL from '$/utils/sql.utils';

export const PROFILE_TABLE_NAME = 'Profile';

// * Get profile by username
type GetProfileByUsernameType = SQL.InferSqlBuilder<
	{ username: string },
	ProfileDB[]
>;

export const getProfileByUsername: GetProfileByUsernameType = SQL.sqlBuilder(
	async ({ username }, sql) => {
		const profiles = await sql<
			ProfileDB[]
		>`SELECT p.* FROM ${sql(PROFILE_TABLE_NAME)} as p JOIN "User" as u ON p."userId" = u."id" WHERE u."username" = ${username}`;

		return profiles;
	},
);

// * Get profiles by userId
type GetProfilesByUserIdType = SQL.InferSqlBuilder<
	{ userId: string },
	ProfileDB[]
>;

export const getProfilesByUserId: GetProfilesByUserIdType = SQL.sqlBuilder(
	({ userId }, sql) =>
		SQL.selectByProperty<ProfileDB, string>(
			{
				table: PROFILE_TABLE_NAME,
				property: 'userId',
				value: userId,
				many: true,
			},
			sql,
		),
);

// * Get profile by entityId
type GetProfileByEntityIdType = SQL.InferSqlBuilder<
	{ entityId: string },
	Option<ProfileDB>
>;

export const getProfileByEntityId: GetProfileByEntityIdType = SQL.sqlBuilder(
	async ({ entityId }, sql) =>
		SQL.selectByProperty<ProfileDB, string>(
			{
				table: PROFILE_TABLE_NAME,
				property: 'entityId',
				value: entityId,
			},
			sql,
		).then(Option.of),
);

// * Create profile
type CreateProfileType = SQL.InferSqlBuilder<
	{ userId: string; entityId: string },
	ProfileDB
>;

export const createProfile: CreateProfileType = SQL.sqlBuilder(
	async ({ userId, entityId }, sql) => {
		const result = await sql<ProfileDB[]>`INSERT INTO ${sql(
			PROFILE_TABLE_NAME,
		)} ("userId", "entityId") VALUES (${userId}, ${entityId}) RETURNING *`;

		return result[0];
	},
);
