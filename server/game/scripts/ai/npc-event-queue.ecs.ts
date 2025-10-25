import { ComponentEcs } from '#/ecs';

export class NPCEventQueueEcs extends ComponentEcs {
	active: boolean = false;

	private eventQueue: {
		id: string;
		message: string;
		data: any;
		weight: number;
	}[] = [];

	pushEvent(message: string, data: any, weight = 1) {
		this.eventQueue.push({ id: crypto.randomUUID(), message, data, weight });
	}

	getWeight() {
		return this.eventQueue.reduce((total, event) => total + event.weight, 0);
	}

	popEvents() {
		const events = this.eventQueue;
		this.eventQueue = [];
		return events;
	}
}
