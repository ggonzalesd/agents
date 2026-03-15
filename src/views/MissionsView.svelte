<script lang="ts">
	import MissionsList from '@/components/missions/MissionsList.svelte';
	import CreateMission from '@/components/missions/CreateMission.svelte';

	let showCreateModal = $state(false);

	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			showCreateModal = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && showCreateModal) {
			showCreateModal = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="min-h-screen bg-gris-900 text-white py-8">
	<MissionsList onCreateMission={() => showCreateModal = true} />
</div>

{#if showCreateModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/75"
		role="button"
		onclick={handleOverlayClick}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="max-h-[90vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
			<CreateMission
				onBack={() => showCreateModal = false}
				onSuccess={() => showCreateModal = false}
			/>
		</div>
	</div>
{/if}
