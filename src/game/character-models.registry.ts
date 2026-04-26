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
		[CharacterAnimation.ATTACK]: 'Attack_Headbutt',
		[CharacterAnimation.CONSUME]: 'Eating',
		[CharacterAnimation.JUMP]: 'Gallop_Jump',
		[CharacterAnimation.DIE]: 'Death',
	},
};

const CHARACTER_MODEL_CONFIGS: Record<string, CharacterModelConfig> = {
	deer: DEER_MODEL_CONFIG,
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
