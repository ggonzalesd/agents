import type { EntityEcs, WorldEcs } from '#/ecs';
import type { IContextAI } from './context.interface';

import * as TimeUtils from '#/utils/time.utils';
import type { LongTermMemoryDB } from '$/models/LongTermMemory.model';

export class LongMemoryContextAI implements IContextAI {
	private memory: Map<string, { value: string; date: Date }> = new Map();

	constructor(private maxMemoryItems: number = 10) {}

	onStart(_world: WorldEcs, _parent: EntityEcs): void {}

	loadLongTermMemories(memories: LongTermMemoryDB[]) {
		for (const memory of memories) {
			this.addMemory(
				memory.identifier,
				memory.text,
				new Date(memory.createdAt),
			);
		}
	}

	addMemory(key: string, value: string, date: Date = new Date()) {
		if (this.memory.size >= this.maxMemoryItems && !this.memory.has(key)) {
			let oldestKey: string | null = null;
			let oldestDate = Infinity;
			for (const [k, v] of this.memory) {
				if (v.date.getTime() < oldestDate) {
					oldestDate = v.date.getTime();
					oldestKey = k;
				}
			}
			if (oldestKey) this.memory.delete(oldestKey);
		}

		this.memory.set(key, {
			value: value.replace(/\p{Cc}/gu, '').trim(),
			date,
		});
	}

	deleteMemory(key: string) {
		this.memory.delete(key);
	}

	toStringContext(): string {
		const memories = Array.from(this.memory.entries())
			.map(
				([key, { value, date }]) =>
					`- [${key}] (${TimeUtils.timeAgo(date)}): ${value}`,
			)
			.join('\n');

		return [
			`# Long-Term Memory (${this.memory.size}/${this.maxMemoryItems})`,
			memories || '- No memories stored.',
		].join('\n');
	}
}
