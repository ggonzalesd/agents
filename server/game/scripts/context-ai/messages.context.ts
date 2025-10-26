import type { WorldEcs } from '#/ecs';
import * as DateUtil from '#/utils/time.utils';

import type { IContextAI } from './context.interface';

export class MessagesContextAI implements IContextAI {
	private messages: Array<{
		message: string;
		date: Date;
		from: string;
		to: string[];
	}> = [];

	addMessage(message: string, from: string, to: string[] = []) {
		this.messages.push({ message, date: new Date(), from, to });

		// Keep only the last 20 messages
		if (this.messages.length > 20) {
			this.messages.shift();
		}
	}

	onStart(_world: WorldEcs, _parentId?: string | null): void {}

	toStringContext(): string {
		const messages = this.messages
			.map((msg) => ({
				...msg,
				date: DateUtil.timeAgo(msg.date),
				to: msg.to.length > 0 ? msg.to.join(', ') : 'Everyone',
			}))
			.map(
				(msg) =>
					`- [${msg.date}] From: ${msg.from} To: ${msg.to} Message: ${msg.message}`,
			)
			.join('\n');

		return ['# Recent Messages', messages || '- No messages received.'].join(
			'\n',
		);
	}
}
