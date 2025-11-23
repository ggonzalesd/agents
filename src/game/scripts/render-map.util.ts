import { defaultMap } from '#/maps/default.map';
import { preloadGLB } from '@/utils/assets.utils';
import * as THREE from 'three';

export const models = {
	largeRocks: {
		path: '/trees/Assets/gltf/',
		values: [
			'Rock_1_G_Color1.gltf',
			'Rock_1_H_Color1.gltf',
			'Rock_1_I_Color1.gltf',
			'Rock_1_J_Color1.gltf',
			'Rock_1_K_Color1.gltf',
			'Rock_1_L_Color1.gltf',
			'Rock_1_M_Color1.gltf',
			'Rock_1_N_Color1.gltf',
			'Rock_1_O_Color1.gltf',
			'Rock_1_P_Color1.gltf',
			'Rock_1_Q_Color1.gltf',
			'Rock_2_D_Color1.gltf',
			'Rock_2_E_Color1.gltf',
			'Rock_2_F_Color1.gltf',
			'Rock_2_G_Color1.gltf',
			'Rock_2_H_Color1.gltf',
		],
	},
	mediumRocks: {
		path: '/trees/Assets/gltf/',
		values: [
			'Rock_1_D_Color1.gltf',
			'Rock_1_E_Color1.gltf',
			'Rock_1_F_Color1.gltf',
			'Rock_2_B_Color1.gltf',
			'Rock_2_C_Color1.gltf',
			'Rock_3_E_Color1.gltf',
			'Rock_3_F_Color1.gltf',
		],
	},
	smallStones: {
		path: '/trees/Assets/gltf/',
		values: [
			'Rock_1_A_Color1.gltf',
			'Rock_1_B_Color1.gltf',
			'Rock_1_C_Color1.gltf',
			'Rock_2_A_Color1.gltf',
			'Rock_3_A_Color1.gltf',
			'Rock_3_B_Color1.gltf',
			'Rock_3_C_Color1.gltf',
			'Rock_3_D_Color1.gltf',
		],
	},
	trees: {
		path: '/trees/Assets/gltf/',
		values: [
			'Tree_2_A_Color1.gltf',
			'Tree_2_B_Color1.gltf',
			'Tree_2_C_Color1.gltf',
			'Tree_2_D_Color1.gltf',
			'Tree_2_E_Color1.gltf',
		],
	},
	bushes: {
		path: '/trees/Assets/gltf/',
		values: [
			'Bush_1_E_Color1.gltf',
			'Bush_1_F_Color1.gltf',
			'Bush_1_G_Color1.gltf',
			'Bush_4_D_Color1.gltf',
			'Bush_4_E_Color1.gltf',
			'Bush_4_F_Color1.gltf',
		],
	},
	grass: {
		path: '/trees/Assets/gltf/',
		values: [
			'Grass_1_B_Color1.gltf',
			'Grass_1_B_Singlesided_Color1.gltf',
			'Grass_1_C_Color1.gltf',
			'Grass_1_C_Singlesided_Color1.gltf',
			'Grass_1_D_Color1.gltf',
			'Grass_1_D_Singlesided_Color1.gltf',
			'Grass_2_A_Singlesided_Color1.gltf',
			'Grass_2_B_Singlesided_Color1.gltf',
			'Grass_2_C_Singlesided_Color1.gltf',
			'Grass_2_D_Singlesided_Color1.gltf',
		],
	},
	bareTrees: {
		path: '/trees/Assets/gltf/',
		values: [
			'Tree_Bare_1_A_Color1.gltf',
			'Tree_Bare_1_B_Color1.gltf',
			'Tree_Bare_1_C_Color1.gltf',
			'Tree_Bare_2_A_Color1.gltf',
			'Tree_Bare_2_B_Color1.gltf',
			'Tree_Bare_2_C_Color1.gltf',
		],
	},
};

