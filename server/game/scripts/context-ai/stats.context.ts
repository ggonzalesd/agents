import { z } from 'zod';

import type { EntityEcs, WorldEcs } from '#/ecs';
import type { IContextAI } from './context.interface';
import { RecordEcs } from '#/ecs/lib/Record.ecs';

export const statsSchema = z
	.object({
		name: z.string(),
		description: z.string().optional(),
		life: z.number().min(0),
	})
	.loose();

export const moodSchema = z.record(z.string(), z.number().min(0).max(100));

export class StatsContextAI implements IContextAI {
	private record: RecordEcs = null!;

	onStart(_world: WorldEcs, _parent: EntityEcs): void {
		this.record = _parent
			.get(RecordEcs)
			.unwrap('RecordEcs not found on StatsContextAI parent entity');
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

		return [
			'# Stats',
			`- id: ${this.record.parent ?? 'unknown'}`,
			`- name: ${stats.name ?? 'unknown'}`,
			`- description: ${stats.description ?? 'N/A'}`,
			`- life: ${stats.life ?? 0}`,
			'',
			'# Mood',
			moodString || '- No mood data available.',
		].join('\n');
	}
}
