import { InputMode } from '@/utils/inputMode';
import type { IVec2 } from '#/utils/math.util';

export class GameInput {
	private unmount?: () => void;

	private keyMap: Map<string, number> = new Map();
	private prevent: boolean = true;
	private _mode: InputMode = InputMode.UI;
	private contextMenu: boolean = false;

	public get mode(): InputMode {
		return this._mode;
	}

	public setMode(mode: InputMode): void {
		const wasDisabled = this._mode === InputMode.UI;
		this._mode = mode;

		if (mode === InputMode.UI) {
			this.keyMap.clear();
		}

		if (mode === InputMode.GAME) {
			document.body.requestPointerLock();
		} else if (wasDisabled || mode === InputMode.INTERACTIVE) {
			if (document.pointerLockElement === document.body) {
				document.exitPointerLock();
				this.moveX = 0;
				this.moveY = 0;
			}
		}
	}

	/** @deprecated Usar setMode(InputMode.UI) / setMode(InputMode.GAME) */
	public get disabled(): boolean {
		return this._mode === InputMode.UI;
	}

	/** @deprecated Usar setMode(InputMode.UI) / setMode(InputMode.GAME) */
	public set disabled(value: boolean) {
		this.setMode(value ? InputMode.UI : InputMode.GAME);
	}

	public moveX: number = 0;
	public moveY: number = 0;

	private lastX: number = 0;
	private lastY: number = 0;

	public yaw: number = 0;
	public pitch: number = 0;

	constructor() {
		this.setup = this.setup.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
		this.setup = this.setup.bind(this);
		this.onContextMenu = this.onContextMenu.bind(this);

		this.setup();
	}

	public setup() {
		this.unmount?.();

		document.addEventListener('keydown', this.onKeyDown);
		document.addEventListener('keyup', this.onKeyDown);
		document.addEventListener('contextmenu', this.onContextMenu);

		document.addEventListener('mousedown', (e) => {
			if (this._mode === InputMode.UI) return;
			if (e.button !== 2) return;

			if (this._mode === InputMode.GAME) {
				// GAME → INTERACTIVE: liberar cursor
				this.setMode(InputMode.INTERACTIVE);
			} else if (this._mode === InputMode.INTERACTIVE) {
				// INTERACTIVE → GAME: volver a pointer lock
				this.setMode(InputMode.GAME);
			}
		});

		document.addEventListener('mousemove', (e) => {
			if (document.pointerLockElement !== document.body) return;

			this.yaw -= e.movementX * 0.002;
			this.pitch += e.movementY * 0.002;

			this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch));

			this.lastX = this.moveX;
			this.lastY = this.moveY;

			this.moveX = e.movementX * 0.75 + this.lastX * 0.25;
			this.moveY = e.movementY * 0.75 + this.lastY * 0.25;

			setTimeout(() => {
				this.moveX = 0;
				this.moveY = 0;
			}, 0);
		});

		const umount = () => {
			document.removeEventListener('keydown', this.onKeyDown);
			document.removeEventListener('keyup', this.onKeyDown);
			document.removeEventListener('contextmenu', this.onContextMenu);
		};

		this.unmount = umount.bind(this);
	}

	public isCursorLock() {
		return document.pointerLockElement === document.body;
	}

	private onContextMenu(event: MouseEvent) {
		if (this._mode === InputMode.UI || this.contextMenu) return;

		event.preventDefault();
		event.stopPropagation();
	}

	private onKeyDown(event: KeyboardEvent) {
		if (event.type === 'keyup') {
			this.keyMap.set(event.code, -1);
			return;
		}

		if (this._mode === InputMode.UI) return;

		if (this.prevent) {
			event.preventDefault();
			event.stopPropagation();
		}

		const value = this.keyMap.get(event.code);

		if (value == null || value === -1) {
			this.keyMap.set(event.code, 0);
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
