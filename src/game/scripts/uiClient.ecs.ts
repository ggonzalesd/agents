import { ComponentEcs } from '#/ecs/Component.ecs';
import type { useActions } from '@/hooks/useActions.svelte';
import type { useDebugHook } from '@/hooks/useDebug.svelte';

export class UIClientEcs extends ComponentEcs {
	public debugHook: ReturnType<typeof useDebugHook>;
	public actionContext: ReturnType<typeof useActions>;

	constructor(contexts: {
		debug: ReturnType<typeof useDebugHook>;
		actions: ReturnType<typeof useActions>;
	}) {
		super();
		this.debugHook = contexts.debug;
		this.actionContext = contexts.actions;
	}
}
