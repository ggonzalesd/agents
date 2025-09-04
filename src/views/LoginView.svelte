<svelte:options runes />

<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { treeifyError } from 'zod';

	import { loginRequestSchema } from '#/schema/auth.schema';

	import InputText from '@/components/InputText.svelte';
	import Button from '@/components/Button.svelte';

	import emailSvgContent from '@/assets/icons/email.svg?raw';
	import passwordSvgContent from '@/assets/icons/password.svg?raw';
	import lockSvgContent from '@/assets/icons/lock.svg?raw';

	import { GameInput } from '@/utils/input.utils';
	import { loginService, profileService } from '@/services/api.service';
	import { getRouterContext } from '@/hooks/useRouter.svelte';

	const data = $state({ username: '', password: '' });
	const errors = $derived.by(() => {
		const result = loginRequestSchema.safeParse(data);

		if (!result.success) {
			return treeifyError(result.error).properties;
		}

		return null;
	});

	let gameInputContext = getContext<GameInput>(GameInput.name);
	let routerContext = getRouterContext();

	onMount(() => {
		gameInputContext.disabled = true;
		profileService().then((data) => {
			routerContext.changeRoute('/profile', data.username);
		});
	});

	let loading = $state(false);
	const onSubmit = (event: SubmitEvent) => {
		loading = true;

		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const username = formData.get('username') as string;
		const password = formData.get('password') as string;

		loginService(username, password)
			.then((data) => {
				routerContext.changeRoute('/profile', data.payload.username);
				localStorage.setItem('token', data.token);
			})
			.finally(() => {
				loading = false;
			});
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

<form class="flex flex-col gap-2" onsubmit={onSubmit}>
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

	<Button
		disabled={loading}
		type="submit"
		color="success"
		iconSvgContent={lockSvgContent}
		label="Submit"
	/>
</form>
