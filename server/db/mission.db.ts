import { Option } from '#/utils/Option';
import type {
	EntityType,
	MissionDB,
	MissionAcceptanceDB,
	MissionWithAcceptances,
	AcceptanceStatus,
} from '$/models/Mission.model';
import * as SQL from '$/utils/sql';

// ─────────────────────────────────────────────────────────────────────────────
// Create Mission
// ─────────────────────────────────────────────────────────────────────────────

type CreateMissionType = SQL.InferSqlBuilder<
	{
		creatorId: string;
		creatorType: EntityType;
		title: string;
		description: string;
		reward?: string | null;
	},
	MissionDB
>;

export const createMission: CreateMissionType = SQL.sqlBuilder(
	({ creatorId, creatorType, title, description, reward }, sql) =>
		SQL.transaction(sql, async (tx) => {
			const results = await tx<MissionDB[]>`
				INSERT INTO "Mission" ("creatorId", "creatorType", title, description, reward)
				VALUES (${creatorId}, ${creatorType}::"EntityType", ${title}, ${description}, ${reward ?? null})
				RETURNING *
			`;
			const mission = results[0];
			if (!mission) throw new Error('Failed to create mission');
			mission.createdAt = new Date(mission.createdAt);
			return mission;
		}),
);

// ─────────────────────────────────────────────────────────────────────────────
// Get Mission by ID
// ─────────────────────────────────────────────────────────────────────────────

type GetMissionByIdType = SQL.InferSqlBuilder<
	{ missionId: string },
	Option<MissionWithAcceptances>
>;

export const getMissionById: GetMissionByIdType = SQL.sqlBuilder(
	({ missionId }, sql) =>
		SQL.transaction(sql, async (tx) => {
			const missions = await tx<MissionDB[]>`
				SELECT * FROM "Mission" WHERE id = ${missionId}
			`;

			if (missions.length === 0) return Option.none<MissionWithAcceptances>();

			const mission = missions[0];
			mission.createdAt = new Date(mission.createdAt);
			if (mission.completedAt)
				mission.completedAt = new Date(mission.completedAt);

			const acceptances = await tx<MissionAcceptanceDB[]>`
				SELECT * FROM "MissionAcceptance" WHERE "missionId" = ${missionId}
			`;

			for (const acc of acceptances) {
				acc.acceptedAt = new Date(acc.acceptedAt);
				if (acc.completedAt) acc.completedAt = new Date(acc.completedAt);
			}

			return Option.some<MissionWithAcceptances>({ ...mission, acceptances });
		}),
);

// ─────────────────────────────────────────────────────────────────────────────
// Get Open Missions
// ─────────────────────────────────────────────────────────────────────────────

type GetOpenMissionsType = SQL.InferSqlBuilder<
	{ limit?: number; excludeCreatorId?: string },
	MissionDB[]
>;

export const getOpenMissions: GetOpenMissionsType = SQL.sqlBuilder(
	({ limit = 20, excludeCreatorId }, sql) =>
		SQL.transaction(sql, async (tx) => {
			const missions = excludeCreatorId
				? await tx<MissionDB[]>`
					SELECT * FROM "Mission"
					WHERE status = 'OPEN'::"MissionStatus" AND "creatorId" != ${excludeCreatorId}
					ORDER BY "createdAt" DESC
					LIMIT ${limit}
				`
				: await tx<MissionDB[]>`
					SELECT * FROM "Mission"
					WHERE status = 'OPEN'::"MissionStatus"
					ORDER BY "createdAt" DESC
					LIMIT ${limit}
				`;
			for (const m of missions) {
				m.createdAt = new Date(m.createdAt);
			}
			return missions;
		}),
);

// ─────────────────────────────────────────────────────────────────────────────
// Get Missions Created By Entity
// ─────────────────────────────────────────────────────────────────────────────

type GetMissionsCreatedByType = SQL.InferSqlBuilder<
	{ creatorId: string; creatorType: EntityType; limit?: number },
	MissionWithAcceptances[]
