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
		x: number;
		y: number;
		z: number;
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

	const handleCreate = () => {
		activeTab = 'Create-NPC';
	};

	const handleEdit = () => {
		npcId = npcId;
		activeTab = 'Edit-NPC';
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
				<Button class="!h-12" type="button" onclick={handleCreate}>
					Create NPC
				</Button>
			</div>
		</div>
	</div>
</section>
