<svelte:options runes />

<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { treeifyError } from 'zod';

	import { loginRequestSchema, redeemTokenLoginRequestSchema } from '#/schema/auth.schema';

	import { getDebugContext } from '@/hooks/useDebug.svelte';

	import InputText from '@/components/InputText.svelte';
	import Button from '@/components/ui/Button.svelte';

	import { GameInput } from '@/utils/input.utils';
	import { InputMode } from '@/utils/inputMode';
	import { loginService, redeemLoginService, profileService } from '@/services/api.service';
	import { getRouterContext } from '@/hooks/useRouter.svelte';
	import { getGameStateContext } from '@/hooks/useGameState.svelte';

	type LoginTab = 'credentials' | 'token';

	let activeTab = $state<LoginTab>('credentials');

	const credentialsData = $state({ username: '', password: '' });
	const tokenData = $state({ token: '' });

	const credentialsErrors = $derived.by(() => {
		const result = loginRequestSchema.safeParse(credentialsData);

		if (!result.success) {
			return treeifyError(result.error).properties;
		}

		return null;
	});

	const tokenErrors = $derived.by(() => {
		const result = redeemTokenLoginRequestSchema.safeParse(tokenData);

		if (!result.success) {
			const tree = treeifyError(result.error);
			if ('properties' in tree && tree.properties) {
				return tree.properties as Record<string, { errors: string[] }>;
			}
			return null;
		}

		return null;
	});

	let gameStateContext = getGameStateContext();
	let gameInputContext = getContext<GameInput>(GameInput.name);
	let routerContext = getRouterContext();
	const debugContext = getDebugContext();

	onMount(() => {
		gameInputContext.setMode(InputMode.UI);

		if (localStorage.getItem('token') == null) return;

		profileService().then((data) => {
			if (!data.ok) return;

			gameStateContext.setUsername(data.data.user.username);
			routerContext.changeRoute('/profile');
		});
	});

	let loading = $state(false);

	const onCredentialsSubmit = async (event: SubmitEvent) => {
		event.preventDefault();
		loading = true;

		const formData = new FormData(event.target as HTMLFormElement);
		const username = formData.get('username') as string;
		const password = formData.get('password') as string;

		const response = await loginService({ username, password });

		if (response.ok) {
			gameStateContext.setUsername(response.data.payload.username);
			routerContext.changeRoute('/profile');
			localStorage.setItem('token', response.data.token);
		} else {
			debugContext.error(response.error.message);
		}

		loading = false;
	};

	const onTokenSubmit = async (event: SubmitEvent) => {
		event.preventDefault();
		loading = true;

		const formData = new FormData(event.target as HTMLFormElement);
		const token = formData.get('token') as string;

		const response = await redeemLoginService({ token: token.trim() });

		if (response.ok) {
			gameStateContext.setUsername(response.data.payload.username);
			routerContext.changeRoute('/profile');
			localStorage.setItem('token', response.data.token);
		} else {
			debugContext.error(response.error.message);
		}

		loading = false;
	};
</script>

{#snippet renderErrors(errors?: string[] | null)}
	{#if errors}
		<div class="text-gris-500">
			{#each errors as err}
				<p class="text-gris-50 text-xs">* {err}</p>
			{/each}
		</div>
	{/if}
{/snippet}

<div data-login class="absolute flex size-full bg-cover bg-right bg-no-repeat">
	<div
		class="absolute right-0 z-20 flex h-full w-full max-w-3xl flex-col justify-center gap-10 p-12 backdrop-blur-3xl md:px-40 md:py-20"
	>
		<div class="flex w-full justify-center">
			<h1 class="font-zen-dots text-4xl text-white">Login</h1>
		</div>

		<div class="flex w-full gap-2">
			<button
				type="button"
				class={[
					'font-space-mono flex-1 rounded-sm px-4 py-2 text-sm font-bold transition-all hover:cursor-pointer',
					activeTab === 'credentials'
						? 'bg-magenta-700 text-white'
						: 'bg-gris-700 text-gris-300 hover:bg-gris-600',
				]}
				onclick={() => (activeTab = 'credentials')}
			>
				Credentials
			</button>
			<button
				type="button"
				class={[
					'font-space-mono flex-1 rounded-sm px-4 py-2 text-sm font-bold transition-all hover:cursor-pointer',
					activeTab === 'token'
						? 'bg-magenta-700 text-white'
						: 'bg-gris-700 text-gris-300 hover:bg-gris-600',
				]}
				onclick={() => (activeTab = 'token')}
			>
				Access Token
			</button>
		</div>

		{#if activeTab === 'credentials'}
			<form
				class="flex w-full flex-col gap-10"
				onsubmit={onCredentialsSubmit}
			>
				<div class="flex w-full flex-col gap-3">
					<span class="font-space-mono text-md text-white">Username:</span>
					<InputText
						disabled={loading}
						name="username"
						placeholder="Username or Email"
						onchange={(value) => (credentialsData.username = value)}
						color={credentialsErrors?.username ? 'error' : 'default'}
					/>
					{@render renderErrors(credentialsErrors?.username?.errors)}
				</div>

				<div class="flex w-full flex-col gap-3">
					<span class="font-space-mono text-md text-white">Password:</span>
					<InputText
						disabled={loading}
						name="password"
						placeholder="Min of 8 characters"
						type="password"
						color={credentialsErrors?.password ? 'error' : 'default'}
						onchange={(value) => (credentialsData.password = value)}
					/>
					{@render renderErrors(credentialsErrors?.password?.errors)}
				</div>

				<Button type="submit" disabled={loading}>Log In</Button>
			</form>
		{:else}
			<form
				class="flex w-full flex-col gap-10"
				onsubmit={onTokenSubmit}
			>
				<div class="flex w-full flex-col gap-3">
					<span class="font-space-mono text-md text-white">Access Token:</span>
					<InputText
						disabled={loading}
						name="token"
						placeholder="Paste your access token here"
						onchange={(value) => (tokenData.token = value)}
						color={tokenErrors?.token ? 'error' : 'default'}
					/>
					{@render renderErrors(tokenErrors?.token?.errors)}
				</div>

				<Button type="submit" disabled={loading}>Enter with Token</Button>
			</form>
		{/if}
	</div>
</div>

<style>
	div[data-login] {
		background-image: url('/background-login.png');
	}
</style>