>;

export const getMissionsCreatedBy: GetMissionsCreatedByType = SQL.sqlBuilder(
	({ creatorId, creatorType, limit = 10 }, sql) =>
		SQL.transaction(sql, async (tx) => {
			const missions = await tx<MissionDB[]>`
				SELECT * FROM "Mission"
				WHERE "creatorId" = ${creatorId} AND "creatorType" = ${creatorType}::"EntityType"
				ORDER BY "createdAt" DESC
				LIMIT ${limit}
			`;

			const result: MissionWithAcceptances[] = [];
			for (const m of missions) {
				m.createdAt = new Date(m.createdAt);
				if (m.completedAt) m.completedAt = new Date(m.completedAt);

				const acceptances = await tx<MissionAcceptanceDB[]>`
					SELECT * FROM "MissionAcceptance" WHERE "missionId" = ${m.id}
				`;
				for (const acc of acceptances) {
					acc.acceptedAt = new Date(acc.acceptedAt);
					if (acc.completedAt) acc.completedAt = new Date(acc.completedAt);
				}

				result.push({ ...m, acceptances });
			}
			return result;
		}),
);

// ─────────────────────────────────────────────────────────────────────────────
// Get Missions Accepted By Entity
// ─────────────────────────────────────────────────────────────────────────────

type GetMissionsAcceptedByType = SQL.InferSqlBuilder<
	{ acceptorId: string; acceptorType: EntityType; limit?: number },
	MissionWithAcceptances[]
>;

export const getMissionsAcceptedBy: GetMissionsAcceptedByType = SQL.sqlBuilder(
	({ acceptorId, acceptorType, limit = 10 }, sql) =>
		SQL.transaction(sql, async (tx) => {
			const acceptances = await tx<
				(MissionAcceptanceDB & { mission: MissionDB })[]
			>`
				SELECT
					ma.*,
					row_to_json(m) as mission
				FROM "MissionAcceptance" ma
				JOIN "Mission" m ON ma."missionId" = m.id
				WHERE ma."acceptorId" = ${acceptorId} AND ma."acceptorType" = ${acceptorType}::"EntityType"
				ORDER BY ma."acceptedAt" DESC
				LIMIT ${limit}
			`;
			return acceptances.map((acc) => {
				const { mission, ...acceptance } = acc;
				acceptance.acceptedAt = new Date(acceptance.acceptedAt);
				if (acceptance.completedAt)
					acceptance.completedAt = new Date(acceptance.completedAt);
				mission.createdAt = new Date(mission.createdAt);
				if (mission.completedAt)
					mission.completedAt = new Date(mission.completedAt);
				return {
					...mission,
					acceptances: [acceptance],
				} as MissionWithAcceptances;
			});
		}),
);

// ─────────────────────────────────────────────────────────────────────────────
// Get Missions By Entity (open missions created by a specific entity)
// ─────────────────────────────────────────────────────────────────────────────

type GetMissionsByEntityIdType = SQL.InferSqlBuilder<
	{ entityId: string; limit?: number },
	MissionDB[]
>;

export const getMissionsByEntityId: GetMissionsByEntityIdType = SQL.sqlBuilder(
	({ entityId, limit = 20 }, sql) =>
		SQL.transaction(sql, async (tx) => {
			const missions = await tx<MissionDB[]>`
				SELECT * FROM "Mission"
				WHERE "creatorId" = ${entityId} AND status = 'OPEN'::"MissionStatus"
				ORDER BY "createdAt" DESC
				LIMIT ${limit}
			`;
			for (const m of missions) {
				m.createdAt = new Date(m.createdAt);
				if (m.completedAt) m.completedAt = new Date(m.completedAt);
			}
			return missions;
		}),
);

// ─────────────────────────────────────────────────────────────────────────────
// Accept Mission
// ─────────────────────────────────────────────────────────────────────────────

