import type * as THREE from 'three';

export interface BossParticleSpeedConfig {
	horizontal: [min: number, max: number];
	vertical: [min: number, max: number];
	deceleration: number;
}

export interface BossParticleConfig {
	texture: string;
	poolSize: number;
	emitRate: number;
	particlesPerEmit: number;
	duration: [min: number, max: number];
	scale: [min: number, max: number];
	scaleDecay: number;
	color: THREE.ColorRepresentation;
	opacity: [start: number, end: number];
	speed: BossParticleSpeedConfig;
	offset: { x: number; y: number; z: number };
}

export const BOSS_BULL_BROWN_CONFIG: BossParticleConfig = {
	texture: '/3d/textures/particles/fire.svg',
	poolSize: 48,
	emitRate: 100,
	particlesPerEmit: 2,
	duration: [700, 1200],
	scale: [0.18, 0.32],
	scaleDecay: 0.4,
	color: 0xff6600,
	opacity: [0.85, 0],
	speed: {
		horizontal: [2.5, 5.0],
		vertical: [1.5, 2.5],
		deceleration: 2.5,
	},
	offset: { x: 0, y: 1.2, z: 0 },
};

export const BOSS_BULL_BLACK_CONFIG: BossParticleConfig = {
	texture: '/3d/textures/particles/sparkles.svg',
	poolSize: 64,
	emitRate: 70,
	particlesPerEmit: 3,
	duration: [900, 1600],
	scale: [0.2, 0.38],
	scaleDecay: 0.35,
	color: 0xff1100,
	opacity: [0.95, 0],
	speed: {
		horizontal: [3.0, 6.5],
		vertical: [1.8, 3.2],
		deceleration: 2.0,
	},
	offset: { x: 0, y: 1.5, z: 0 },
};

export const BOSS_WOLF_CONFIG: BossParticleConfig = {
	texture: '/3d/textures/particles/sparkles.svg',
	poolSize: 48,
	emitRate: 90,
	particlesPerEmit: 2,
	duration: [600, 1100],
	scale: [0.14, 0.28],
	scaleDecay: 0.45,
	color: 0x8800ff,
	opacity: [0.9, 0],
	speed: {
		horizontal: [2.0, 4.5],
		vertical: [1.2, 2.2],
		deceleration: 3.0,
	},
	offset: { x: 0, y: 1.0, z: 0 },
};

const BOSS_SKIN_CONFIGS: Readonly<Record<string, BossParticleConfig>> = {
	'bull-brown': BOSS_BULL_BROWN_CONFIG,
	'bull-black': BOSS_BULL_BLACK_CONFIG,
	wolf: BOSS_WOLF_CONFIG,
};

export const getBossParticleConfig = (skin: string): BossParticleConfig | null => {
	return BOSS_SKIN_CONFIGS[skin] ?? null;
};
