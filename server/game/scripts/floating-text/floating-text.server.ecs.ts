import { ComponentEcs } from '#/ecs/Component.ecs';
import { FloatingTextState } from '#/state/floating-text.state';
import { ServerDataEcs } from '../serverData.ecs';
import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';
import type { IVec3 } from '#/utils/math.util';

interface FloatingTextConfig {
	text: string;
	foreground?: string;
	background?: string;
	fontSize?: number;
	/** Offset en Y sobre la posición del cuerpo cuando está adjunto a un CharacterBodyServerEcs */
	yOffset?: number;
}

/**
 * Componente servidor para texto flotante.
 *
 * — Modo estático: si la entidad padre NO tiene CharacterBodyServerEcs,
 *   el texto queda fijo en `pos`.
 *
 * — Modo adjunto: si la entidad padre TIENE CharacterBodyServerEcs,
 *   la posición se actualiza cada frame siguiendo al cuerpo físico + yOffset.
 *
 * Expone setText() / setStyle() para modificar el texto en runtime.
 * El cliente solo rerenderiza cuando detecta un cambio (caché por valor).
 */
export class FloatingTextServerEcs extends ComponentEcs {
	public readonly state: FloatingTextState;

	private serverData: ServerDataEcs = null!;
	private characterBody: CharacterBodyServerEcs | null = null;
	private readonly yOffset: number;

	constructor(pos: IVec3, config: FloatingTextConfig) {
		super();
		this.yOffset = config.yOffset ?? 2.5;
		this.state = new FloatingTextState(
			pos,
			config.text,
			config.foreground ?? '#ffffff',
			config.background ?? '#000000',
			config.fontSize ?? 20,
		);
	}

	onStart(): void {
		this.serverData = this.world
			.get(ServerDataEcs)
			.unwrap('ServerDataEcs not found in FloatingTextServerEcs');

		const parent = this.world
			.getEntity(this.parent)
			.unwrap('Parent entity not found in FloatingTextServerEcs');

		// Detectar si la entidad padre tiene un cuerpo físico para adjuntarse
		this.characterBody = parent.get(CharacterBodyServerEcs).raw() ?? null;

		const key = `ft:${parent.name}`;
		this.serverData.state.floatingTexts.set(key, this.state);

		this.callOnDelete(() => {
			this.serverData.state.floatingTexts.delete(key);
		});
	}

	onLoop(_delta: number): void {
		if (this.characterBody === null) return;

		const { x, y, z } = this.characterBody.body.translation();
		this.state.position.x = x;
		this.state.position.y = y + this.yOffset;
		this.state.position.z = z;
	}

	/** Cambia el texto. El cliente rerenderiza solo si el valor es diferente al anterior. */
	public setText(text: string): void {
		this.state.text = text;
	}

	/** Cambia colores y/o tamaño de fuente. El cliente rerenderiza solo los campos que cambiaron. */
	public setStyle(style: {
		foreground?: string;
		background?: string;
		fontSize?: number;
	}): void {
		if (style.foreground !== undefined) this.state.foreground = style.foreground;
		if (style.background !== undefined) this.state.background = style.background;
		if (style.fontSize !== undefined) this.state.fontSize = style.fontSize;
	}
}
