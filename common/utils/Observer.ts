export class Observer<T = void> {
	private listeners: Set<(value: T) => void> = new Set();

	constructor() {
		this.addListener = this.addListener.bind(this);
		this.removeListener = this.removeListener.bind(this);
		this.notify = this.notify.bind(this);
	}

	addListener(callback: (value: T) => void) {
		this.listeners.add(callback);

		return (() => {
			this.removeListener(callback);
		}).bind(this);
	}

	removeListener(callback: (value: T) => void) {
		this.listeners.delete(callback);
	}

	notify(value: T) {
		for (const listener of this.listeners) {
			listener(value);
		}
	}
}
