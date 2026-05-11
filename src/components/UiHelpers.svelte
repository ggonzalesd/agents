<svelte:options runes />

<script lang="ts">
	import ViewDebugContext from '@/components/ViewDebugContext.svelte';
	import ViewActionsContext from './ViewActionsContext.svelte';
	import { getRouterContext } from '@/hooks/useRouter.svelte';
	import { getGameStateContext } from '@/hooks/useGameState.svelte';
	import { onMount } from 'svelte';
	import { profileService } from '@/services/api.service';

	const { changeRoute } = getRouterContext();
	const gameState = getGameStateContext();

	let helper = $state<'DEBUG' | 'ACTIONS'>('DEBUG');
	let isAdmin = $state(false);

	let isDisplay = $state<boolean>(true);
	let display = $derived(isDisplay ? 'X' : '>');

	onMount(() => {
		profileService().then((response) => {
			if (response.ok) {
				isAdmin = response.data.user.role === 'ADMIN';
			}
		});
	});
</script>

{#snippet btn(text: string, action?: () => void)}
	<button
		class="pointer-events-auto w-auto border border-zinc-700 bg-zinc-800 px-2 text-zinc-200 hover:cursor-pointer hover:bg-zinc-700 active:bg-zinc-600"
		onclick={action}
	>
		{text}
	</button>
{/snippet}

<div class="pointer-events-none absolute top-0 left-0 z-20 flex h-8 gap-1">
	{@render btn(display, () => (isDisplay = !isDisplay))}

	{#if isDisplay}
		<div class="w-2"></div>
		{@render btn('Debug', () => (helper = 'DEBUG'))}
		{@render btn('Actions', () => (helper = 'ACTIONS'))}
		<div class="w-2"></div>
		{@render btn('📋 Missions', () => gameState.setPause(true, 'MISSIONS'))}
		{@render btn('🎒 Inventory', () => gameState.setPause(true, 'INVENTORY'))}
		{#if isAdmin}
			{@render btn('⚡ TP', () => gameState.setPause(true, 'ADMIN_TP'))}
		{/if}
		{@render btn('👤 Profile', () => changeRoute('/profile'))}
	{/if}
</div>

{#if isDisplay}
	{#if helper === 'DEBUG'}
		<ViewDebugContext />
	{/if}
	{#if helper === 'ACTIONS'}
		<ViewActionsContext />
	{/if}
{/if}
