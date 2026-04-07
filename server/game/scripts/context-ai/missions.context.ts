import type { EntityEcs, WorldEcs } from '#/ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import type { MissionDB, MissionWithAcceptances } from '$/models/Mission.model';
import * as MissionRepository from '$/db/mission.db';
import type { IContextAI } from './context.interface';

interface MissionContextData {
	created: MissionDB[];
	accepted: MissionWithAcceptances[];
	available: MissionDB[];
}

export class MissionsContextAI implements IContextAI {
	private npcId: string | null = null;
	private missions: MissionContextData = {
		created: [],
		accepted: [],
		available: [],
	};

	private refreshIntervalMs = 30000;
	private lastRefresh = 0;

	constructor(
		private maxCreatedMissions = 3,
		private maxAcceptedMissions = 3,
		private maxAvailableMissions = 5,
	) {}

	async onStart(_world: WorldEcs, parent: EntityEcs): Promise<void> {
		const record = parent.get(RecordEcs).raw();
		if (!record) return;

		const dbRecord = record.getRecord<{ id: string }>('db').raw();
		if (!dbRecord) return;

		this.npcId = dbRecord.id;
		await this.refresh();
	}

	async refresh(): Promise<void> {
		if (!this.npcId) return;

		const now = Date.now();
		if (now - this.lastRefresh < this.refreshIntervalMs) return;

		this.lastRefresh = now;

		try {
			const [created, accepted, available] = await Promise.all([
				MissionRepository.getMissionsCreatedBy({
					creatorId: this.npcId,
					creatorType: 'NPC',
					limit: this.maxCreatedMissions,
				}),
				MissionRepository.getMissionsAcceptedBy({
					acceptorId: this.npcId,
					acceptorType: 'NPC',
					limit: this.maxAcceptedMissions,
				}),
				MissionRepository.getOpenMissions({ limit: this.maxAvailableMissions }),
			]);

			this.missions = {
				created,
				accepted,
				available: available.filter((m) => m.creatorId !== this.npcId),
			};
		} catch (error) {
			console.error('Failed to refresh missions context:', error);
		}
	}

	addCreatedMission(mission: MissionDB): void {
		this.missions.created = [mission, ...this.missions.created].slice(
			0,
			this.maxCreatedMissions,
		);
	}

	addAcceptedMission(mission: MissionWithAcceptances): void {
		this.missions.accepted = [mission, ...this.missions.accepted].slice(
			0,
			this.maxAcceptedMissions,
		);
	}

	removeMission(missionId: string): void {
		this.missions.created = this.missions.created.filter(
			(m) => m.id !== missionId,
		);
		this.missions.accepted = this.missions.accepted.filter(
			(m) => m.id !== missionId,
		);
		this.missions.available = this.missions.available.filter(
			(m) => m.id !== missionId,
		);
	}

	getMissionById(missionId: string): MissionDB | undefined {
		return (
			this.missions.created.find((m) => m.id === missionId) ??
			this.missions.accepted.find((m) => m.id === missionId) ??
			this.missions.available.find((m) => m.id === missionId)
		);
	}

	getNpcId(): string | null {
		return this.npcId;
	}

	toStringContext(): string {
		const sections: string[] = ['## Missions'];

		// Misiones creadas por este NPC
		if (this.missions.created.length > 0) {
			const createdLines = this.missions.created.map((m) => {
				const acceptances =
					'acceptances' in m
						? (m as MissionWithAcceptances).acceptances.length
						: 0;
				return `- [${m.id}] "${m.title}" (${m.status}, ${acceptances} accepted)${m.reward ? ` | Reward: ${m.reward}` : ''}`;
			});
			sections.push(
				`### Missions You Created (${this.missions.created.length})`,
				...createdLines,
			);
		}

		// Misiones aceptadas por este NPC
		if (this.missions.accepted.length > 0) {
			const acceptedLines = this.missions.accepted.map((m) => {
				const acceptance = m.acceptances[0];
				return `- [${m.id}] "${m.title}" by ${m.creatorType}:${m.creatorId.slice(0, 8)} (Your status: ${acceptance?.status ?? 'unknown'})${m.reward ? ` | Reward: ${m.reward}` : ''}`;
			});
			sections.push(
				`### Missions You Accepted (${this.missions.accepted.length})`,
				...acceptedLines,
			);
		}

		// Misiones disponibles para aceptar
		if (this.missions.available.length > 0) {
			const availableLines = this.missions.available.map(
				(m) =>
					`- [${m.id}] "${m.title}" by ${m.creatorType}:${m.creatorId.slice(0, 8)}${m.reward ? ` | Reward: ${m.reward}` : ''}`,
			);
			sections.push(
				`### Available Missions (${this.missions.available.length})`,
				...availableLines,
			);
		}

		if (sections.length === 1) {
			sections.push('- No missions available.');
		}

		return sections.join('\n');
	}
}