type AcceptMissionType = SQL.InferSqlBuilder<
	{ missionId: string; acceptorId: string; acceptorType: EntityType },
	Option<MissionAcceptanceDB>
>;

export const acceptMission: AcceptMissionType = SQL.sqlBuilder(
	({ missionId, acceptorId, acceptorType }, sql) =>
		SQL.transaction(sql, async (tx) => {
			// Check mission exists and is open
			const missions = await tx<MissionDB[]>`
				SELECT * FROM "Mission" WHERE id = ${missionId}
			`;

			if (missions.length === 0 || missions[0].status !== 'OPEN') {
				return Option.none<MissionAcceptanceDB>();
			}

			// Check not already accepted by this entity
			const existing = await tx<MissionAcceptanceDB[]>`
				SELECT * FROM "MissionAcceptance"
				WHERE "missionId" = ${missionId}
				AND "acceptorId" = ${acceptorId}
				AND "acceptorType" = ${acceptorType}::"EntityType"
			`;

			if (existing.length > 0) {
				return Option.none<MissionAcceptanceDB>();
			}

			// Update mission status
			await tx`
				UPDATE "Mission"
				SET status = 'IN_PROGRESS'::"MissionStatus"
				WHERE id = ${missionId}
			`;

			// Create acceptance
			return tx<MissionAcceptanceDB[]>`
				INSERT INTO "MissionAcceptance" ("missionId", "acceptorId", "acceptorType")
				VALUES (${missionId}, ${acceptorId}, ${acceptorType}::"EntityType")
				RETURNING *
			`.then((results) => {
				const acceptance = results[0];
				if (!acceptance) throw new Error('Failed to create acceptance');
				acceptance.acceptedAt = new Date(acceptance.acceptedAt);
				return Option.some<MissionAcceptanceDB>(acceptance);
			});
		}),
);

// ─────────────────────────────────────────────────────────────────────────────
// Update Acceptance Status
// ─────────────────────────────────────────────────────────────────────────────

type UpdateAcceptanceStatusType = SQL.InferSqlBuilder<
	{ acceptanceId: string; status: AcceptanceStatus },
	Option<MissionAcceptanceDB>
>;

export const updateAcceptanceStatus: UpdateAcceptanceStatusType =
	SQL.sqlBuilder(({ acceptanceId, status }, sql) =>
		SQL.transaction(sql, async (tx) => {
			const completedAt =
				status === 'COMPLETED' || status === 'FAILED' ? new Date() : null;

			const results = await tx<MissionAcceptanceDB[]>`
				UPDATE "MissionAcceptance"
				SET status = ${status}::"AcceptanceStatus", "completedAt" = ${completedAt}
				WHERE id = ${acceptanceId}
				RETURNING *
			`;

			if (results.length === 0) return Option.none<MissionAcceptanceDB>();
			const acceptance = results[0];
			acceptance.acceptedAt = new Date(acceptance.acceptedAt);
			if (acceptance.completedAt)
				acceptance.completedAt = new Date(acceptance.completedAt);
			return Option.some<MissionAcceptanceDB>(acceptance);
		}),
	);

// ─────────────────────────────────────────────────────────────────────────────
// Complete Mission (by creator)
// ─────────────────────────────────────────────────────────────────────────────

type CompleteMissionType = SQL.InferSqlBuilder<
	{
		missionId: string;
		acceptorId: string;
		creatorId: string;
		creatorType: EntityType;
	},
	Option<MissionDB>
>;

