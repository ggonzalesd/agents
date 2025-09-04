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
	import { preloadGLB } from './utils/assets.utils';
	import { useRouter } from './hooks/useRouter.svelte';
	import Router from './components/lib/Router.svelte';
	import ProfileView from './views/ProfileView.svelte';
	import Loading from './views/Loading.svelte';
	import { WorldEcs } from '#/ecs/World.ecs';
	import { Option } from '#/utils/Option';

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
</script>

<Router route="/game">
	<UiHelpers />
	<Modals />
</Router>

<main
	class="pointer-events-none flex size-full min-h-screen flex-col items-center justify-center bg-gradient-to-br from-rose-500/10 to-blue-500/20"
>
	<Router route="/login">
		<LoginView />
	</Router>

	<Router route="/profile">
		<ProfileView />
	</Router>

	<Router route="/game">
		{#await preloadGLB('/3d/SkinModel.glb')}
			<Loading />
		{:then _}
			<GameView />
		{:catch error}
			<p class="text-red-500">Error loading models: {error.message}</p>
		{/await}
	</Router>
</main>
