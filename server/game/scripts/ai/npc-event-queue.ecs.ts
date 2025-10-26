import { ComponentEcs } from '#/ecs';

export class NPCEventQueueEcs extends ComponentEcs {
	active: boolean = false;

	private eventQueue: {
		id: string;
		message: string;
		data: any;
		weight: number;
		date: Date;
	}[] = [];

	private history: {
		id: string;
		message: string;
		data: any;
		weight: number;
		date: Date;
	}[] = [];

	pushEvent(message: string, data: any, weight = 1) {
		const event = {
			id: crypto.randomUUID(),
			message,
			data,
			weight,
			date: new Date(),
		};

		this.eventQueue.push(event);
		this.history.push(event);

		const maxSize =
			this.eventQueue.length > this.history.length
				? this.eventQueue.length
				: 10;
		if (this.history.length > maxSize) {
			this.history.splice(0, this.history.length - maxSize);
		}
	}

	getWeight() {
		return this.eventQueue.reduce((total, event) => total + event.weight, 0);
	}

	popEvents() {
		const events = this.eventQueue;
		this.eventQueue = [];
		return events;
	}

	getHistory() {
		return this.history;
	}
}
