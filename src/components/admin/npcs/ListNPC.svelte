<script lang="ts">
	import { getAllNPCsService } from '@/services/api.service';
	import Button from '@/components/ui/Button.svelte';
	import { createQuery } from '@tanstack/svelte-query';

	interface Props {
		activeTab?: string;
		npcId?: string;
	}

	interface NPC {
		id: string;
		name: string;
		description: string;
		identifier: string;
		display: string;
		x: string;
		y: string;
		z: string;
		skin: string;
	}

	let queryNpcs = createQuery(() => ({
		queryKey: ['npcsList'],
		queryFn: () => getAllNPCsService(),
		gcTime: 0,
		staleTime: 0,
	}));

	let { activeTab = $bindable(''), npcId = $bindable('') }: Props = $props();

	const handleCreate = () => {
		activeTab = 'Create-NPC';
	};
</script>

{#snippet tableHeader(name: string)}
	<div class="border-gris-700 border-b p-2 text-left font-semibold">
		{name}
	</div>
{/snippet}

<section
	class="flex h-full w-full flex-col items-center justify-center px-8 py-4 lg:px-10 xl:px-30 2xl:px-0"
>
	<div
		class="bg-gris-800 flex w-full flex-col gap-4 rounded-[12px] shadow-lg max-xl:h-full max-sm:justify-center md:gap-6 lg:flex-row 2xl:w-[1200px]"
	>
		<div
			class="flex w-full flex-col justify-center gap-4 px-4 py-10 max-md:py-4 max-sm:gap-2"
		>
			<h1 class="font-zen-dots text-gris-50 w-full text-center text-xl">
				Lista de NPCs
			</h1>

			<div class="flex w-full justify-end">
				<Button class="!h-10" type="button" onclick={handleCreate}>
					Create NPC
				</Button>
			</div>

			<div class="w-full overflow-x-auto">
				<!-- Contenedor principal: un solo grid -->
				<div
					class="grid w-full min-w-[1100px] text-sm"
					style="grid-template-columns: 5% 15% 25% 15% 10% 20% 10%;"
				>
					<!-- Encabezados -->
					{#each ['ID', 'Name', 'Description', 'Identifier', 'Display', 'Position xyz', 'Actions'] as header}
						{@render tableHeader(header)}
					{/each}

					<!-- Filas -->
					{#if queryNpcs.isLoading}
						<div class="border-b border-gray-700 p-2 text-left">Loading...</div>
					{:else if queryNpcs.isError}
						<div class="border-b border-gray-700 p-2 text-left">
							Error loading NPCs
						</div>
					{:else if queryNpcs.isSuccess}
						{#each queryNpcs.data.data as npc}
							<div class="border-gris-700 border-b p-2">{npc.id}</div>
							<div
								class="border-gris-700 truncate overflow-hidden border-b p-2 whitespace-nowrap"
							>
								{npc.name}
							</div>
							<div
								class="border-gris-700 truncate overflow-hidden border-b p-2 whitespace-nowrap"
							>
								{npc.description}
							</div>
							<div
								class="border-gris-700 truncate overflow-hidden border-b p-2 whitespace-nowrap"
							>
								{npc.identifier}
							</div>
							<div
								class="border-gris-700 truncate overflow-hidden border-b p-2 whitespace-nowrap"
							>
								{npc.display}
							</div>
							<div
								class="border-gris-700 truncate overflow-hidden border-b p-2 whitespace-nowrap"
							>
								{npc.x}, {npc.y}, {npc.z}
							</div>
							<div class="border-gris-700 border-b p-2">
								<Button
									class="!h-8 !px-3"
									type="button"
									onclick={() => {
										npcId = npc.id;
										activeTab = 'Edit-NPC';
									}}
								>
									Edit
								</Button>
							</div>
						{/each}
					{/if}
				</div>
			</div>
		</div>
	</div>
</section>
