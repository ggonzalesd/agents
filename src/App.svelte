<svelte:options runes />

<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { getDebugContext, useDebugHook } from '@/hooks/useDebug.svelte';

	import LoginView from './views/LoginView.svelte';
	import GameView from '@/views/GameView.svelte';
	import UiHelpers from './components/UiHelpers.svelte';
	import { useActions } from './hooks/useActions.svelte';
	import { GameInput } from './utils/input.utils';
	import Modals from './components/Modals.svelte';
	import { useGameState } from './hooks/useGameState.svelte';
	import { preloadGLB, preloadTextures, waitFor } from './utils/assets.utils';
	import { useRouter } from './hooks/useRouter.svelte';
	import Router from './components/lib/Router.svelte';
	import ProfileView from './views/ProfileView.svelte';
	import Loading from './views/Loading.svelte';
	import { WorldEcs } from '#/ecs/World.ecs';
	import { Option } from '#/utils/Option';
	import AdminView from './views/AdminView.svelte';

	setContext(useDebugHook.name, useDebugHook());
	setContext(useActions.name, useActions());
	setContext(GameInput.name, new GameInput());
	setContext(useGameState.name, useGameState());
	setContext(useRouter.name, useRouter('/login'));
	setContext(WorldEcs.name, Option.none<WorldEcs>());

	onMount(() => {
		const debugContext = getDebugContext();
		debugContext.add('App mounted', { type: 'info', isCode: false });
	});

	function preloadResources() {
		return Promise.all([
			preloadGLB('/3d/SkinModel.glb'),
			preloadTextures('/3d/textures/seasons/autumn_ground.jpg'),
			preloadTextures('/3d/textures/seasons/summer_ground.jpg'),
			preloadTextures('/3d/textures/seasons/winter_ground.jpg'),
			preloadTextures('/3d/textures/seasons/spring_ground.jpg'),
		]);
	}
</script>

<Router route="/game">
	<UiHelpers />
	<Modals />
</Router>

<main
	class="flex size-full min-h-screen flex-col items-center justify-center bg-gradient-to-br from-rose-500/10 to-blue-500/20"
>
	<Router route="/login">
		<LoginView />
	</Router>

	<Router route="/profile">
		{#await Promise.all( [waitFor(Number(import.meta.env.VITE_WAIT_TIME) || 0), preloadGLB('/3d/SkinModel.glb')], )}
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
</main>
