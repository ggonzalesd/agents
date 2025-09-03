<script lang="ts">
	import * as THREE from 'three';
	import { GLTFLoader } from 'three-stdlib';

	import { loadTexture, preloadGLB } from '@/utils/assets.utils';
	import Loading from '@/views/Loading.svelte';

	let retry = $state(0);

	function canvasAttach(canvas: HTMLCanvasElement) {
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

		let texture = loadTexture('/3d/gordon.png');
		const material = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			map: texture,
			transparent: true,
		});

		const loader = new GLTFLoader();
		loader.load(
			'/3d/SkinModel.glb',
			(gltf) => {
				modelSpot.add(gltf.scene);
				gltf.scene.rotation.y = Math.PI; // Rotate model to face camera
				gltf.scene.position.y = -1; // Adjust model position if needed
				gltf.scene.traverse((child) => {
					if ((child as THREE.Mesh).isMesh) {
						(child as THREE.Mesh).material = material;
					}
				});
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
		}
		animate();

		return () => {
			cancelAnimationFrame(requestId);
		};
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
			<button class="absolute bottom-0 inline-flex">ASS</button>
		</div>
	{:catch error}
		<p>Error loading model: {JSON.stringify(error)}</p>
		<button class="pointer-events-auto" onclick={() => retry++}>
			Retry Preload
		</button>
	{/await}
{/key}
