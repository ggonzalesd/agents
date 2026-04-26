import type * as THREE from 'three';

export enum VFXSpread {
	Radial = 'radial',
	Upward = 'upward',
	Ring = 'ring',
}

export enum VFXEffectType {
	Attack = 'attack',
	Attacked = 'attacked',
	Jump = 'jump',
	Running = 'running',
	Healed = 'healed',
	Respawn = 'respawn',
	TreeHit = 'tree-hit',
}

export interface VFXEffectConfig {
	texture: string;
	count: number;
	duration: number;
	scale: [min: number, max: number];
	speed: [min: number, max: number];
	color: THREE.ColorRepresentation;
	spread: VFXSpread;
	opacity: [start: number, end: number];
}

export const VFX_POOL_LIMIT = 128;

export const VFX_EFFECTS: Record<VFXEffectType, VFXEffectConfig> = {
	[VFXEffectType.Attack]: {
		texture: '/vite.svg',
		count: 6,
		duration: 500,
		scale: [0.15, 0.3],
		speed: [2, 4],
		color: 0xff4444,
		spread: VFXSpread.Radial,
		opacity: [1, 0],
	},
	[VFXEffectType.Attacked]: {
		texture: '/vite.svg',
		count: 8,
		duration: 600,
		scale: [0.1, 0.25],
		speed: [1.5, 3],
		color: 0xff0000,
		spread: VFXSpread.Radial,
		opacity: [1, 0],
	},
	[VFXEffectType.Jump]: {
		texture: '/vite.svg',
		count: 10,
		duration: 600,
		scale: [0.2, 0.4],
		speed: [1.5, 3],
		color: 0xaaddff,
		spread: VFXSpread.Ring,
		opacity: [1, 0],
	},
	[VFXEffectType.Running]: {
		texture: '/vite.svg',
		count: 3,
		duration: 400,
		scale: [0.08, 0.15],
		speed: [0.4, 1.0],
		color: 0xffffff,
		spread: VFXSpread.Ring,
		opacity: [0.7, 0],
	},
	[VFXEffectType.Healed]: {
		texture: '/vite.svg',
		count: 8,
		duration: 800,
		scale: [0.12, 0.25],
		speed: [1, 2],
		color: 0x44ff44,
		spread: VFXSpread.Upward,
		opacity: [1, 0],
	},
	[VFXEffectType.Respawn]: {
		texture: '/vite.svg',
		count: 12,
		duration: 1200,
		scale: [0.2, 0.4],
		speed: [1.5, 3],
		color: 0xffffff,
		spread: VFXSpread.Upward,
		opacity: [1, 0],
	},
	[VFXEffectType.TreeHit]: {
		texture: '/vite.svg',
		count: 10,
		duration: 450,
		scale: [0.08, 0.18],
		speed: [1.5, 3.5],
		color: 0xb9824a,
		spread: VFXSpread.Radial,
		opacity: [0.9, 0],
	},
};
