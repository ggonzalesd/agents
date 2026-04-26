import { CharacterAnimation } from '#/state/character-animation';

export interface CharacterModelConfig {
	path: string;
	scale: number;
	rotationY: number;
	positionY: number;
	useSkinTexture: boolean;
	animations: Partial<Record<CharacterAnimation, string>>;
}

const HUMAN_MODEL_CONFIG: CharacterModelConfig = {
	path: '/3d/SkinModel2.glb',
	scale: 1,
	rotationY: Math.PI / 2,
	positionY: -1,
	useSkinTexture: true,
	animations: {},
};

const DEER_MODEL_CONFIG: CharacterModelConfig = {
	path: '/3d/deer.glb',
	scale: 0.425,
	rotationY: Math.PI / 2,
	positionY: -0.3,
	useSkinTexture: false,
	animations: {
		[CharacterAnimation.IDLE]: 'Idle',
		[CharacterAnimation.WALK]: 'Walk',
		[CharacterAnimation.RUN]: 'Gallop',
		[CharacterAnimation.ATTACK]: 'Attack_Headbutt',
		[CharacterAnimation.CONSUME]: 'Eating',
		[CharacterAnimation.JUMP]: 'Gallop_Jump',
		[CharacterAnimation.DIE]: 'Death',
	},
};

const SIERVO_MODEL_CONFIG: CharacterModelConfig = {
	path: '/3d/siervo.glb',
	scale: 0.425,
	rotationY: Math.PI / 2,
	positionY: -0.3,
	useSkinTexture: false,
	animations: {
		[CharacterAnimation.IDLE]: 'Idle',
		[CharacterAnimation.WALK]: 'Walk',
		[CharacterAnimation.RUN]: 'Gallop',
		[CharacterAnimation.ATTACK]: 'Attack_Headbutt',
		[CharacterAnimation.CONSUME]: 'Eating',
		[CharacterAnimation.JUMP]: 'Gallop_Jump',
		[CharacterAnimation.DIE]: 'Death',
	},
};

const DONKEY_MODEL_CONFIG: CharacterModelConfig = {
	path: '/3d/burro.glb',
	scale: 0.425,
	rotationY: Math.PI / 2,
	positionY: -0.3,
	useSkinTexture: false,
	animations: {
		[CharacterAnimation.IDLE]: 'Idle',
		[CharacterAnimation.WALK]: 'Walk',
		[CharacterAnimation.RUN]: 'Gallop',
		[CharacterAnimation.ATTACK]: 'Attack_Kick',
		[CharacterAnimation.CONSUME]: 'Eating',
		[CharacterAnimation.JUMP]: 'Gallop_Jump',
		[CharacterAnimation.DIE]: 'Death',
	},
};

const WOLF_MODEL_CONFIG: CharacterModelConfig = {
	path: '/3d/lobo.glb',
	scale: 0.425,
	rotationY: Math.PI / 2,
	positionY: -0.3,
	useSkinTexture: false,
	animations: {
		[CharacterAnimation.IDLE]: 'Idle',
		[CharacterAnimation.WALK]: 'Walk',
		[CharacterAnimation.RUN]: 'Gallop',
		[CharacterAnimation.ATTACK]: 'Attack',
		[CharacterAnimation.CONSUME]: 'Eating',
		[CharacterAnimation.JUMP]: 'Gallop_Jump',
		[CharacterAnimation.DIE]: 'Death',
	},
};

const BULL_BROWN_MODEL_CONFIG: CharacterModelConfig = {
	path: '/3d/toro-marron.glb',
	scale: 0.5,
	rotationY: Math.PI / 2,
	positionY: -0.3,
	useSkinTexture: false,
	animations: {
		[CharacterAnimation.IDLE]: 'Idle',
		[CharacterAnimation.WALK]: 'Walk',
		[CharacterAnimation.RUN]: 'Gallop',
		[CharacterAnimation.ATTACK]: 'Attack_Headbutt',
		[CharacterAnimation.CONSUME]: 'Eating',
		[CharacterAnimation.JUMP]: 'Gallop_Jump',
		[CharacterAnimation.DIE]: 'Death',
	},
};

const BULL_BLACK_MODEL_CONFIG: CharacterModelConfig = {
	path: '/3d/toro-negro.glb',
	scale: 0.5,
	rotationY: Math.PI / 2,
	positionY: -0.3,
	useSkinTexture: false,
	animations: {
		[CharacterAnimation.IDLE]: 'Idle',
		[CharacterAnimation.WALK]: 'Walk',
		[CharacterAnimation.RUN]: 'Gallop',
		[CharacterAnimation.ATTACK]: 'Attack_Headbutt',
		[CharacterAnimation.CONSUME]: 'Eating',
		[CharacterAnimation.JUMP]: 'Gallop_Jump',
		[CharacterAnimation.DIE]: 'Death',
	},
};

const CHARACTER_MODEL_CONFIGS: Record<string, CharacterModelConfig> = {
	deer: DEER_MODEL_CONFIG,
	siervo: SIERVO_MODEL_CONFIG,
	donkey: DONKEY_MODEL_CONFIG,
	wolf: WOLF_MODEL_CONFIG,
	'bull-brown': BULL_BROWN_MODEL_CONFIG,
	'bull-black': BULL_BLACK_MODEL_CONFIG,
	user: HUMAN_MODEL_CONFIG,
};

export const getCharacterModelConfig = (skin: string): CharacterModelConfig => {
	return CHARACTER_MODEL_CONFIGS[skin] ?? HUMAN_MODEL_CONFIG;
};

export const getCharacterAnimationClipName = (
	skin: string,
	animation: CharacterAnimation,
): string => {
	const config = getCharacterModelConfig(skin);

	return config.animations[animation] ?? animation;
};
