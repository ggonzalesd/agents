import { ComponentEcs } from '#/ecs/Component.ecs';
import type { useActions } from '@/hooks/useActions.svelte';
import type { useDebugHook } from '@/hooks/useDebug.svelte';
import { useGameInput } from '@/hooks/useGameInput';

export class UIClientEcs extends ComponentEcs {
	public debug: ReturnType<typeof useDebugHook>;
	public actions: ReturnType<typeof useActions>;
	public input: ReturnType<typeof useGameInput>;

	constructor(contexts: {
		canvas: HTMLCanvasElement;
		debug: ReturnType<typeof useDebugHook>;
		actions: ReturnType<typeof useActions>;
	}) {
		super();
		this.debug = contexts.debug;
		this.actions = contexts.actions;
		this.input = useGameInput(contexts.canvas);
	}

	onLoop(_delta: number): void {
		this.input.input.tick();
	}
}
