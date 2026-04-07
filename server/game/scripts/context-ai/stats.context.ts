import { z } from 'zod';

import type { EntityEcs, WorldEcs } from '#/ecs';
import type { IContextAI } from './context.interface';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import { FollowPathEcs } from '../entity/follow-path/follow-path.ecs';
import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';

export const statsSchema = z
	.object({
		name: z.string(),
		description: z.string().optional(),
	})
	.loose();

export const moodSchema = z.record(z.string(), z.number().min(0).max(100));

export class StatsContextAI implements IContextAI {
	private record: RecordEcs = null!;
	private followPath: FollowPathEcs = null!;
	private characterBody: CharacterBodyServerEcs = null!;

	onStart(_world: WorldEcs, _parent: EntityEcs): void {
		this.record = _parent
			.get(RecordEcs)
			.unwrap('RecordEcs not found on StatsContextAI parent entity');

		this.followPath = _parent
			.get(FollowPathEcs)
			.unwrap('FollowPathEcs not found on StatsContextAI parent entity');

		this.characterBody = _parent
			.get(CharacterBodyServerEcs)
			.unwrap(
				'CharacterBodyServerEcs not found on StatsContextAI parent entity',
			);
	}

	toStringContext(): string {
		const stats =
			this.record.getUnsafeRecordOrDefault<z.infer<typeof statsSchema>>(
				'stats',
			);

		const mood =
			this.record.getUnsafeRecordOrDefault<z.infer<typeof moodSchema>>('mood');

		const moodString = Object.entries(mood)
			.map(([key, value]) => `- ${key}: ${value}%`)
			.join('\n');

		const { life, maxLife } = this.characterBody.characterState;

		return [
			'# Stats',
			`- id: ${this.record.parent ?? 'unknown'}`,
			`- name: ${stats.name ?? 'unknown'}`,
			`- description: ${stats.description ?? 'N/A'}`,
			`- life: ${life}/${maxLife}`,
			'',
			this.followPath.option.toContextString(),
			'',
			'# Mood',
			moodString || '- No mood data available.',
		].join('\n');
	}
}
