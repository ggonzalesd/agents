import { WorldEcs } from '#/ecs/World.ecs';

import type { GameInput } from '@/utils/input.utils';
import type { useDebugHook } from '@/hooks/useDebug.svelte';
import type { useActions } from '@/hooks/useActions.svelte';

import { ClientManagerEcs } from '../scripts/clientManager.ecs';
import { ColyseusClientEcs } from '../scripts/colyseusClient.ecs';
import { RenderClientEcs } from '../scripts/renderClient.ecs';
import { UIClientEcs } from '../scripts/uiClient.ecs';

type WorldPrefabProps = {
	canvas: HTMLCanvasElement;
	input: GameInput;
	debug: ReturnType<typeof useDebugHook>;
	actions: ReturnType<typeof useActions>;
};

export const worldPrefab = ({
	canvas,
	input,
	actions,
	debug,
}: WorldPrefabProps) =>
	new WorldEcs({
		[UIClientEcs.name]: new UIClientEcs({
			input,
			debug,
			actions,
		}),
		[ColyseusClientEcs.name]: new ColyseusClientEcs(
			'ws://localhost:3000',
			'your_token_here',
			'main-room',
		),
		[RenderClientEcs.name]: new RenderClientEcs(canvas),
		[ClientManagerEcs.name]: new ClientManagerEcs(),
	});
