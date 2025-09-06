<svelte:options runes />

<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { treeifyError } from 'zod';

	import { loginRequestSchema } from '#/schema/auth.schema';

	import InputText from '@/components/InputText.svelte';
	import Button from '@/components/ui/Button.svelte';

	import emailSvgContent from '@/assets/icons/email.svg?raw';
	import passwordSvgContent from '@/assets/icons/password.svg?raw';
	import lockSvgContent from '@/assets/icons/lock.svg?raw';

	import { GameInput } from '@/utils/input.utils';
	import { loginService, profileService } from '@/services/api.service';
	import { getRouterContext } from '@/hooks/useRouter.svelte';
	import { getGameStateContext } from '@/hooks/useGameState.svelte';

	const data = $state({ username: '', password: '' });
	const errors = $derived.by(() => {
		const result = loginRequestSchema.safeParse(data);

		if (!result.success) {
			return treeifyError(result.error).properties;
		}

		return null;
	});

	let gameStateContext = getGameStateContext();
	let gameInputContext = getContext<GameInput>(GameInput.name);
	let routerContext = getRouterContext();

	onMount(() => {
		gameInputContext.disabled = true;

		if (localStorage.getItem('token') == null) return;

		profileService().then((data) => {
			if (!data.ok) return;

			gameStateContext.setUsername(data.data.username);
			routerContext.changeRoute('/profile');
		});
	});

	let errorMessage = $state<string | null>(null);
	let loading = $state(false);
	const onSubmit = async (event: SubmitEvent) => {
		event.preventDefault();
		loading = true;
		errorMessage = null;

		const formData = new FormData(event.target as HTMLFormElement);
		const username = formData.get('username') as string;
		const password = formData.get('password') as string;

		const response = await loginService({ username, password });

		if (response.ok) {
			gameStateContext.setUsername(response.data.payload.username);
			routerContext.changeRoute('/profile');
			localStorage.setItem('token', response.data.token);
		} else {
			errorMessage = response.error.message;
		}

		loading = false;
	};
</script>

{#snippet renderErrors(errors?: string[] | null)}
	{#if errors}
		<div class="text-red-500">
			{#each errors as err}
				<p class="text-xs text-red-500">* {err}</p>
			{/each}
		</div>
	{/if}
{/snippet}

<div data-login class="absolute flex size-full bg-cover bg-right bg-no-repeat">
	<form
		class="absolute right-0 z-20 flex h-full w-full max-w-xl flex-col justify-center gap-2 p-12 backdrop-blur-3xl md:p-24"
		onsubmit={onSubmit}
	>
		<InputText
			disabled={loading}
			name="username"
			placeholder="Email"
			iconSvgContent={emailSvgContent}
			onchange={(value) => (data.username = value)}
			color={errors?.username ? 'error' : 'default'}
		/>
		{@render renderErrors(errors?.username?.errors)}

		<InputText
			disabled={loading}
			name="password"
			placeholder="Password"
			iconSvgContent={passwordSvgContent}
			type="password"
			color={errors?.password ? 'error' : 'default'}
			onchange={(value) => (data.password = value)}
		/>
		{@render renderErrors(errors?.password?.errors)}

		<Button type="submit" disabled={loading} svgContent={lockSvgContent}>
			Submit
		</Button>

		{#if errorMessage}
			<div class="text-red-500">
				<p class="text-xs text-red-500">* {errorMessage}</p>
			</div>
		{/if}
	</form>
</div>

<style>
	div[data-login] {
		background-image: url('/background-login.png');
	}
</style>
