import { ComponentEcs } from '#/ecs';

export class ItemLifetimeEcs extends ComponentEcs {
	private timer: ReturnType<typeof setTimeout> | null = null;

	constructor(private readonly lifetimeMs: number) {
		super();
	}

	onStart(): void {
		this.timer = setTimeout(() => {
			this.timer = null;
			this.world.getEntity(this.parent).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
		}, this.lifetimeMs);

		this.callOnDelete(() => {
			if (this.timer) {
				clearTimeout(this.timer);
				this.timer = null;
			}
		});
	}
}
