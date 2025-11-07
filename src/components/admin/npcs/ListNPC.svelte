<script lang="ts">
	import InputText from '@/components/InputText.svelte';
	import { onMount } from 'svelte';
	import {
		createNPCService,
		getAllNPCsService,
		updateNPCService,
	} from '@/services/api.service';
	import Button from '@/components/ui/Button.svelte';

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

	let { activeTab = $bindable(''), npcId = $bindable('') }: Props = $props();

	let npcsList = $state<NPC[]>([]);

	onMount(() => {
		getAllNPCsService().then((res) => {
			if (res.ok) {
				npcsList = res.data.map((npc: any) => ({
					id: npc.id,
					name: npc.name,
					description: npc.description,
					identifier: npc.identifier,
					display: npc.display,
					x: npc.x,
					y: npc.y,
					z: npc.z,
					skin: npc.skin,
				}));
			} else {
				console.error('Failed to fetch NPCs:', res.error);
			}
		});
	});

	npcsList = [
		{
			id: '1',
			name: 'Guardia',
			description: 'NPC que protege la ciudad',
			identifier: 'guard_001',
			display: 'Guardia de la Ciudad',
			x: '10',
			y: '20',
			z: '30',
			skin: 'default',
		},
		{
			id: '2',
			name: 'Vendedor',
			description: 'NPC que vende objetos',
			identifier: 'shop_001',
			display: 'Vendedor Ambulante',
			x: '15',
			y: '25',
			z: '35',
			skin: 'default',
		},
		{
			id: '3',
			name: 'Mago',
			description: 'NPC que ofrece misiones mágicas',
			identifier: 'mage_001',
			display: 'Mago del Bosque',
			x: '20',
			y: '30',
			z: '40',
			skin: 'default',
		},
	];

	const handleCreate = () => {
		activeTab = 'Create-NPC';
	};
</script>

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
					<div class="border-gris-700 border-b p-2 text-left font-semibold">
						ID
					</div>
					<div class="border-gris-700 border-b p-2 text-left font-semibold">
						Name
					</div>
					<div class="border-gris-700 border-b p-2 text-left font-semibold">
						Description
					</div>
					<div class="border-gris-700 border-b p-2 text-left font-semibold">
						Identifier
					</div>
					<div class="border-gris-700 border-b p-2 text-left font-semibold">
						Display
					</div>
					<div class="border-b border-gray-700 p-2 text-left font-semibold">
						Position xyz
					</div>
					<div class="border-b border-gray-700 p-2 text-left font-semibold">
						Actions
					</div>

					<!-- Filas -->
					{#each npcsList as npc}
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
				</div>
			</div>
		</div>
	</div>
</section>
