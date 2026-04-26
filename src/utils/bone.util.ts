import * as THREE from 'three';

import type { CharacterBone } from '#/state/character-animation';

export const findBone = (
	root: THREE.Object3D,
	name: CharacterBone | string,
): THREE.Bone | null => {
	let found: THREE.Bone | null = null;
	root.traverse((child) => {
		if (found) return;
		if (child instanceof THREE.Bone && child.name === name) {
			found = child;
		}
	});
	return found;
};

export const attachToBone = (
	root: THREE.Object3D,
	boneName: CharacterBone | string,
	item: THREE.Object3D,
): THREE.Bone | null => {
	const bone = findBone(root, boneName);
	if (!bone) {
		console.warn(`[attachToBone] Bone "${boneName}" no encontrado.`);
		return null;
	}
	bone.add(item);
	return bone;
};

export const detachFromParent = (item: THREE.Object3D): void => {
	item.parent?.remove(item);
};
