<svelte:options runes />

<script lang="ts">
	import { treeifyError } from 'zod';

	import InputText from '@/components/InputText.svelte';
	import Button from '@/components/Button.svelte';

	import emailSvgContent from '@/assets/icons/email.svg?raw';
	import passwordSvgContent from '@/assets/icons/password.svg?raw';
	import lockSvgContent from '@/assets/icons/lock.svg?raw';

	import { loginRequestSchema } from '#/schema/auth.schema';

	const data = $state({ username: '', password: '' });
	const errors = $derived.by(() => {
		const result = loginRequestSchema.safeParse(data);

		if (!result.success) {
			return treeifyError(result.error).properties;
		}

		return null;
	});
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

<form class="flex flex-col gap-2">
	<InputText
		name="username"
		placeholder="Email"
		iconSvgContent={emailSvgContent}
		onchange={(value) => (data.username = value)}
		color={errors?.username ? 'error' : 'default'}
	/>
	{@render renderErrors(errors?.username?.errors)}

	<InputText
		name="password"
		placeholder="Password"
		iconSvgContent={passwordSvgContent}
		type="password"
		color={errors?.password ? 'error' : 'default'}
		onchange={(value) => (data.password = value)}
	/>
	{@render renderErrors(errors?.password?.errors)}

	<Button color="success" iconSvgContent={lockSvgContent} label="Submit" />
</form>
