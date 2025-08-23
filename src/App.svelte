<svelte:options runes />

<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { getDebugContext, useDebugHook } from '@/hooks/useDebug.svelte';
	import ViewDebugContext from './components/ViewDebugContext.svelte';
	import InputText from './components/InputText.svelte';

	import emailSvgContent from '@/assets/icons/email.svg?raw';

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
	<form class="flex flex-col">
		<InputText iconSvgContent={emailSvgContent} type="password" />
		<InputText iconSvgContent={emailSvgContent} />
		<InputText iconSvgContent={emailSvgContent} />
		<InputText iconSvgContent={emailSvgContent} />
	</form>
</main>
