<script lang="ts">
	import { standarError } from '#/error/standar-error';

	import { getAllUsersService } from '@/services/api.service';
	import Button from '@/components/ui/Button.svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import { getRouterContext } from '@/hooks/useRouter.svelte';

	let queryUsers = createQuery(() => ({
		queryKey: ['usersList'],
		queryFn: () => getAllUsersService(),
		gcTime: 0,
		staleTime: 0,
	}));

	const { changeRoute } = getRouterContext();
</script>

{#snippet errorHandler(_error: unknown)}
	{@const error = standarError(_error)}

	<div class="border-b border-gray-700 p-2 text-left text-nowrap text-red-500">
		<span>Error: {error.message}</span>

		{#each Object.keys(error.errors) as key}
			<div class="text-red-500">
				{key}: {error.errors[key].join(', ')}
			</div>
		{/each}
	</div>
{/snippet}

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
				Lista de Users
			</h1>

			<div class="flex w-full justify-end">
				<Button
					class="!h-10"
					type="button"
					onclick={() => changeRoute('/admin/users/create')}
				>
					Create User
				</Button>
			</div>

			<div class="w-full overflow-x-auto">
				<!-- Contenedor principal: un solo grid -->
				<div
					class="grid w-full min-w-[1100px] text-sm"
					style="grid-template-columns: 5% 15% 25% 15% 10% 20% 10%;"
				>
					<!-- Encabezados -->
					{#each ['ID', 'Name', 'Password', 'Identifier', 'Display', 'Position xyz', 'Actions'] as header}
						{@render tableHeader(header)}
					{/each}

					<!-- Filas -->
					{#if queryUsers.isLoading}
						<div class="border-b border-gray-700 p-2 text-left">Loading...</div>
					{:else if queryUsers.isError}
						{@render errorHandler(queryUsers.error)}
					{:else if queryUsers.isSuccess}
						{#each queryUsers.data.data as user}
							<div class="border-gris-700 border-b p-2">{user.id}</div>
							<div
								class="border-gris-700 truncate overflow-hidden border-b p-2 whitespace-nowrap"
							>
								{user.name}
							</div>
							<div
								class="border-gris-700 truncate overflow-hidden border-b p-2 whitespace-nowrap"
							>
								{user.password}
							</div>
							<div
								class="border-gris-700 truncate overflow-hidden border-b p-2 whitespace-nowrap"
							>
								{user.identifier}
							</div>
							<div
								class="border-gris-700 truncate overflow-hidden border-b p-2 whitespace-nowrap"
							>
								{user.display}
							</div>
							<div
								class="border-gris-700 truncate overflow-hidden border-b p-2 whitespace-nowrap"
							>
								{user.x}, {user.y}, {user.z}
							</div>
							<div class="border-gris-700 border-b p-2">
								<Button
									class="!h-8 !px-3"
									type="button"
									onclick={() => {
										changeRoute('/admin/users/edit', { userId: user.id });
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
