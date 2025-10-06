import { WorldEcs } from '#/ecs/World.ecs';

import type { GameInput } from '@/utils/input.utils';
import type { useDebugHook } from '@/hooks/useDebug.svelte';
import type { useActions } from '@/hooks/useActions.svelte';

import { ClientManagerEcs } from '../scripts/clientManager.ecs';
import { ColyseusClientEcs } from '../scripts/colyseus-client.ecs';
import { RenderClientEcs } from '../scripts/renderClient.ecs';
import { UIClientEcs } from '../scripts/uiClient.ecs';
import type { useGameState } from '@/hooks/useGameState.svelte';

type WorldPrefabProps = {
	canvas: HTMLCanvasElement;
	input: GameInput;
	debug: ReturnType<typeof useDebugHook>;
	actions: ReturnType<typeof useActions>;
	game: ReturnType<typeof useGameState>;
	token: string;
};

export const worldPrefab = ({
	canvas,
	input,
	actions,
	debug,
	game,
	token,
}: WorldPrefabProps) =>
	new WorldEcs({
		[UIClientEcs.name]: new UIClientEcs({
			input,
			debug,
			actions,
			game,
		}),
		[ColyseusClientEcs.name]: new ColyseusClientEcs(
			import.meta.env.VITE_WS_URL,
			token,
			'main-room',
		),
		[RenderClientEcs.name]: new RenderClientEcs(canvas),
		[ClientManagerEcs.name]: new ClientManagerEcs(),
	});
