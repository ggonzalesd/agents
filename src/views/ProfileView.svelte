<svelte:options runes />

<script lang="ts">
	import { getContext, onMount } from 'svelte';

	import { GameInput } from '@/utils/input.utils';
	import { InputMode } from '@/utils/inputMode';

	import * as HOOKS from '@/hooks';

	import Button from '@/components/ui/Button.svelte';
	import SkinSelector from '@/components/profile/SkinSelector.svelte';

	import { httpService } from '@/services/http.service';
	import {
		profileService,
		getMyAcceptedMissionsService,
		getMyCreatedMissionsService,
	} from '@/services/api.service';

	let router = HOOKS.getRouterContext();
	let gameInputContext = getContext<GameInput>(GameInput.name);
	const debugContext = HOOKS.getDebugContext();

	type ProfileData = {
		username: string;
		display: string | null;
		role: string;
		createdAt: Date;
		skin: string | null;
		identifier: string;
		positionX: number;
		positionY: number;
		positionZ: number;
		life: number;
		maxLife: number;
		saturation: number;
		maxSaturation: number;
		banned: boolean;
	};

	let profile = $state<ProfileData | null>(null);
	let missionsAccepted = $state<number>(0);
	let missionsCompleted = $state<number>(0);
	let missionsCreated = $state<number>(0);
	let loading = $state(true);

	onMount(() => {
		gameInputContext.setMode(InputMode.UI);

		const timeout = setTimeout(() => {
			if (import.meta.env.VITE_AUTO_JOIN === 'true')
				router.changeRoute('/game');
		}, 1000);

		profileService()
			.then((data) => {
				if (!data.ok) return;

				profile = {
					username: data.data.user.username,
					display: data.data.user.display,
					role: data.data.user.role ?? 'USER',
					createdAt: data.data.user.createdAt,
					skin: data.data.user.skin,
					identifier: data.data.agent.identifier,
					positionX: data.data.agent.positionX,
					positionY: data.data.agent.positionY,
					positionZ: data.data.agent.positionZ,
					life: data.data.entity.life,
					maxLife: data.data.entity.maxLife,
					saturation: data.data.entity.saturation,
					maxSaturation: data.data.entity.maxSaturation,
					banned: data.data.banned,
				};
			})
			.catch(() => {})
			.finally(() => {
				loading = false;
			});

		Promise.all([
			getMyAcceptedMissionsService(),
			getMyCreatedMissionsService(),
		])
			.then(([accepted, created]) => {
				if (accepted.ok) {
					missionsAccepted = accepted.data.missions.length;
					missionsCompleted = accepted.data.missions.filter(
						(m) => m.status === 'COMPLETED',
					).length;
				}
				if (created.ok) {
					missionsCreated = created.data.missions.length;
				}
			})
			.catch(() => {});

		return () => {
			clearTimeout(timeout);
		};
	});

	function logoutHandler() {
		httpService.post('/auth/logout').then(() => {
			window.location.href = '/';
		});
	}

	function formatDate(date: Date): string {
		return date.toLocaleDateString('es-ES', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	}
</script>

{#snippet renderInfo(title: string, value: string)}
	<div class="text-gris-50 font-space-mono flex flex-col gap-2">
		<p class="text-[12px] font-bold">{title}</p>
		<p class="text-[14px]">{value}</p>
	</div>
{/snippet}

{#snippet renderStat(title: string, value: string, detail?: string)}
	<div
		class="text-gris-50 font-space-mono flex flex-col gap-2 rounded-lg px-5 py-2.5"
		class:bg-azul-900={true}
	>
		<p class="text-[14px] font-bold">{title}</p>
		<div class="flex w-full justify-between">
			<p class="text-[14px]">{value}</p>
			{#if detail}
				<p class="text-gris-200 text-[14px]">{detail}</p>
			{/if}
		</div>
	</div>
{/snippet}

<section
	class="flex h-screen w-full flex-col items-center justify-between gap-8 overflow-auto bg-[url(/background-profile.png)] bg-cover bg-center bg-no-repeat p-10"
>
	<h1 class="font-zen-dots text-center text-2xl">Account information</h1>

	{#if loading}
		<p class="font-space-mono text-white">Loading...</p>
	{:else if profile}
		<div
			class="flex h-full w-full flex-col items-center gap-8 lg:max-w-4xl xl:max-w-7xl xl:flex-row"
		>
			<div class="flex h-full flex-1 justify-center">
				<SkinSelector />
			</div>

			<div class="flex h-full w-full flex-1 flex-col justify-between gap-2">
				<div class="font-space-mono flex flex-col gap-2">
					<p class="text-center text-[16px] font-bold">Player information</p>

					<div class="flex w-full justify-between">
						{@render renderInfo('Username', profile.username)}
						{@render renderInfo('Display', profile.display ?? profile.username)}
					</div>
					<div class="flex w-full justify-between">
						{@render renderInfo('Role', profile.role)}
						{@render renderInfo('Created', formatDate(profile.createdAt))}
					</div>
					{#if profile.banned}
						<p class="font-space-mono text-center text-[14px] font-bold text-red-400">
							Account banned
						</p>
					{/if}
				</div>

				<div class="font-space-mono flex flex-col gap-2">
					<p class="text-center text-[16px] font-bold">Character stats</p>
					{@render renderStat('Life', `${profile.life} / ${profile.maxLife}`)}
					{@render renderStat('Saturation', `${profile.saturation} / ${profile.maxSaturation}`)}
					{@render renderStat(
						'Position',
						`X: ${profile.positionX.toFixed(1)} Y: ${profile.positionY.toFixed(1)} Z: ${profile.positionZ.toFixed(1)}`,
					)}
				</div>

				<div class="font-space-mono flex flex-col gap-2">
					<p class="text-center text-[16px] font-bold">Missions</p>
					{@render renderStat('Accepted', String(missionsAccepted))}
					{@render renderStat('Completed', String(missionsCompleted))}
					{@render renderStat('Created', String(missionsCreated))}
				</div>

				<div class="font-space-mono flex flex-col gap-2">
					<p class="text-center text-[16px] font-bold">Achievements</p>
					<p class="text-gris-400 text-center text-[14px]">No data</p>
				</div>

				<div class="flex w-full flex-row flex-wrap items-center justify-center gap-4">
					<Button type="button" onclick={() => router.changeRoute('/game')}>
						Go to Game
					</Button>

					<Button type="button" onclick={() => router.changeRoute('/missions')}>
						Missions
					</Button>

					<Button type="button" onclick={logoutHandler}>Logout</Button>

					{#if profile.role === 'ADMIN'}
						<Button
							type="button"
							onclick={() => router.changeRoute('/admin/npcs/list')}
						>
							Go To Admin
						</Button>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<p class="font-space-mono text-red-400">Failed to load profile</p>
	{/if}
</section>