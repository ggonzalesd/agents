import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

globalThis.self = globalThis;
globalThis.window = globalThis;
globalThis.document = { createElementNS: () => ({}) };
globalThis.URL = globalThis.URL || class {};
globalThis.Blob = globalThis.Blob || class {};

const filePath = process.argv[2];
if (!filePath) {
	console.error('Uso: node analyze-skin-model.mjs <ruta.glb>');
	process.exit(1);
}

const buffer = readFileSync(filePath);
const arrayBuffer = buffer.buffer.slice(
	buffer.byteOffset,
	buffer.byteOffset + buffer.byteLength,
);

const loader = new GLTFLoader();

loader.parse(
	arrayBuffer,
	'',
	(gltf) => {
		console.log('============================================');
		console.log('  ANÁLISIS GLB:', filePath);
		console.log('============================================\n');

		console.log('🎬 ANIMACIONES (' + gltf.animations.length + '):');
		for (const clip of gltf.animations) {
			console.log(
				`  - "${clip.name}"  duración=${clip.duration.toFixed(3)}s  tracks=${clip.tracks.length}`,
			);
		}
		console.log('');

		console.log('🌳 JERARQUÍA DE NODOS:');
		const printNode = (obj, depth) => {
			const pad = '  '.repeat(depth);
			const tag = obj.isBone
				? '[BONE]'
				: obj.isSkinnedMesh
					? '[SKINNED]'
					: obj.isMesh
						? '[MESH]'
						: '[' + obj.type + ']';
			console.log(`${pad}${tag} ${obj.name || '(sin nombre)'}`);
			for (const child of obj.children) printNode(child, depth + 1);
		};
		for (const scene of gltf.scenes) {
			console.log('Scene: ' + (scene.name || '(sin nombre)'));
			for (const child of scene.children) printNode(child, 1);
		}
		console.log('');

		console.log('🦴 SKELETONS / BONES:');
		gltf.scene.traverse((obj) => {
			if (obj.isSkinnedMesh && obj.skeleton) {
				console.log(`  SkinnedMesh: ${obj.name}`);
				console.log(`    bones: ${obj.skeleton.bones.length}`);
				for (const bone of obj.skeleton.bones) {
					console.log(`      - ${bone.name}`);
				}
			}
		});
		console.log('');

		console.log('🎨 MATERIALES:');
		const seen = new Set();
		gltf.scene.traverse((obj) => {
			if (obj.isMesh && obj.material) {
				const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
				for (const m of mats) {
					if (seen.has(m.uuid)) continue;
					seen.add(m.uuid);
					console.log(`  - ${m.name || '(sin nombre)'} (${m.type})`);
				}
			}
		});
	},
	(err) => {
		console.error('Error parseando GLB:', err);
		process.exit(1);
	},
);
