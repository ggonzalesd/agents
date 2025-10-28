<svelte:options runes />

<script lang="ts">
	import { getGameStateContext } from '@/hooks/useGameState.svelte';
	import PauseModal from './modals/PauseModal.svelte';
	import MessageModal from './modals/MessageModal.svelte';
	import InventoryModal from './modals/InventoryModal.svelte';
	import OnLeaveModal from './modals/OnLeaveModal.svelte';
	import { getContext, onMount } from 'svelte';
	import { GameInput } from '@/utils/input.utils';
	import EntityDetailsModal from './modals/EntityDetailsModal.svelte';

	let gameState = getGameStateContext();
	let inputs = getContext<GameInput>(GameInput.name);

	const onClick = (e: MouseEvent) => {
		// Prevent clicks inside the modal from closing it
		if (e.target !== e.currentTarget) return;

		// Prevent clicks from propagating to underlying game elements
		e.stopPropagation();
		e.preventDefault();

		if (e.target !== e.currentTarget) return;

		gameState.continueGame();
		gameState.setSelectedEntity(null);
		inputs.disabled = false;
	};

	onMount(() => {
		inputs.disabled = true;
	});
</script>

{#if $gameState.paused}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div
		class="absolute top-0 left-0 z-10 flex size-full items-center justify-center bg-black/75 transition-colors starting:bg-transparent"
		role="button"
		onclick={onClick}
	>
		{#if $gameState.view === 'MENU'}
			<PauseModal />
		{:else if $gameState.view === 'MESSAGE'}
			<MessageModal />
		{:else if $gameState.view === 'INVENTORY'}
			<InventoryModal />
		{:else if $gameState.view === 'ONLEAVE'}
			<OnLeaveModal />
		{:else if $gameState.view === 'ENTITYDETAILS'}
			<EntityDetailsModal />
		{/if}
	</div>
{/if}
