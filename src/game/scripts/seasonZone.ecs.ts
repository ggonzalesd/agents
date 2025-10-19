import { loadTexture } from '@/utils/assets.utils';
import * as THREE from 'three';

export enum Season {
	SPRING = 'spring',
	SUMMER = 'summer',
	AUTUMN = 'autumn',
	WINTER = 'winter',
}

interface SeasonZoneConfig {
	season: Season;
	position: THREE.Vector3;
	size: number;
	scene: THREE.Scene;
}

export class SeasonZoneEcs {
	public mesh: THREE.Mesh;
	public season: Season;
	private size: number;
	private scene: THREE.Scene;

	constructor(config: SeasonZoneConfig) {
		this.season = config.season;
		this.size = config.size;
		this.scene = config.scene;

		// Crear geometría del plano
		const geometry = new THREE.PlaneGeometry(this.size, this.size);

		// Crear material según la estación
		const material = this.createSeasonMaterial(config.season);

		// Crear mesh
		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.receiveShadow = true;
		this.mesh.rotation.x = -Math.PI / 2; // Rotar para que esté horizontal
		this.mesh.position.copy(config.position);

		// Agregar userData para identificación
		this.mesh.userData = {
			season: config.season,
			isSeasonZone: true,
		};

		// Agregar a la escena inmediatamente
		this.scene.add(this.mesh);
	}

	private createSeasonMaterial(season: Season): THREE.MeshStandardMaterial {
		// Definir las rutas de las texturas para cada estación
		const texturePaths: Record<Season, string> = {
			[Season.SPRING]: '/3d/textures/seasons/spring_ground.jpg',
			[Season.SUMMER]: '/3d/textures/seasons/summer_ground.jpg',
			[Season.AUTUMN]: '/3d/textures/seasons/autumn_ground.jpg',
			[Season.WINTER]: '/3d/textures/seasons/winter_ground.jpg',
		};

		// Cargar la textura usando TextureLoader
		const texture = loadTexture(texturePaths[season]);

		// Configurar la textura para que se repita
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.repeat.set(4, 4); // Repetir 4 veces en cada dirección

		// Configuraciones específicas por estación
		const materialConfigs: Record<
			Season,
			THREE.MeshStandardMaterialParameters
		> = {
			[Season.SPRING]: {
				map: texture,
				roughness: 0.8,
				metalness: 0.2,
			},
			[Season.SUMMER]: {
				map: texture,
				roughness: 0.7,
				metalness: 0.1,
			},
			[Season.AUTUMN]: {
				map: texture,
				roughness: 0.9,
				metalness: 0.1,
			},
			[Season.WINTER]: {
				map: texture,
				roughness: 0.8,
				metalness: 0,
			},
		};

		return new THREE.MeshStandardMaterial(materialConfigs[season]);
	}

	public dispose(): void {
		this.scene.remove(this.mesh);
		this.mesh.geometry.dispose();

		if (Array.isArray(this.mesh.material)) {
			this.mesh.material.forEach((mat) => {
				if (mat instanceof THREE.MeshStandardMaterial && mat.map) {
					mat.map.dispose();
				}
				mat.dispose();
			});
		} else {
			if (
				this.mesh.material instanceof THREE.MeshStandardMaterial &&
				this.mesh.material.map
			) {
				this.mesh.material.map.dispose();
			}
			this.mesh.material.dispose();
		}
	}
}
