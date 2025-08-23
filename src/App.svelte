<svelte:options runes />

<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { getDebugContext, useDebugHook } from '@/hooks/useDebug.svelte';
	import ViewDebugContext from './components/ViewDebugContext.svelte';

	setContext(useDebugHook.name, useDebugHook());

	onMount(() => {
		const debugContext = getDebugContext();
		debugContext.add('App mounted', { type: 'info', isCode: false });
	});
</script>

<main>
	<ViewDebugContext />
</main>
