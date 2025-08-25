<svelte:options runes />

<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { getDebugContext, useDebugHook } from '@/hooks/useDebug.svelte';

	import ViewDebugContext from './components/ViewDebugContext.svelte';
	// import LoginView from './views/LoginView.svelte';
	import GameView from '@/views/GameView.svelte';

	setContext(useDebugHook.name, useDebugHook());

	onMount(() => {
		const debugContext = getDebugContext();
		debugContext.add('App mounted', { type: 'info', isCode: false });
	});
</script>

<ViewDebugContext />

<main
	class="flex size-full min-h-screen flex-col items-center justify-center bg-gradient-to-br from-lime-500/10 to-blue-500/20"
>
	<!-- <LoginView /> -->
	<GameView />
</main>
