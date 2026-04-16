import type { EntityEcs, WorldEcs } from '#/ecs';
import type { IContextAI } from './context.interface';

export class ShortMemoryContextAI implements IContextAI {
	private memory: Map<string, string> = new Map();

	constructor(private maxMemoryItems: number = 10) {}

	onStart(_world: WorldEcs, _parent: EntityEcs): void {}

	addMemory(value: string) {
		if (this.memory.size >= this.maxMemoryItems) {
			const oldestKey = this.memory.keys().next().value;
			if (oldestKey) this.memory.delete(oldestKey);
		}

		// Sanitize input to remove special characters
		let key = '';
		do {
			key = Math.random().toString(36).substring(2, 6).toUpperCase();
		} while (this.memory.has(key));

		this.memory.set(key, value.replace(/\p{Cc}/gu, '').trim());
	}

	deleteMemory(key: string) {
		this.memory.delete(key);
	}

	toStringContext(): string {
		const memories = Array.from(this.memory.entries())
			.map(([key, value]) => `- ${key}: ${value}`)
			.join('\n');

		return [
			`# Short-Term Memory (${this.memory.size}/${this.maxMemoryItems})`,
			memories || '- No memories stored.',
		].join('\n');
	}
}
