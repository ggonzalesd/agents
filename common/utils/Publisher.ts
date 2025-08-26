export class Publisher<T = any> {
	private listeners: Map<
		string,
		Set<{ withData?: (data: T) => void; withNoData?: () => void }>
	> = new Map();

	constructor() {
		this.subscribe = this.subscribe.bind(this);
		this.listen = this.listen.bind(this);
		this.publish = this.publish.bind(this);
		this.notify = this.notify.bind(this);
		this.broadcast = this.broadcast.bind(this);
		this.notifyAll = this.notifyAll.bind(this);
		this.notify = this.notify.bind(this);
	}

	public subscribe(event: string, listener: (data: T) => void) {
		return this._add(event, listener);
	}

	public listen(event: string, listener: () => void) {
		return this._add(event, undefined, listener);
	}

	private _add(
		event: string,
		withData?: (data: T) => void,
		withNoData?: () => void,
	) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}

		const item = { withData, withNoData };

		this.listeners.get(event)!.add(item);

		return () => {
			this.listeners.get(event)?.delete(item);
		};
	}

	public publish(event: string, data: T): void {
		this.listeners.get(event)?.forEach((item) => item.withData?.(data));
	}

	public broadcast(data: T) {
		this.listeners.forEach((items) => {
			items.forEach((item) => item.withData?.(data));
		});
	}

	public notify(event: string): void {
		this.listeners.get(event)?.forEach((item) => item.withNoData?.());
	}

	public notifyAll() {
		this.listeners.forEach((items) => {
			items.forEach((item) => item.withNoData?.());
		});
	}
}
