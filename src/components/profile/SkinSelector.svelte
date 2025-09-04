<script lang="ts">
	import * as THREE from 'three';
	import { GLTFLoader } from 'three-stdlib';

	import { loadTexture, preloadGLB } from '@/utils/assets.utils';
	import Loading from '@/views/Loading.svelte';
	import { getRouterContext } from '@/hooks/useRouter.svelte';
	import { get } from 'svelte/store';
	import { uploadSkinService } from '@/services/api.service';

	let router = getRouterContext();

	let retry = $state(0);

	function canvasAttach(canvas: HTMLCanvasElement) {
		const username = get(router).data as string;

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(75, 450 / 450, 0.1, 1000);
		const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
		renderer.setSize(450, 450);

		const light = new THREE.DirectionalLight(0xffffff, 1);
		light.position.set(5, 5, 5).normalize();
		scene.add(light);

		const ambientLight = new THREE.AmbientLight(0x707070, 1); // soft white light
		scene.add(ambientLight);

		const modelSpot = new THREE.Object3D();
		scene.add(modelSpot);

		let texture = loadTexture(
			import.meta.env.VITE_API_URL +
				'/api/v1/skin/' +
				username +
				'.png?_=' +
				Date.now(),
		);
		const material = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			map: texture,
			transparent: true,
		});

		let mixer: THREE.AnimationMixer | null = null;

		const loader = new GLTFLoader();
		loader.load(
			'/3d/SkinModel.glb',
			(gltf) => {
				modelSpot.add(gltf.scene);
				gltf.scene.rotation.y = (3 * Math.PI) / 2; // Rotate model to face camera
				gltf.scene.position.y = -1; // Adjust model position if needed
				gltf.scene.traverse((child) => {
					if ((child as THREE.Mesh).isMesh) {
						(child as THREE.Mesh).material = material;
					}
				});

				if (gltf.animations && gltf.animations.length) {
					mixer = new THREE.AnimationMixer(gltf.scene);
					const action = mixer.clipAction(gltf.animations[1]);
					action.play();
				}
			},
			undefined,
			(error) => {
				console.error('An error happened while loading the model:', error);
			},
		);

		camera.position.z = 2;

		let requestId = 0;
		function animate() {
			requestId = requestAnimationFrame(animate);
			renderer.render(scene, camera);

			modelSpot.rotation.y += 0.01; // Rotate model for some animation

			if (mixer) {
				mixer.update(0.01);
			}
		}
		animate();

		return () => {
			cancelAnimationFrame(requestId);
			texture.dispose();
		};
	}

	async function handleOnChange(event: Event) {
		const input = event.target as HTMLInputElement;

		if (!(input && input.files)) {
			return;
		}
		const file = input.files[0];

		const response = await uploadSkinService(file);

		if (response.ok) {
			console.log('Skin uploaded successfully');
			window.location.reload();
			return;
		} else {
			console.error('Error uploading skin:', response.message);
			return;
		}
	}
</script>

{#key retry}
	{#await preloadGLB('/3d/SkinModel.glb')}
		<Loading />
	{:then models}
		<div class="relative flex justify-center">
			<canvas
				class="drop-shadow-2xl drop-shadow-rose-700/25"
				{@attach canvasAttach}
			>
			</canvas>
			<label
				class="pointer-events-auto absolute bottom-0 inline-flex rounded-md bg-white/25 px-4 py-2 hover:cursor-pointer"
			>
				<span>Select Skin</span>
				<input onchange={handleOnChange} type="file" class="sr-only" />
			</label>
		</div>
	{:catch error}
		<div class="flex flex-col items-center gap-4">
			<p>Error loading model: {JSON.stringify(error)}</p>
			<button
				class="pointer-events-auto cursor-pointer rounded-md bg-rose-500 px-4 py-2 text-white hover:bg-rose-600"
				onclick={() => retry++}
			>
				Retry Preload
			</button>
		</div>
	{/await}
{/key}
