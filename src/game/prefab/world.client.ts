import { WorldEcs } from '#/ecs/World.ecs';

import type { GameInput } from '@/utils/input.utils';
import type { useDebugHook } from '@/hooks/useDebug.svelte';
import type { useActions } from '@/hooks/useActions.svelte';

import { ClientManagerEcs } from '../scripts/clientManager.ecs';
import { ColyseusClientEcs } from '../scripts/colyseus-client.ecs';
import { RenderClientEcs } from '../scripts/renderClient.ecs';
import { UIClientEcs } from '../scripts/uiClient.ecs';
import type { useGameState } from '@/hooks/useGameState.svelte';
import { SkyboxEcs } from '../scripts/skybox.ecs';
import { SeasonManagerEcs } from '../scripts/seasonManager.ecs';
import { VFXManagerEcs } from '../scripts/common/vfx-manager.ecs';
import { ExperimentPlatformManagerEcs } from '../scripts/experiment/experiment-platform-manager.ecs';
import { ExperimentHudListenerEcs } from '../scripts/experiment/experiment-hud-listener.ecs';
import type { useMessageHistory } from '@/hooks';

type WorldPrefabProps = {
	canvas: HTMLCanvasElement;
	input: GameInput;
	debug: ReturnType<typeof useDebugHook>;
	actions: ReturnType<typeof useActions>;
	game: ReturnType<typeof useGameState>;
	messageHistory: ReturnType<typeof useMessageHistory>;
	token: string;
};

export const worldPrefab = ({
	canvas,
	input,
	actions,
	debug,
	game,
	messageHistory,
	token,
}: WorldPrefabProps) =>
	new WorldEcs({
		[UIClientEcs.name]: new UIClientEcs({
			input,
			debug,
			actions,
			game,
			messageHistory,
		}),
		[ColyseusClientEcs.name]: new ColyseusClientEcs(
			import.meta.env.VITE_WS_URL,
			token,
			'main-room',
		),
		[RenderClientEcs.name]: new RenderClientEcs(canvas),
		[ClientManagerEcs.name]: new ClientManagerEcs(),
		[SkyboxEcs.name]: new SkyboxEcs(),
		[SeasonManagerEcs.name]: new SeasonManagerEcs(),
		[VFXManagerEcs.name]: new VFXManagerEcs(),
		[ExperimentPlatformManagerEcs.name]: new ExperimentPlatformManagerEcs(),
		[ExperimentHudListenerEcs.name]: new ExperimentHudListenerEcs(),
	});
