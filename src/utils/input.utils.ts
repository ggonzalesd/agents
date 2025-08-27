import type { IVec2 } from '#/utils/math.util';

export class GameInput {
	private unmount?: () => void;

	private keyMap: Map<string, number> = new Map();
	private prevent: boolean = true;
	private disabled: boolean = false;

	constructor() {
		this.setup = this.setup.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
		this.setup = this.setup.bind(this);

		this.setup();
	}

	public setup() {
		this.unmount?.();

		document.addEventListener('keydown', this.onKeyDown);
		document.addEventListener('keyup', this.onKeyDown);

		const umount = () => {
			document.removeEventListener('keydown', this.onKeyDown);
			document.removeEventListener('keyup', this.onKeyDown);
		};

		this.unmount = umount.bind(this);
	}

	private onKeyDown(event: KeyboardEvent) {
		if (this.disabled) return;

		if (this.prevent) {
			event.preventDefault();
			event.stopPropagation();
		}

		const value = this.keyMap.get(event.code);

		if (event.type === 'keydown' && (value == null || value === -1)) {
			this.keyMap.set(event.code, 0);
		} else if (event.type === 'keyup') {
			this.keyMap.set(event.code, -1);
		}
	}

	public down(key: string) {
		return this.keyMap.get(key) === 1;
	}

	public press(key: string) {
		return (this.keyMap.get(key) ?? 0) > 0;
	}

	public up(key: string) {
		return this.keyMap.get(key) === -1;
	}

	public drop(key: string) {
		this.keyMap.delete(key);
	}

	public anyPress(...keys: string[]) {
		return keys.some((key) => this.press(key));
	}

	public axisPress(
		up: string,
		down: string,
		right: string,
		left: string,
	): IVec2 {
		const x = Number(this.press(right)) - Number(this.press(left));
		const y = Number(this.press(up)) - Number(this.press(down));
		return { x, y };
	}

	public tick() {
		const keys = [...this.keyMap.keys()];

		for (const key of keys) {
			if (this.keyMap.get(key) === -1) {
				this.keyMap.delete(key);
			} else {
				const value = this.keyMap.get(key);

				if (value == null) {
					continue;
				}

				this.keyMap.set(key, value + 1);
			}
		}
	}
}
