<svelte:options runes />

<script lang="ts">
	import CreateEditNPC from '@/components/admin/npcs/CreateEditNPC.svelte';
	import ListNPC from '@/components/admin/npcs/ListNPC.svelte';
	import AppSidebar from '@/lib/components/app-sidebar.svelte';
	import * as Sidebar from '@/lib/components/ui/sidebar/index.js';

	import Router from '@/components/lib/Router.svelte';
	import CreateEditUser from '@/components/admin/users/CreateEditUser.svelte';
	import ListUser from '@/components/admin/users/ListUser.svelte';
</script>

<section class="size-full min-h-screen">
	<Sidebar.Provider>
		<AppSidebar />
		<Sidebar.Inset class="bg-gris-900 overflow-hidden">
			<header
				class="bg-gris-800 border-b-gris-500 flex h-16 shrink-0 items-center gap-2 border-b-1 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
			>
				<div class="flex items-center gap-2 px-4">
					<Sidebar.Trigger />
				</div>
			</header>

			<Router route="/npcs">
				<Router route="/create">
					<CreateEditNPC action="create" />
				</Router>

				<Router route="/edit">
					<svelte:boundary>
						{#snippet failed(error)}
							<p class="p-4 text-red-500">
								Error loading NPC data:
								{error instanceof Error ? error.message : 'Unknown error'}
							</p>
						{/snippet}

						<CreateEditNPC action="edit" />
					</svelte:boundary>
				</Router>

				<Router route="/list">
					<ListNPC />
				</Router>
			</Router>

			<Router route="/users">
				<Router route="/create">
					<CreateEditUser action="create" />
				</Router>

				<Router route="/edit">
					<svelte:boundary>
						{#snippet failed(error)}
							<p class="p-4 text-red-500">
								Error loading NPC data:
								{error instanceof Error ? error.message : 'Unknown error'}
							</p>
						{/snippet}

						<CreateEditUser action="edit" />
					</svelte:boundary>
				</Router>

				<Router route="/list">
					<ListUser />
				</Router>
			</Router>
		</Sidebar.Inset>
	</Sidebar.Provider>
</section>
