<svelte:options runes />

<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { getDebugContext, useDebugHook } from '@/hooks/useDebug.svelte';

	// import LoginView from './views/LoginView.svelte';
	import GameView from '@/views/GameView.svelte';
	import UiHelpers from './components/UiHelpers.svelte';
	import { useActions } from './hooks/useActions.svelte';
	import { useGameInput } from './hooks/useGameInput';


	setContext(useDebugHook.name, useDebugHook());
	setContext(useActions.name, useActions());

	onMount(() => {
		const debugContext = getDebugContext();
		debugContext.add('App mounted', { type: 'info', isCode: false });
	});
</script>

<UiHelpers />

<main
	class="flex size-full min-h-screen  pointer-events-none flex-col items-center justify-center bg-gradient-to-br from-lime-500/10 to-blue-500/20"
>
	<!-- <LoginView /> -->
	<GameView />
</main>
