/**
 * A simple observer pattern implementation
 * Allows adding, removing, and notifying listeners
 */
export class Observer<T = void> {
	private listeners: Set<(value: T) => void> = new Set();

	constructor() {
		this.subscribe = this.subscribe.bind(this);
		this.unsubscribe = this.unsubscribe.bind(this);
		this.notify = this.notify.bind(this);
	}

	/**
	 * Adds a listener to the observer
	 * @param callback - The function to call when the observer is notified
	 * @returns A function that removes the listener when called
	 */
	subscribe(callback: (value: T) => void) {
		this.listeners.add(callback);

		return (() => {
			this.unsubscribe(callback);
		}).bind(this);
	}

	/**
	 * Removes a listener from the observer
	 * @param callback - The function to remove
	 */
	unsubscribe(callback: (value: T) => void) {
		this.listeners.delete(callback);
	}

	/**
	 * Notifies all listeners of a new value
	 * @param value - The new value to notify listeners with
	 */
	notify(value: T) {
		for (const listener of this.listeners) {
			listener(value);
		}
	}
}
