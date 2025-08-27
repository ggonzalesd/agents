export class GameInput {
	private unmount?: () => void;

	private keyMap: Map<string, number> = new Map();

	constructor() {
		this.setup = this.setup.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);

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
		event.preventDefault();
		event.stopPropagation();

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