export const renderMap = (scene: THREE.Scene) => {
	scene.add(new THREE.AxesHelper(1));

	defaultMap.grid.forEach((row, i) => {
		row.forEach((cell, j) => {
			/* ROCAS GRANDES */
			if (cell === 2) {
				const point = new THREE.Object3D();
				const scale = 2 + Math.random() * 0.5;
				const model =
					models.largeRocks.values[
						Math.floor(Math.random() * models.largeRocks.values.length)
					];
				preloadGLB(`${models.largeRocks.path}${model}`).then((glb) => {
					point.add(glb[0].scene);
					point.position.set(
						j + defaultMap.offsetX + 0.5 + (Math.random() * 0.5 - 0.25),
						0,
						i + defaultMap.offsetY + 0.5 + (Math.random() * 0.5 - 0.25),
					);
					point.scale.set(scale, scale, scale);
					point.rotation.set(0, Math.random() * 2 * Math.PI, 0);
					scene.add(point);
				});
			}

			/* ROCAS MEDIANAS */
			if (cell === 3) {
				const point = new THREE.Object3D();
				const scale = 1 + Math.random() * 0.5;
				const model =
					models.mediumRocks.values[
						Math.floor(Math.random() * models.mediumRocks.values.length)
					];
				preloadGLB(`${models.mediumRocks.path}${model}`).then((glb) => {
					point.add(glb[0].scene);
					point.position.set(
						j + defaultMap.offsetX + 0.5 + (Math.random() * 0.5 - 0.25),
						0,
						i + defaultMap.offsetY + 0.5 + (Math.random() * 0.5 - 0.25),
					);
					point.scale.set(scale, scale, scale);
					point.rotation.set(0, Math.random() * 2 * Math.PI, 0);
					scene.add(point);
				});
			}

			/* PIEDRAS PEQUEÑAS */
			if (cell === 4) {
				const point = new THREE.Object3D();
				const scale = Math.random() * 0.5 + 0.25;
				const model =
					models.smallStones.values[
						Math.floor(Math.random() * models.smallStones.values.length)
					];
				preloadGLB(`${models.smallStones.path}${model}`).then((glb) => {
					point.add(glb[0].scene);
					point.position.set(
						j + defaultMap.offsetX + 0.5 + (Math.random() * 0.5 - 0.25),
						0,
						i + defaultMap.offsetY + 0.5 + (Math.random() * 0.5 - 0.25),
					);
					point.scale.set(scale, scale, scale);
					point.rotation.set(0, Math.random() * 2 * Math.PI, 0);
					scene.add(point);
				});
			}

			/* ARBOLES */
			if (cell === 5) {
				const point = new THREE.Object3D();
				const scale = Math.random() * 1 + 2;
				const model =
					models.trees.values[
						Math.floor(Math.random() * models.trees.values.length)
					];
				console.log(model);
				preloadGLB(`${models.trees.path}${model}`).then((glb) => {
					point.add(glb[0].scene);
					point.position.set(
						j + defaultMap.offsetX + 0.5 + (Math.random() * 0.5 - 0.25),
						0,
						i + defaultMap.offsetY + 0.5 + (Math.random() * 0.5 - 0.25),
					);
					point.scale.set(scale, scale, scale);
					point.rotation.set(0, Math.random() * 2 * Math.PI, 0);
					scene.add(point);
				});
			}

			/* ARBUSTOS */
			if (cell === 6) {
				const point = new THREE.Object3D();
				const scale = Math.random() * 0.5 + 0.5;
				const model =
					models.bushes.values[
						Math.floor(Math.random() * models.bushes.values.length)
					];
				preloadGLB(`${models.bushes.path}${model}`).then((glb) => {
					point.add(glb[0].scene);
					point.position.set(
						j + defaultMap.offsetX + 0.5 + (Math.random() * 0.5 - 0.25),
						0,
						i + defaultMap.offsetY + 0.5 + (Math.random() * 0.5 - 0.25),
					);
					point.scale.set(scale, scale, scale);
					point.rotation.set(0, Math.random() * 2 * Math.PI, 0);
					scene.add(point);
				});
			}

			/* CESPED */
			if (cell === 7) {
				const point = new THREE.Object3D();
				const scale = Math.random() * 0.5 + 1;
				const model =
					models.grass.values[
						Math.floor(Math.random() * models.grass.values.length)
					];
				preloadGLB(`${models.grass.path}${model}`).then((glb) => {
					point.add(glb[0].scene);
					point.position.set(
						j + defaultMap.offsetX + 0.5 + (Math.random() * 0.5 - 0.25),
						0,
						i + defaultMap.offsetY + 0.5 + (Math.random() * 0.5 - 0.25),
					);
					point.scale.set(scale, scale, scale);
					point.rotation.set(0, Math.random() * 2 * Math.PI, 0);
					scene.add(point);
				});
			}

			/* TRONCOS */
			if (cell === 8) {
				const point = new THREE.Object3D();
				const scale = Math.random() * 1 + 2;
				const model =
					models.bareTrees.values[
						Math.floor(Math.random() * models.bareTrees.values.length)
					];
				preloadGLB(`${models.bareTrees.path}${model}`).then((glb) => {
					point.add(glb[0].scene);
					point.position.set(
						j + defaultMap.offsetX + 0.5 + (Math.random() * 0.5 - 0.25),
						0,
						i + defaultMap.offsetY + 0.5 + (Math.random() * 0.5 - 0.25),
					);
					point.scale.set(scale, scale, scale);
					point.rotation.set(0, Math.random() * 2 * Math.PI, 0);
					scene.add(point);
				});
			}

			/* MUROS 1 */
			if (cell === 9) {
				const point = new THREE.Object3D();
				const scale = 1;
				preloadGLB(`/dungeons/Assets/gltf/wall.gltf`).then((glb) => {
					point.add(glb[0].scene);
					point.position.set(
						j + defaultMap.offsetX + 0.5,
						0,
						i + defaultMap.offsetY + 0.5,
					);
					point.scale.set(scale, 1.5, scale);
					point.rotation.set(0, 0, 0);
					scene.add(point);
				});
			}

			/* PUERTA */
			if (cell === 10) {
				const point = new THREE.Object3D();
				const scale = 1;
				preloadGLB(`/dungeons/Assets/gltf/wall_doorway_open.gltf`).then(
					(glb) => {
						point.add(glb[0].scene);
						point.position.set(
							j + defaultMap.offsetX + 0.5,
							0,
							i + defaultMap.offsetY + 0.5,
						);
						point.scale.set(scale, 1.5, scale);
						point.rotation.set(0, -0.5 * Math.PI, 0);
						scene.add(point);
					},
				);
			}

			/* MUROS 2 */
			if (cell === 11) {
				const point = new THREE.Object3D();
				const scale = 1;
				preloadGLB(`/dungeons/Assets/gltf/wall.gltf`).then((glb) => {
					point.add(glb[0].scene);
					point.position.set(
						j + defaultMap.offsetX + 0.5,
						0,
						i + defaultMap.offsetY + 0.5,
					);
					point.scale.set(scale, 1.5, scale);
					point.rotation.set(0, 0.5 * Math.PI, 0);
					scene.add(point);
				});
			}

			/* PISO 1 */
			if (cell === 12) {
				const point = new THREE.Object3D();
				const scale = 1;
				preloadGLB(`/dungeons/Assets/gltf/floor_dirt_small_D.gltf`).then(
					(glb) => {
						point.add(glb[0].scene);
						point.position.set(
							j + defaultMap.offsetX + 0.5,
							0,
							i + defaultMap.offsetY + 0.5,
						);
						point.scale.set(scale, scale, scale);
						point.rotation.set(0, 0, 0);
						scene.add(point);
					},
				);
			}

			/* SILLA LARGA */
			if (cell === 14) {
				const point = new THREE.Object3D();
				const scale = 1;
				preloadGLB(`/dungeons/Assets/gltf/chair.gltf`).then((glb) => {
					point.add(glb[0].scene);
					point.position.set(
						j + defaultMap.offsetX + 0.5,
						0,
						i + defaultMap.offsetY + 0.5,
					);
					point.scale.set(scale, scale, scale);
					point.rotation.set(0, 0, 0);
					scene.add(point);
				});
			}

			/* MESA LARGA */
			if (cell === 15) {
				const point = new THREE.Object3D();
				const scale = 1;
				preloadGLB(`/dungeons/Assets/gltf/table_long.gltf`).then((glb) => {
					point.add(glb[0].scene);
					point.position.set(
						j + defaultMap.offsetX + 0.5,
						0,
						i + defaultMap.offsetY + 0.5,
					);
					point.scale.set(scale, scale, scale);
					point.rotation.set(0, 0, 0);
					scene.add(point);
				});
			}

			/* MURO CON VENTANA */
			if (cell === 16) {
				const point = new THREE.Object3D();
				const scale = 1;
				const model =
					Math.random() < 0.5
						? 'wall_window_closed.gltf'
						: 'wall_window_open.gltf';
				preloadGLB(`/dungeons/Assets/gltf/${model}`).then((glb) => {
					point.add(glb[0].scene);
					point.position.set(
						j + defaultMap.offsetX + 0.5,
						0,
						i + defaultMap.offsetY + 0.5,
					);
					point.scale.set(scale, 1.5, scale);
					point.rotation.set(0, 0, 0);
					scene.add(point);
				});
			}

			/* CAMA */
			if (cell === 17) {
				const point = new THREE.Object3D();
				const scale = 1;
				preloadGLB(`/dungeons/Assets/gltf/bed_frame.gltf`).then((glb) => {
					point.add(glb[0].scene);
					point.position.set(
						j + defaultMap.offsetX + 0.5,
						0,
						i + defaultMap.offsetY + 0.5,
					);
					point.scale.set(scale, scale, scale);
					point.rotation.set(0, 0.5 * Math.PI, 0);
					scene.add(point);
				});
			}

			/* COFRE */
			if (cell === 18) {
				const point = new THREE.Object3D();
				const scale = 1;
				preloadGLB(`/dungeons/Assets/gltf/chest.gltf`).then((glb) => {
					point.add(glb[0].scene);
					point.position.set(
						j + defaultMap.offsetX + 0.5,
						0,
						i + defaultMap.offsetY + 0.5,
					);
					point.scale.set(scale, scale, scale);
					point.rotation.set(0, 1 * Math.PI, 0);
					scene.add(point);
				});
			}
		});
	});
};
