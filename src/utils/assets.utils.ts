import * as THREE from 'three';
import { GLTFLoader, SkeletonUtils, type GLTF } from 'three-stdlib';

const glbCache = new Map<string, GLTF>();
const textureCache = new Map<string, THREE.Texture>();

export const loadTexture = (url: string, useCache = true): THREE.Texture => {
	if (useCache && textureCache.has(url)) {
		return textureCache.get(url)!;
	}
	const loader = new THREE.TextureLoader();
	const texture = loader.load(url, (texture) => {
		texture.magFilter = THREE.NearestFilter;
		texture.minFilter = THREE.NearestFilter;
		texture.generateMipmaps = false;
		texture.colorSpace = THREE.SRGBColorSpace;
		texture.flipY = false;
		texture.needsUpdate = true;
	});
	textureCache.set(url, texture);
	return texture;
};

export const cloneMesh = <T extends string>(
	glb: GLTF,
	material: THREE.Material,
	animations: T[] = [],
) => {
	const clone = SkeletonUtils.clone(glb.scene);

	clone.traverse((child) => {
		if (child instanceof THREE.SkinnedMesh) {
			child.material = material;
		}
	});

	const mixer = new THREE.AnimationMixer(clone);
	const actions: Record<T, THREE.AnimationAction> = {} as any;

	animations.forEach((name, index) => {
		const clip = glb.animations[index]!;
		actions[name] = mixer.clipAction(clip);
	});

	return {
		mesh: clone,
		mixer,
		actions,
	};
};

export const preloadGLB = async (...urls: string[]): Promise<GLTF[]> => {
	const loader = new GLTFLoader();

	const promises = urls.map((url) => {
		return new Promise<GLTF>((resolve, reject) => {
			loader.load(
				url,
				(gltf) => {
					glbCache.set(url, gltf);
					resolve(gltf);
				},
				undefined,
				(err) => reject(err),
			);
		});
	});

	return await Promise.all(promises);
};

export const waitFor = (ms: number): Promise<void> => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};

export const loadGLB = (url: string): GLTF => {
	const glb = glbCache.get(url);

	if (!glb) {
		throw new Error(`GLB not loaded: ${url}`);
	}

	return glb;
};
