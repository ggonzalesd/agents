<script lang="ts">
	import InputText from '@/components/InputText.svelte';
	import { onMount } from 'svelte';
	import {
		createNPCService,
		getOneNPCService,
		updateNPCService,
	} from '@/services/api.service';
	import Button from '@/components/ui/Button.svelte';

	interface Props {
		action: string;
		npcId?: string;
	}

	let { action, npcId }: Props = $props();

	const data = $state({
		name: '',
		description: '',
		identifier: '',
		display: '',
		x: '',
		y: '',
		z: '',
		skin: '',
	});

	onMount(() => {
		if (action === 'edit') {
			getOneNPCService(npcId!).then((res) => {
				if (res.ok) {
					const npc = res.data;
					data.name = npc.name;
					data.description = npc.description;
					data.identifier = npc.identifier;
					data.display = npc.display;
					data.x = npc.x.toString();
					data.y = npc.y.toString();
					data.z = npc.z.toString();
					data.skin = npc.skin;
				} else {
					console.error('Failed to fetch NPC data:', res.error);
				}
			});
		}
	});

	const handleCreate = () => {
		if (action === 'create') {
			createNPCService(data).then((res) => {
				if (res.ok) {
					console.log('NPC creado con éxito:', res.data);
				} else {
					console.error('Error al crear el NPC:', res.error);
				}
			});
		}
	};

	const handleEdit = () => {
		if (action === 'edit') {
			updateNPCService(npcId!, data).then((res) => {
				if (res.ok) {
					console.log('NPC actualizado con éxito:', res.data);
				} else {
					console.error('Error al actualizar el NPC:', res.error);
				}
			});
		}
	};
</script>

<section
	class="flex h-full w-full flex-col items-center justify-center px-8 py-4 lg:px-10 xl:px-30 2xl:px-0"
>
	<div
		class="bg-gris-800 flex w-full flex-col gap-4 rounded-[12px] shadow-lg max-xl:h-full max-sm:justify-center md:gap-6 lg:flex-row 2xl:w-[1200px]"
	>
		<div
			class="flex h-full w-full items-center justify-center p-4 text-center max-sm:hidden lg:w-[30%]"
		>
			MODELO 3D
		</div>

		<div
			class="flex w-full flex-col justify-center gap-4 px-4 py-10 max-md:py-4 max-sm:gap-2 lg:w-[70%]"
		>
			<h1 class="font-zen-dots text-gris-50 w-full text-center text-xl">
				{action === 'create' ? 'Crear nuevo NPC' : 'Editar NPC'}
			</h1>

			<div class="flex flex-col md:flex-row">
				<div class="flex w-full flex-col gap-2.5 p-2.5">
					<span class="font-space-mono text-gris-50 text-sm">Name</span>
					<InputText name="name" placeholder="Name" bind:value={data.name} />
				</div>

				<div class="flex w-full flex-col gap-2.5 p-2.5">
					<span class="font-space-mono text-gris-50 text-sm">Description</span>
					<InputText
						name="description"
						placeholder="Description"
						bind:value={data.description}
					/>
				</div>
			</div>

			<div class="flex flex-col md:flex-row">
				<div class="flex w-full flex-col gap-2.5 p-2.5">
					<span class="font-space-mono text-gris-50 text-sm">Identifier</span>
					<InputText
						name="identifier"
						placeholder="Identifier"
						bind:value={data.identifier}
					/>
				</div>

				<div class="flex w-full flex-col gap-2.5 p-2.5">
					<span class="font-space-mono text-gris-50 text-sm">Display</span>
					<InputText
						name="display"
						placeholder="Display"
						bind:value={data.display}
					/>
				</div>
			</div>

			<div class="flex flex-row">
				<div class="flex w-full flex-col gap-2.5 p-2.5">
					<span class="font-space-mono text-gris-50 text-sm">Pos X</span>
					<InputText name="x" placeholder="X" bind:value={data.x} />
				</div>

				<div class="flex w-full flex-col gap-2.5 p-2.5">
					<span class="font-space-mono text-gris-50 text-sm">Pos Y</span>
					<InputText name="y" placeholder="Y" bind:value={data.y} />
				</div>

				<div class="flex w-full flex-col gap-2.5 p-2.5">
					<span class="font-space-mono text-gris-50 text-sm">Pos Z</span>
					<InputText name="z" placeholder="Z" bind:value={data.z} />
				</div>
			</div>

			<div class="flex flex-col gap-2.5 p-2.5">
				<span class="font-space-mono text-gris-50 text-sm">Skin</span>
				<label
					class="bg-gris-700 text-gris-200 text-md font-space-mono h-10 rounded-sm px-3 py-2 hover:cursor-pointer"
				>
					<span>Select Skin</span>
					<input type="file" class="sr-only" />
				</label>
			</div>

			<div class="flex w-full justify-center">
				{#if action === 'create'}
					<Button class="!h-12" type="button" onclick={handleCreate}>
						Create NPC
					</Button>
				{/if}
				{#if action === 'edit'}
					<Button class="!h-12" type="button" onclick={handleEdit}>
						Actualizar NPC
					</Button>
				{/if}
			</div>
		</div>
	</div>
</section>
