<script lang="ts">
	import { onMount } from 'svelte';
	import { httpService } from '@/services/http.service';

	import { get } from 'svelte/store';

	import InputText from '@/components/InputText.svelte';
	import * as APIService from '@/services/api.service';
	import Button from '@/components/ui/Button.svelte';
	import { getRouterContext } from '@/hooks/useRouter.svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import type { OkResponse } from '#/utils/http-client.util';

	interface Props {
		action: string;
	}

	let { action }: Props = $props();

	const routerContext = getRouterContext();
	const userId = get(routerContext).data?.userId;

	if (typeof userId !== 'string' && action === 'edit') {
		throw new Error('userId must be a string');
	}

	const data = $state({
		name: '',
		password: '',
		identifier: '',
		display: '',
		x: '',
		y: '',
		z: '',
		skin: '',
	});

	onMount(() => {
		if (action === 'edit') {
			APIService.getOneUserService(userId!).then((user) => {
				console.log(user);

				data.name = user.display;
				data.password = user.password ?? '';
				data.identifier = user.identifier;
				data.display = user.display;
				data.x = user.x.toString();
				data.y = user.y.toString();
				data.z = user.z.toString();
				data.skin = user.skin;
			});
		}
	});

	const handleCreate = () => {
		if (action === 'create') {
			APIService.createUserService(data).then((res) => {
				if (res.ok) {
					console.log('User creado con éxito:', res.data);
				} else {
					console.error('Error al crear el User:', res.error);
				}
			});

			routerContext.changeRoute('/admin/users/list');
		}
	};

	const handleEdit = () => {
		if (action === 'edit') {
			APIService.updateUserService(userId!, data).then((res) => {
				console.log(res);
			});

			routerContext.changeRoute('/admin/users/list');
		}
	};

	let file: File | null = $state.raw(null);

	const queryUpload = createQuery(() => ({
		queryKey: ['uploadSkin', file],
		queryFn: async () => {
			const f = $state.snapshot(file);

			if (!f) {
				throw new Error('No file selected');
			}

			const formData = new FormData();
			formData.append('file', f);

			const response = await httpService.post<
				OkResponse<{
					url: string;
					filename: string;
				}>
			>('/skin/save', formData, {
				headers: {
					'Content-Type': 'multipart/form-data',
				},
			});

			return response.data.data;
		},
		gcTime: 0,
		staleTime: 0,
		enabled: false,
	}));
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
				{action === 'create' ? 'Crear nuevo User' : 'Editar User'}
			</h1>

			<div class="flex flex-col md:flex-row">
				<div class="flex w-full flex-col gap-2.5 p-2.5">
					<span class="font-space-mono text-gris-50 text-sm">Name</span>
					<InputText name="name" placeholder="Name" bind:value={data.name} />
				</div>

				<div class="flex w-full flex-col gap-2.5 p-2.5">
					<span class="font-space-mono text-gris-50 text-sm">Password</span>
					<InputText
						name="password"
						placeholder="Password"
						bind:value={data.password}
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
					{#if data.skin}
						<img
							src={data.skin}
							alt="User Skin"
							class="mt-2 size-8 object-cover"
						/>
					{/if}

					<span>
						{#if queryUpload.isLoading}
							Uploading...
						{:else if queryUpload.isSuccess}
							Skin Uploaded
						{:else}
							Upload Skin
						{/if}
					</span>

					<input
						type="file"
						class="sr-only"
						onchange={(e) => {
							const target = e.target as HTMLInputElement;
							if (target.files && target.files.length > 0) {
								file = target.files[0];

								setTimeout(() => {
									queryUpload.refetch().then(({ data: _data }) => {
										if (_data) {
											data.skin = _data.url;
										}
									});
								}, 10);
							}
						}}
					/>
				</label>
			</div>

			<div class="flex w-full justify-center">
				{#if action === 'create'}
					<Button class="!h-12" type="button" onclick={handleCreate}>
						Create User
					</Button>
				{/if}
				{#if action === 'edit'}
					<Button class="!h-12" type="button" onclick={handleEdit}>
						Actualizar User
					</Button>
				{/if}
			</div>
		</div>
	</div>
</section>
