import { ComponentEcs } from '#/ecs/Component.ecs';
import type { useDebugHook } from '@/hooks/useDebug.svelte';

export class UIClientEcs extends ComponentEcs {
	public debugHook: ReturnType<typeof useDebugHook>;

	constructor(debugHook: ReturnType<typeof useDebugHook>) {
		super();
		this.debugHook = debugHook;
	}
}
