export type EntityType = 'USER' | 'NPC';

export type MissionStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type AcceptanceStatus = 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'ABANDONED';

export interface MissionDB {
	id: string;
	creatorId: string;
	creatorType: EntityType;
	title: string;
	description: string;
	reward: string | null;
	status: MissionStatus;
	createdAt: Date;
	completedAt: Date | null;
}

export interface MissionAcceptanceDB {
	id: string;
	missionId: string;
	acceptorId: string;
	acceptorType: EntityType;
	status: AcceptanceStatus;
	acceptedAt: Date;
	completedAt: Date | null;
}

export interface MissionWithAcceptances extends MissionDB {
	acceptances: MissionAcceptanceDB[];
}
