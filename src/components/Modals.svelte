<svelte:options runes />

<script lang="ts">
	import { getGameStateContext } from '@/hooks/useGameState.svelte';
	import PauseModal from './modals/PauseModal.svelte';
	import MessageModal from './modals/MessageModal.svelte';
	import InventoryModal from './modals/InventoryModal.svelte';
	import OnLeaveModal from './modals/OnLeaveModal.svelte';
	import { getContext } from 'svelte';
	import { GameInput } from '@/utils/input.utils';
	import { InputMode } from '@/utils/inputMode';
	import EntityDetailsModal from './modals/EntityDetailsModal.svelte';
	import MissionsModal from './modals/MissionsModal.svelte';
	import DialogueModal from './modals/DialogueModal.svelte';
	import AdminTpModal from './modals/AdminTpModal.svelte';

	let gameState = getGameStateContext();
	let inputs = getContext<GameInput>(GameInput.name);

	// Reactively enable/disable game inputs when modal opens/closes
	$effect(() => {
		if ($gameState.paused) {
			inputs.setMode(InputMode.UI);
		}
	});

	const onClick = (e: MouseEvent) => {
		if (e.target !== e.currentTarget) return;

		e.stopPropagation();
		e.preventDefault();

		// Don't close dialogue modal on backdrop click — use cancel button
		if ($gameState.view === 'DIALOGUE') return;

		gameState.continueGame();
		gameState.setSelectedEntity(null);
		inputs.setMode(InputMode.GAME);
	};
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
	{:else if $gameState.view === 'MISSIONS'}
		<MissionsModal />
{:else if $gameState.view === 'DIALOGUE'}
			<DialogueModal />
	{:else if $gameState.view === 'ADMIN_TP'}
			<AdminTpModal />
	{/if}
	</div>
{/if}
