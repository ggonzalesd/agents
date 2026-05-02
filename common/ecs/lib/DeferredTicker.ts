/**
 * Executes a callback once after a given delay (in ms) has accumulated
 * via onLoop(delta) ticks. Designed for use inside ECS components.
 *
 * Usage:
 *   private ticker = new DeferredTicker();
 *
 *   onLoop(delta: number): void {
 *       this.ticker.tick(delta);
 *   }
 *
 *   // Schedule something:
 *   this.ticker.schedule(4000, () => this.mountPhase());
 *
 *   // Cancel if needed:
 *   this.ticker.cancel();
 */
export class DeferredTicker {
	private elapsedMs = 0;
	private delayMs: number | null = null;
	private callback: (() => void) | null = null;

	public schedule(delayMs: number, callback: () => void): void {
		this.elapsedMs = 0;
		this.delayMs = delayMs;
		this.callback = callback;
	}

	public cancel(): void {
		this.elapsedMs = 0;
		this.delayMs = null;
		this.callback = null;
	}

	public get isPending(): boolean {
		return this.callback !== null;
	}

	public tick(delta: number): void {
		if (this.callback === null || this.delayMs === null) return;

		this.elapsedMs += delta;
		if (this.elapsedMs < this.delayMs) return;

		const cb = this.callback;
		this.cancel();
		cb();
	}
}
