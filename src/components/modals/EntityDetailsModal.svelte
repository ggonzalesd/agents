<svelte:options runes />

<script lang="ts">
	import { getGameStateContext } from '@/hooks/useGameState.svelte';
	import { getContext } from 'svelte';
	import type { Option } from '#/utils/Option';
	import { WorldEcs } from '#/ecs/World.ecs';
	import { RecordEcs } from '#/ecs/lib/Record.ecs';
	import type { PlayerState } from '#/state/player.state';
	import type { NPCState } from '#/state/game.state';
	import * as THREE from 'three';
	import { cloneMesh, loadGLB, loadTexture } from '@/utils/assets.utils';
	import { CharacterAnimation } from '#/state/character-animation';
	import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { getMissionsByEntityIdService, acceptMissionService } from '@/services/api.service';
	import type { MissionResponse } from '#/schema/mission.schema';
	import Button from '@/components/ui/Button.svelte';

	let gameState = getGameStateContext();

	const worldOp = getContext<Option<WorldEcs>>(WorldEcs.name);
	const queryClient = useQueryClient();

	let skin = $state<string | null>(null);
	let title = $state('Entity Details');
	let entityId = $state<string | null>(null);

	let viewer = $state<{ setSkin: (s: string | null) => void } | null>(null);

	type DetailsTab = 'stats' | 'missions';
	let activeTab = $state<DetailsTab>('stats');

	const entityMissionsQuery = createQuery(() => ({
		queryKey: ['missions', 'entity', entityId],
		queryFn: () => getMissionsByEntityIdService(entityId!),
		enabled: !!entityId && activeTab === 'missions',
	}));

	const acceptMutation = createMutation(() => ({
		mutationFn: (missionId: string) => acceptMissionService(missionId),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['missions'] }),
	}));

	function skinUrl(s: string | null): string {
		if (s && s.trim().length > 0) {
			return `${import.meta.env.VITE_API_URL}/api/v1/skin/${s}.png`;
		}
		return '/3d/gordon.png';
	}

	function modelAttach(canvas: HTMLCanvasElement) {
		// Scene setup
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
		const renderer = new THREE.WebGLRenderer({
			canvas,
			alpha: true,
			antialias: true,
		});
		renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));

		// Sizing
		const parentEl = canvas.parentElement as HTMLElement | null;
		const applySize = () => {
			if (!parentEl) return;
			const width = parentEl.clientWidth;
			const height = parentEl.clientHeight;
			renderer.setSize(width, height);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
		};

		setTimeout(applySize, 0);
		const resizeObserver = new ResizeObserver(applySize);
		if (parentEl) resizeObserver.observe(parentEl);
		window.addEventListener('resize', applySize);

		// Lights
		scene.add(new THREE.AmbientLight(0xffffff, 0.7));
		const dir = new THREE.DirectionalLight(0xffffff, 1);
		dir.position.set(3, 5, 3);
		scene.add(dir);

		// Model
		const texture = loadTexture(skinUrl(skin), false);
		const material = new THREE.MeshStandardMaterial({
			map: texture,
			transparent: true,
		});
		const { mesh, mixer, actions } = cloneMesh(
			loadGLB('/3d/SkinModel2.glb'),
			material,
			[CharacterAnimation.IDLE, CharacterAnimation.WALK],
		);
		actions[CharacterAnimation.IDLE]?.play();
		const spot = new THREE.Object3D();
		spot.add(mesh);
		scene.add(spot);
		mesh.position.set(0, -1, 0);
		mesh.rotateY(Math.PI / 2);

		camera.position.z = 2.25;

		// Animation loop
		const clock = new THREE.Clock();
		let raf = 0;
		const animate = () => {
			raf = requestAnimationFrame(animate);
			spot.rotation.y += 0.01;
			const dt = clock.getDelta();
			mixer.update(dt * 0.5);
			renderer.render(scene, camera);
		};
		animate();

		viewer = {
			setSkin: (s: string | null) => {
				const tex = loadTexture(skinUrl(s), false);
				material.map = tex;
				material.needsUpdate = true;
			},
		};

		return () => {
			cancelAnimationFrame(raf);
			resizeObserver.disconnect();
			window.removeEventListener('resize', applySize);
			renderer.dispose();
			material.map?.dispose?.();
			material.dispose();
		};
	}

	$effect(() => {
		const world = worldOp?.raw();
		const selectedId = $gameState.selectedEntityId;

		skin = null;
		title = 'Entity Details';
		entityId = selectedId;
		activeTab = 'stats';

		if (!world || !selectedId) return;

		const entity = world.getEntity(selectedId).raw();
		const record = entity?.getUnsafe(RecordEcs)?.getRecord('state') as
			| PlayerState
			| NPCState
			| undefined;

		if (!record) return;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const anyRecord: any = record;
		if ('sessionId' in anyRecord) {
			title = `Player (${selectedId})`;
		} else {
			title = `NPC (${selectedId})`;
		}

		skin = record.skin ?? null;
		viewer?.setSkin(skin);
	});