export const completeMission: CompleteMissionType = SQL.sqlBuilder(
	({ missionId, acceptorId, creatorId, creatorType }, sql) =>
		SQL.transaction(sql, async (tx) => {
			// Verify creator owns mission
			const missions = await tx<MissionDB[]>`
				SELECT * FROM "Mission"
				WHERE id = ${missionId}
				AND "creatorId" = ${creatorId}
				AND "creatorType" = ${creatorType}::"EntityType"
			`;

			if (missions.length === 0) {
				return Option.none<MissionDB>();
			}

			// Update acceptance to completed
			await tx`
				UPDATE "MissionAcceptance"
				SET status = 'COMPLETED'::"AcceptanceStatus", "completedAt" = NOW()
				WHERE "missionId" = ${missionId}
				AND "acceptorId" = ${acceptorId}
			`;

			// Update mission to completed
			return tx<MissionDB[]>`
				UPDATE "Mission"
				SET status = 'COMPLETED'::"MissionStatus", "completedAt" = NOW()
				WHERE id = ${missionId}
				RETURNING *
			`.then((results) => {
				if (results.length === 0) return Option.none<MissionDB>();
				const mission = results[0];
				mission.createdAt = new Date(mission.createdAt);
				if (mission.completedAt)
					mission.completedAt = new Date(mission.completedAt);
				return Option.some<MissionDB>(mission);
			});
		}),
);

// ─────────────────────────────────────────────────────────────────────────────
// Cancel Mission (by creator)
// ─────────────────────────────────────────────────────────────────────────────

type CancelMissionType = SQL.InferSqlBuilder<
	{ missionId: string; creatorId: string; creatorType: EntityType },
	Option<MissionDB>
>;

export const cancelMission: CancelMissionType = SQL.sqlBuilder(
	({ missionId, creatorId, creatorType }, sql) =>
		SQL.transaction(sql, async (tx) => {
			const results = await tx<MissionDB[]>`
				UPDATE "Mission"
				SET status = 'CANCELLED'::"MissionStatus"
				WHERE id = ${missionId}
				AND "creatorId" = ${creatorId}
				AND "creatorType" = ${creatorType}::"EntityType"
				AND status != 'COMPLETED'::"MissionStatus"
				RETURNING *
			`;

			if (results.length === 0) return Option.none<MissionDB>();
			const mission = results[0];
			mission.createdAt = new Date(mission.createdAt);
			return Option.some<MissionDB>(mission);
		}),
);

// ─────────────────────────────────────────────────────────────────────────────
// Get Active Acceptances for Mission
// ─────────────────────────────────────────────────────────────────────────────

type GetActiveAcceptancesType = SQL.InferSqlBuilder<
	{ missionId: string },
	MissionAcceptanceDB[]
>;

export const getActiveAcceptances: GetActiveAcceptancesType = SQL.sqlBuilder(
	({ missionId }, sql) =>
		SQL.transaction(sql, async (tx) => {
			const acceptances = await tx<MissionAcceptanceDB[]>`
				SELECT * FROM "MissionAcceptance"
				WHERE "missionId" = ${missionId}
				AND status = 'ACTIVE'::"AcceptanceStatus"
			`;
			for (const acc of acceptances) {
				acc.acceptedAt = new Date(acc.acceptedAt);
			}
			return acceptances;
		}),
);

// ─────────────────────────────────────────────────────────────────────────────
// Get Acceptance by Mission and Acceptor
// ─────────────────────────────────────────────────────────────────────────────

type GetAcceptanceType = SQL.InferSqlBuilder<
	{ missionId: string; acceptorId: string; acceptorType: EntityType },
	Option<MissionAcceptanceDB>
>;

export const getAcceptance: GetAcceptanceType = SQL.sqlBuilder(
	({ missionId, acceptorId, acceptorType }, sql) =>
		SQL.transaction(sql, async (tx) => {
			const results = await tx<MissionAcceptanceDB[]>`
				SELECT * FROM "MissionAcceptance"
				WHERE "missionId" = ${missionId}
				AND "acceptorId" = ${acceptorId}
				AND "acceptorType" = ${acceptorType}::"EntityType"
			`;
			if (results.length === 0) return Option.none<MissionAcceptanceDB>();
			const acceptance = results[0];
			acceptance.acceptedAt = new Date(acceptance.acceptedAt);
			if (acceptance.completedAt)
				acceptance.completedAt = new Date(acceptance.completedAt);
			return Option.some<MissionAcceptanceDB>(acceptance);
		}),
);
