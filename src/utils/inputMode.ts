export enum InputMode {
	/** Pointer lock activo (cursor al centro), teclas activas, clicks a entidades desactivados */
	GAME = 'GAME',
	/** Cursor libre, teclas activas, clicks a entidades/items activos */
	INTERACTIVE = 'INTERACTIVE',
	/** Cursor libre, teclas desactivadas, clicks a entidades desactivados — solo modales */
	UI = 'UI',
}
