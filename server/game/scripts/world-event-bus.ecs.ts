import { ComponentEcs } from '#/ecs';

export enum WorldEventType {
	EntityJump = 'entity:jump',
	EntityDeath = 'entity:death',
	EntityFallVoid = 'entity:fall_void',
}

type Unsubscribe = () => void;
type BusHandler<T = unknown> = (entityName: string, payload: T) => void;

export class WorldEventBusEcs extends ComponentEcs {
	private handlers = new Map<string, Set<BusHandler>>();

	public emit(
		type: WorldEventType,
		entityName: string,
		payload?: unknown,
	): void {
		console.log(`[WorldEventBus] emit ${type} → ${entityName}`);
		const set = this.handlers.get(type);
		console.log(this.handlers);
		if (!set) return;
		for (const handler of set) {
			handler(entityName, payload);
		}
	}

	public on<T = unknown>(
		type: WorldEventType,
		handler: BusHandler<T>,
	): Unsubscribe {
		let set = this.handlers.get(type);
		if (!set) {
			set = new Set();
			this.handlers.set(type, set);
		}
		console.log(`Registering handler for event: ${type}`);
		set.add(handler as BusHandler);
		return () => {
			set!.delete(handler as BusHandler);
		};
	}
}
