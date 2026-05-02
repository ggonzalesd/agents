<svelte:options runes />

<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { WorldEcs } from '#/ecs/World.ecs';
	import { Option } from '#/utils/Option';

	import * as HOOKS from '@/hooks';

	import { GameInput } from '@/utils/input.utils';
	import { preloadGLB, preloadTextures, waitFor } from '@/utils/assets.utils';

	import UiHelpers from '@/components/UiHelpers.svelte';
	import Modals from '@/components/Modals.svelte';
	import MissionAlerts from '@/components/MissionAlerts.svelte';
	import WildlifeAlerts from '@/components/WildlifeAlerts.svelte';
	import ExperimentHud from '@/components/ExperimentHud.svelte';
	import Router from '@/components/lib/Router.svelte';
	import GameView from '@/views/GameView.svelte';
	import LoginView from '@/views/LoginView.svelte';

	import ProfileView from '@/views/ProfileView.svelte';
	import Loading from '@/views/Loading.svelte';
	import AdminView from '@/views/AdminView.svelte';
	import MissionsView from '@/views/MissionsView.svelte';
	import { models } from './game/scripts/render-map.util';

	const queryClient = new QueryClient();

	setContext(HOOKS.useDebugHook.name, HOOKS.useDebugHook());
	setContext(HOOKS.useActions.name, HOOKS.useActions());
	setContext(GameInput.name, new GameInput());
	setContext(HOOKS.useGameState.name, HOOKS.useGameState());
	setContext(HOOKS.useRouter.name, HOOKS.useRouter('/login'));
	setContext(HOOKS.useMessageHistory.name, HOOKS.useMessageHistory());
	setContext(WorldEcs.name, Option.none<WorldEcs>());

	onMount(() => {
		const debugContext = HOOKS.getDebugContext();
		debugContext.add('App mounted', { type: 'info', isCode: false });
	});

	function preloadResources() {
		return Promise.all([
		preloadGLB('/3d/SkinModel2.glb'),
		preloadGLB('/3d/deer.glb'),
		preloadGLB('/3d/siervo.glb'),
		preloadGLB('/3d/burro.glb'),
		preloadGLB('/3d/lobo.glb'),
		preloadGLB('/3d/toro-marron.glb'),
		preloadGLB('/3d/toro-negro.glb'),

			...models.bareTrees.values.map((p) =>
				preloadGLB(`${models.bareTrees.path}${p}`),
			),
			...models.bushes.values.map((p) =>
				preloadGLB(`${models.bushes.path}${p}`),
			),
			...models.grass.values.map((p) => preloadGLB(`${models.grass.path}${p}`)),
			...models.largeRocks.values.map((p) =>
				preloadGLB(`${models.largeRocks.path}${p}`),
			),
			...models.smallStones.values.map((p) =>
				preloadGLB(`${models.smallStones.path}${p}`),
			),
			...models.mediumRocks.values.map((p) =>
				preloadGLB(`${models.mediumRocks.path}${p}`),
			),
			...models.trees.values.map((p) => preloadGLB(`${models.trees.path}${p}`)),
			...models.dungeons.values.map((p) =>
				preloadGLB(`${models.dungeons.path}${p}`),
			),

			preloadTextures('/3d/textures/seasons/autumn_ground.jpg'),
			preloadTextures('/3d/textures/seasons/summer_ground.jpg'),
			preloadTextures('/3d/textures/seasons/winter_ground.jpg'),
			preloadTextures('/3d/textures/seasons/spring_ground.jpg'),
		]);
	}
</script>

<QueryClientProvider client={queryClient}>
	<Router route="/game">
		<UiHelpers />
		<Modals />
		<MissionAlerts />
		<WildlifeAlerts />
		<ExperimentHud />
	</Router>

	<main
		class="flex size-full min-h-screen flex-col items-center justify-center bg-linear-to-br from-rose-500/10 to-blue-500/20"
	>
		<Router route="/login">
			<LoginView />
		</Router>

		<Router route="/profile">
			{#await Promise.all( [waitFor(Number(import.meta.env.VITE_WAIT_TIME) || 0), preloadGLB('/3d/SkinModel2.glb')], )}
				<Loading />
			{:then _}
				<ProfileView />
			{:catch error}
				<p class="text-red-500">
					Error loading information profile: {error.message}
				</p>
			{/await}
		</Router>

		<Router route="/game">
			{#await preloadResources()}
				<Loading />
			{:then _}
				<GameView />
			{:catch error}
				<p class="text-red-500">Error loading models: {error.message}</p>
			{/await}
		</Router>

		<Router route="/admin">
			<AdminView />
		</Router>

		<Router route="/missions">
			<MissionsView />
		</Router>
	</main>
</QueryClientProvider>