</script>

<div
	class="text-gris-50 flex w-[400px] flex-col gap-4 rounded-lg bg-[url(/background-entity-information.svg)] bg-cover bg-center bg-no-repeat p-6 md:w-[550px]"
>
	<h1 class="text-center text-2xl font-bold">{title}</h1>

	<div
		class="flex min-h-[320px] flex-col items-center justify-between gap-6 md:flex-row"
	>
		<div class="flex min-h-[300px] w-full md:w-2/5">
			<canvas class="h-full w-full" {@attach modelAttach}></canvas>
		</div>

		<div class="flex w-full flex-col gap-2 md:w-3/5">
			<!-- Tabs -->
			<div class="flex gap-1 border-b border-white/20 pb-2">
				<button
					class="px-3 py-1 text-xs font-medium rounded {activeTab === 'stats' ? 'bg-blue-600' : 'text-gray-300 hover:text-white'}"
					onclick={() => activeTab = 'stats'}
				>Stats</button>
				<button
					class="px-3 py-1 text-xs font-medium rounded {activeTab === 'missions' ? 'bg-blue-600' : 'text-gray-300 hover:text-white'}"
					onclick={() => activeTab = 'missions'}
				>Misiones</button>
			</div>

			{#if activeTab === 'stats'}
				<div
					class="border-gris-50 text-gris-50 flex w-full flex-col gap-1.5 rounded-lg border p-4"
				>
					{#each [['Health (HP)', '100 / 100'], ['Hunger (Food)', '75 / 100'], ['Stade', 'Happy'], ['Nº Missions', '12'], ['Nº Achievements', '14']] as stat, index}
						<div class="flex justify-between">
							<p class="text-md font-bold">{stat[0]}</p>
							<p class="text-sm">{stat[1]}</p>
						</div>
						{#if index !== 4}
							<hr class="border-gris-50" />
						{/if}
					{/each}
				</div>
			{:else}
				<div class="flex flex-col gap-2 overflow-y-auto max-h-[280px] pr-1">
					{#if entityMissionsQuery.isLoading}
						<div class="text-gray-300 text-center py-4 text-sm">Cargando...</div>
					{:else if entityMissionsQuery.isError}
						<div class="text-red-400 text-center py-4 text-sm">Error al cargar misiones</div>
					{:else if entityMissionsQuery.isSuccess && entityMissionsQuery.data.ok}
						{#if entityMissionsQuery.data.data.missions.length === 0}
							<div class="text-gray-400 text-center py-4 text-sm">No tiene misiones disponibles</div>
						{:else}
							{#each entityMissionsQuery.data.data.missions as mission (mission.id)}
								<div class="bg-black/30 rounded p-3 border border-white/10">
									<div class="flex justify-between items-start mb-1">
										<span class="font-medium text-sm">{mission.title}</span>
										<span class="text-xs px-2 py-0.5 rounded bg-green-600">{mission.status}</span>
									</div>
									<p class="text-gray-300 text-xs mb-2">{mission.description}</p>
									{#if mission.rewardItemType}
										<div class="text-xs text-amber-400 mb-2">{mission.rewardItemType} x{mission.rewardItemQty ?? 1}</div>
									{/if}
									<Button
										type="button"
										class="h-7 px-2 text-xs"
										onclick={() => acceptMutation.mutate(mission.id)}
										disabled={acceptMutation.isPending}
									>
										Aceptar misión
									</Button>
								</div>
							{/each}
						{/if}
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
