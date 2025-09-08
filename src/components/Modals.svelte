<svelte:options runes />

<script lang="ts">
	import { getGameStateContext } from '@/hooks/useGameState.svelte';
	import PauseModal from './modals/PauseModal.svelte';
	import MessageModal from './modals/MessageModal.svelte';
	import InventoryModal from './modals/InventoryModal.svelte';

	let gameState = getGameStateContext();
</script>

{#if $gameState.paused}
	<div
		class="absolute top-0 left-0 z-10 flex size-full items-center justify-center bg-black/75 transition-colors starting:bg-transparent"
	>
		{#if $gameState.view === 'MENU'}
			<PauseModal />
		{:else if $gameState.view === 'MESSAGE'}
			<MessageModal />
		{:else if $gameState.view === 'INVENTORY'}
			<InventoryModal />
		{/if}
	</div>
{/if}
