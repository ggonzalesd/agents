<script lang="ts">
	import { onMount } from 'svelte';
	import axios from 'axios';

	import { get } from 'svelte/store';

	import InputText from '@/components/InputText.svelte';
	import * as APIService from '@/services/api.service';
	import Button from '@/components/ui/Button.svelte';
	import { getRouterContext } from '@/hooks/useRouter.svelte';

	interface Props {
		action: string;
	}

	let { action }: Props = $props();

	const routerContext = getRouterContext();
	const npcId = get(routerContext).data?.npcId;

	if (typeof npcId !== 'string' && action === 'edit') {
		throw new Error('npcId must be a string');
	}

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
			APIService.getOneNPCService(npcId!).then(({ agent, entity, npc }) => {
				data.name = agent.display;
				data.description = npc.description;
				data.identifier = agent.identifier;
				data.display = agent.display;
				data.x = agent.positionX.toString();
				data.y = agent.positionY.toString();
				data.z = agent.positionZ.toString();
				data.skin = npc.skinUrl;
			});
		}
	});

	const handleCreate = () => {
		if (action === 'create') {
			APIService.createNPCService(data).then((res) => {
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
			APIService.updateNPCService(npcId!, data).then((res) => {
				if (res.ok) {
					console.log('NPC actualizado con éxito:', res.data);
				} else {
					console.error('Error al actualizar el NPC:', res.error);
				}
			});
		}
	};

	let skinState = $state({
		ok: false,
		loading: false,
		error: null as string | null,
		url: '',
	});

	const handleUploadSkin = async (file: File) => {
		skinState = {
			ok: false,
			loading: true,
			error: null,
			url: '',
		};

		try {
			// Simulate upload process
			const formData = new FormData();
			formData.append('file', file);

			const response = await axios.post(
				`${import.meta.env.VITE_API_URL}/api/v1/skin/save`,
				formData,
				{
					headers: {
						'Content-Type': 'multipart/form-data',
					},
				},
			);

			if (response.status === 200) {
				skinState = {
					ok: true,
					loading: false,
					error: null,
					url: response.data.data.url,
				};
				data.skin = skinState.url;
			} else {
				skinState = {
					ok: false,
					loading: false,
					error: 'Failed to upload skin.',
					url: '',
				};
			}
		} catch (error) {
			skinState = {
				...skinState,
				ok: false,
				error: 'An error occurred during upload.',
			};
		} finally {
			skinState = {
				...skinState,
				loading: false,
			};
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
					class="bg-gris-700 text-gris-200 text-md font-space-mono inline-flex h-10 items-center gap-2 rounded-sm px-3 py-2 hover:cursor-pointer"
				>
					{#if skinState.ok}
						<img
							src={skinState.url}
							alt="NPC Skin"
							class="mt-2 size-8 object-cover"
						/>
					{/if}

					<span>
						{#if skinState.loading}
							Uploading...
						{:else if skinState.ok}
							Skin Uploaded
						{:else}
							Upload Skin
						{/if}
					</span>

					<input
						type="file"
						class="sr-only"
						onchange={(e) => {
							const files = (e.target as HTMLInputElement).files;
							if (files && files.length > 0) {
								handleUploadSkin(files[0]);
							}
						}}
					/>
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
