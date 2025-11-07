<svelte:options runes />

<script lang="ts">
	import CreateEditNPC from '@/components/admin/npcs/CreateEditNPC.svelte';
	import ListNPC from '@/components/admin/npcs/ListNPC.svelte';
	import AppSidebar from '@/lib/components/app-sidebar.svelte';
	import * as Sidebar from '@/lib/components/ui/sidebar/index.js';

	// Estado activeTab
	let actionTab = $state('Create-NPC');
	let npcId = $state('');
</script>

<section class="size-full min-h-screen">
	<Sidebar.Provider>
		<AppSidebar bind:activeTab={actionTab} />
		<Sidebar.Inset class="bg-gris-900 overflow-hidden">
			<header
				class="bg-gris-800 border-b-gris-500 flex h-16 shrink-0 items-center gap-2 border-b-1 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
			>
				<div class="flex items-center gap-2 px-4">
					<Sidebar.Trigger />
				</div>
			</header>

			{#if actionTab === 'Create-NPC'}
				<CreateEditNPC action="create" />
			{/if}

			{#if actionTab === 'Edit-NPC'}
				<CreateEditNPC action="edit" {npcId} />
			{/if}

			{#if actionTab === 'List-NPC'}
				<ListNPC bind:activeTab={actionTab} bind:npcId />
			{/if}
		</Sidebar.Inset>
	</Sidebar.Provider>
</section>
