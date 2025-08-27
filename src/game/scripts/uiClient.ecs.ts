import { ComponentEcs } from '#/ecs/Component.ecs';
import type { useActions } from '@/hooks/useActions.svelte';
import type { useDebugHook } from '@/hooks/useDebug.svelte';
import type { GameInput } from '@/utils/input.utils';

export class UIClientEcs extends ComponentEcs {
	public debug: ReturnType<typeof useDebugHook>;
	public actions: ReturnType<typeof useActions>;
	public input: GameInput;

	constructor(contexts: {
		input: GameInput;
		debug: ReturnType<typeof useDebugHook>;
		actions: ReturnType<typeof useActions>;
	}) {
		super();
		this.debug = contexts.debug;
		this.actions = contexts.actions;
		this.input = contexts.input;
	}

	onLoop(_delta: number): void {
		this.input.tick();
	}
}
