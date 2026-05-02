<script lang="ts">
	import { standarError } from '#/error/standar-error';

	import {
		getAllUsersService,
		createRedeemTokenService,
		listRedeemTokensService,
		deleteRedeemTokenService,
	} from '@/services/api.service';
	import Button from '@/components/ui/Button.svelte';
	import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { getRouterContext } from '@/hooks/useRouter.svelte';
	import { getDebugContext } from '@/hooks/useDebug.svelte';

	const debugContext = getDebugContext();

	let queryUsers = createQuery(() => ({
		queryKey: ['usersList'],
		queryFn: () => getAllUsersService(),
		gcTime: 0,
		staleTime: 0,
	}));

	let queryTokens = createQuery(() => ({
		queryKey: ['redeemTokensList'],
		queryFn: () => listRedeemTokensService(),
		gcTime: 0,
		staleTime: 0,
	}));

	const queryClient = useQueryClient();
	const { changeRoute } = getRouterContext();

	let showTokenForm = $state<string | null>(null);
	let tokenValidFrom = $state('');
	let tokenValidUntil = $state('');

	const createTokenMutation = createMutation(() => ({
		mutationFn: (payload: { userId: string; validFrom: string; validUntil: string }) =>
			createRedeemTokenService(payload),
		onSuccess: (data: Awaited<ReturnType<typeof createRedeemTokenService>>) => {
			if (data.ok) {
				debugContext.success(`Token created: ${data.data.token}`);
				showTokenForm = null;
				tokenValidFrom = '';
				tokenValidUntil = '';
				queryClient.invalidateQueries({ queryKey: ['redeemTokensList'] });
			} else {
				debugContext.error(data.error.message);
			}
		},
		onError: (error: Error) => {
			debugContext.error(error.message);
		},
	}));

	const deleteTokenMutation = createMutation(() => ({
		mutationFn: (tokenId: string) => deleteRedeemTokenService(tokenId),
		onSuccess: (data: Awaited<ReturnType<typeof deleteRedeemTokenService>>) => {
			if (data.ok) {
				debugContext.success('Token deleted');
				queryClient.invalidateQueries({ queryKey: ['redeemTokensList'] });
			} else {
				debugContext.error(data.error.message);
			}
		},
		onError: (error: Error) => {
			debugContext.error(error.message);
		},
	}));

	const handleCreateToken = (userId: string) => {
		if (!tokenValidFrom || !tokenValidUntil) {
			debugContext.error('Both dates are required');
			return;
		}

		createTokenMutation.mutate({
			userId,
			validFrom: new Date(tokenValidFrom).toISOString(),
			validUntil: new Date(tokenValidUntil).toISOString(),
		});
	};

	const formatDate = (date: Date | string) => {
		const d = new Date(date);
		return d.toLocaleString();
	};
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
		class="bg-gris-800 flex w-full flex-col gap-4 rounded-[12px] shadow-lg max-xl:h-full max-sm:justify-center md:gap-6 2xl:w-[1200px]"
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
				<div
					class="grid w-full min-w-[1100px] text-sm"
					style="grid-template-columns: 5% 12% 20% 12% 10% 16% 25%;"
				>
					{#each ['ID', 'Name', 'Password', 'Identifier', 'Display', 'Position xyz', 'Actions'] as header}
						{@render tableHeader(header)}
					{/each}

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
							<div class="border-gris-700 flex gap-2 border-b p-2">
								<Button
									class="!h-8 !px-3"
									type="button"
									onclick={() => {
										changeRoute('/admin/users/edit', { userId: user.id });
									}}
								>
									Edit
								</Button>
								<Button
									class="!h-8 !px-3 !bg-blue-700 hover:!bg-blue-600"
									type="button"
									onclick={() => {
										showTokenForm = showTokenForm === user.id ? null : user.id;
										tokenValidFrom = '';
										tokenValidUntil = '';
									}}
								>
									{showTokenForm === user.id ? 'Cancel' : 'Token'}
								</Button>
							</div>

							{#if showTokenForm === user.id}
								<div
									class="border-gris-600 bg-gris-750 col-span-full flex items-center gap-4 border-b px-4 py-3"
								>
									<span class="text-gris-300 text-xs font-semibold whitespace-nowrap">
										Create Token for {user.name}:
									</span>
									<div class="flex items-center gap-2">
										<label for="token-valid-from" class="text-gris-400 text-xs">From:</label>
										<input
											id="token-valid-from"
											type="datetime-local"
											class="bg-gris-700 text-gris-200 rounded-sm px-2 py-1 text-xs"
											bind:value={tokenValidFrom}
										/>
									</div>
									<div class="flex items-center gap-2">
										<label for="token-valid-until" class="text-gris-400 text-xs">Until:</label>
										<input
											id="token-valid-until"
											type="datetime-local"
											class="bg-gris-700 text-gris-200 rounded-sm px-2 py-1 text-xs"
											bind:value={tokenValidUntil}
										/>
									</div>
									<Button
										class="!h-8 !px-4 !bg-green-700 hover:!bg-green-600"
										type="button"
										disabled={createTokenMutation.isPending}
										onclick={() => handleCreateToken(user.id)}
									>
										{createTokenMutation.isPending ? 'Creating...' : 'Create'}
									</Button>
								</div>
							{/if}
						{/each}
					{/if}
				</div>
			</div>

			<!-- Active Redeem Tokens Section -->
			<div class="mt-8">
				<h2 class="font-zen-dots text-gris-50 mb-4 w-full text-center text-lg">
					Active Redeem Tokens
				</h2>

				<div class="w-full overflow-x-auto">
					<div
						class="grid w-full min-w-[900px] text-sm"
						style="grid-template-columns: 25% 20% 20% 20% 15%;"
					>
						{#each ['Token', 'User', 'Valid From', 'Valid Until', 'Actions'] as header}
							{@render tableHeader(header)}
						{/each}

						{#if queryTokens.isLoading}
							<div class="border-b border-gray-700 p-2 text-left">Loading...</div>
						{:else if queryTokens.isError}
							{@render errorHandler(queryTokens.error)}
						{:else if queryTokens.isSuccess && queryTokens.data.ok}
							{#each queryTokens.data.data as redeemToken}
								<div
									class="border-gris-700 truncate overflow-hidden border-b p-2 font-mono text-xs whitespace-nowrap"
								>
									{redeemToken.token}
								</div>
								<div
									class="border-gris-700 truncate overflow-hidden border-b p-2 whitespace-nowrap"
								>
									{redeemToken.user.username}
									{#if redeemToken.user.display}
										({redeemToken.user.display})
									{/if}
								</div>
								<div class="border-gris-700 border-b p-2 text-xs">
									{formatDate(redeemToken.validFrom)}
								</div>
								<div class="border-gris-700 border-b p-2 text-xs">
									{formatDate(redeemToken.validUntil)}
								</div>
								<div class="border-gris-700 border-b p-2">
									<Button
										class="!h-8 !px-3 !bg-red-700 hover:!bg-red-600"
										type="button"
										disabled={deleteTokenMutation.isPending}
										onclick={() => deleteTokenMutation.mutate(redeemToken.id)}
									>
										Delete
									</Button>
								</div>
							{/each}

							{#if queryTokens.data.data.length === 0}
								<div class="text-gris-500 col-span-full p-4 text-center">
									No active redeem tokens
								</div>
							{/if}
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
