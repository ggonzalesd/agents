import type { IVec3 } from '#/utils/math.util';

import type {
	AnimalPopulationKey,
	AnimalProfileProps,
	AnimalSpecies,
} from './animal-profile.ecs';

const COMMON_RESPAWN_DELAY_MS = 10_000;
const WOLF_EVENT_INTERVAL_MS = 5 * 60 * 1000;
const BULL_EVENT_INTERVAL_MS = 10 * 60 * 1000;

const RARE_EVENT_CHANCE = 0.5;
const MEAT_DROP = { itemType: 'meat', quantity: 1, chance: 1 } as const;

export interface AnimalSpawnVariant {
	display: string;
	life: number;
	maxLife: number;
	pos: IVec3;
	profile: AnimalProfileProps;
	skin: AnimalSpecies;
}

export interface AnimalPopulationCatalogEntry {
	eventChance?: number;
	eventIntervalMs?: number;
	eventMessage?: string;
	eventTitle?: string;
	maxAlive: number;
	populationKey: AnimalPopulationKey;
	respawnDelayMs?: number;
	type: 'common' | 'rare';
	variants: AnimalSpawnVariant[];
}

const deerProfile = (species: 'deer' | 'siervo'): AnimalProfileProps => ({
	populationKey: 'deer',
	species,
	attackDamage: species === 'deer' ? 10 : 8,
	canFlee: true,
	canCounterAttack: species === 'deer',
	homeRadius: species === 'deer' ? 10 : 12,
	threatRadius: species === 'deer' ? 7 : 9,
	fleeDistance: species === 'deer' ? 12 : 15,
	minIdleMs: species === 'deer' ? 1500 : 1000,
	maxIdleMs: species === 'deer' ? 4000 : 3000,
	fleeRecoverMs: species === 'deer' ? 2500 : 2000,
	panicDurationMs: species === 'deer' ? 5000 : 6000,
	counterAttackRadius: species === 'deer' ? 2.25 : 0,
	stareAfterAttackMs: species === 'deer' ? 900 : 0,
	drop: MEAT_DROP,
});

const donkeyProfile: AnimalProfileProps = {
	populationKey: 'donkey',
	species: 'donkey',
	attackDamage: 12,
	canFlee: false,
	canCounterAttack: true,
	homeRadius: 8,
	threatRadius: 0,
	fleeDistance: 0,
	minIdleMs: 2000,
	maxIdleMs: 6000,
	fleeRecoverMs: 0,
	panicDurationMs: 3000,
	counterAttackRadius: 2.5,
	stareAfterAttackMs: 600,
	drop: MEAT_DROP,
};

const wolfProfile: AnimalProfileProps = {
	populationKey: 'wolf',
	species: 'wolf',
	attackDamage: 18,
	canFlee: false,
	canCounterAttack: true,
	homeRadius: 18,
	threatRadius: 0,
	fleeDistance: 0,
	minIdleMs: 1000,
	maxIdleMs: 2500,
	fleeRecoverMs: 0,
	panicDurationMs: 2000,
	counterAttackRadius: 2.0,
	stareAfterAttackMs: 400,
	walkSpeed: 9,
	drop: MEAT_DROP,
	hunt: {
		huntRadius: 15,
		huntCooldownMs: 800,
		preySpecies: ['deer', 'siervo', 'donkey', 'bull-black', 'bull-brown'],
		huntPlayers: true,
		huntNpcs: true,
	},
};

const bullProfile = (skin: 'bull-brown' | 'bull-black'): AnimalProfileProps => {
	const isBullBlack = skin === 'bull-black';

	return {
		populationKey: 'bull',
		species: skin,
		attackDamage: isBullBlack ? 25 : 20,
		canFlee: false,
		canCounterAttack: true,
		homeRadius: isBullBlack ? 14 : 10,
		threatRadius: 0,
		fleeDistance: 0,
		minIdleMs: 2000,
		maxIdleMs: 5000,
		fleeRecoverMs: 0,
		panicDurationMs: 1000,
		counterAttackRadius: 2.75,
		stareAfterAttackMs: 500,
		walkSpeed: 7.5,
		drop: {
			itemType: 'meat',
			quantity: isBullBlack ? 2 : 1,
			chance: 1,
		},
		charge: {
			chargeRadius: isBullBlack ? 12 : 8,
			chargeRecoverMs: 3000,
		},
	};
};

export const ANIMAL_SPAWN_CATALOG: Readonly<
	Record<AnimalPopulationKey, AnimalPopulationCatalogEntry>
> = {
	bull: {
		populationKey: 'bull',
		type: 'rare',
		maxAlive: 1,
		eventIntervalMs: BULL_EVENT_INTERVAL_MS,
		eventChance: RARE_EVENT_CHANCE,
		eventTitle: 'Toro Salvaje',
		eventMessage: 'Se detectó un toro salvaje peligroso en la zona.',
		variants: [
			{
				display: 'Toro Marrón',
				life: 120,
				maxLife: 120,
				pos: { x: 0, y: 0, z: 18 },
				profile: bullProfile('bull-brown'),
				skin: 'bull-brown',
			},
			{
				display: 'Toro Marrón',
				life: 120,
				maxLife: 120,
				pos: { x: 4, y: 0, z: 20 },
				profile: bullProfile('bull-brown'),
				skin: 'bull-brown',
			},
			{
				display: 'Toro Negro',
				life: 160,
				maxLife: 160,
				pos: { x: -12, y: 0, z: -15 },
				profile: bullProfile('bull-black'),
				skin: 'bull-black',
			},
		],
	},
	deer: {
		populationKey: 'deer',
		type: 'common',
		maxAlive: 5,
		respawnDelayMs: COMMON_RESPAWN_DELAY_MS,
		variants: [
			{
				display: 'Venado',
				life: 60,
				maxLife: 60,
				pos: { x: 8, y: 0, z: 6 },
				profile: deerProfile('deer'),
				skin: 'deer',
			},
			{
				display: 'Venado',
				life: 60,
				maxLife: 60,
				pos: { x: 10, y: 0, z: 8 },
				profile: deerProfile('deer'),
				skin: 'deer',
			},
			{
				display: 'Venado',
				life: 60,
				maxLife: 60,
				pos: { x: 6, y: 0, z: 9 },
				profile: deerProfile('deer'),
				skin: 'deer',
			},
			{
				display: 'Siervo',
				life: 50,
				maxLife: 50,
				pos: { x: -8, y: 0, z: 6 },
				profile: deerProfile('siervo'),
				skin: 'siervo',
			},
			{
				display: 'Siervo',
				life: 50,
				maxLife: 50,
				pos: { x: -10, y: 0, z: 8 },
				profile: deerProfile('siervo'),
				skin: 'siervo',
			},
		],
	},
	donkey: {
		populationKey: 'donkey',
		type: 'common',
		maxAlive: 5,
		respawnDelayMs: COMMON_RESPAWN_DELAY_MS,
		variants: [
			{
				display: 'Burro',
				life: 80,
				maxLife: 80,
				pos: { x: 3, y: 0, z: -10 },
				profile: donkeyProfile,
				skin: 'donkey',
			},
			{
				display: 'Burro',
				life: 80,
				maxLife: 80,
				pos: { x: -3, y: 0, z: -12 },
				profile: donkeyProfile,
				skin: 'donkey',
			},
			{
				display: 'Burro',
				life: 80,
				maxLife: 80,
				pos: { x: 5, y: 0, z: -14 },
				profile: donkeyProfile,
				skin: 'donkey',
			},
			{
				display: 'Burro',
				life: 80,
				maxLife: 80,
				pos: { x: -5, y: 0, z: -14 },
				profile: donkeyProfile,
				skin: 'donkey',
			},
			{
				display: 'Burro',
				life: 80,
				maxLife: 80,
				pos: { x: 0, y: 0, z: -16 },
				profile: donkeyProfile,
				skin: 'donkey',
			},
		],
	},
	wolf: {
		populationKey: 'wolf',
		type: 'rare',
		maxAlive: 2,
		eventIntervalMs: WOLF_EVENT_INTERVAL_MS,
		eventChance: RARE_EVENT_CHANCE,
		eventTitle: 'Manada de Lobos',
		eventMessage: 'Se avistó una manada de lobos en la zona.',
		variants: [
			{
				display: 'Lobo',
				life: 100,
				maxLife: 100,
				pos: { x: 15, y: 0, z: 0 },
				profile: wolfProfile,
				skin: 'wolf',
			},
			{
				display: 'Lobo',
				life: 100,
				maxLife: 100,
				pos: { x: -15, y: 0, z: 3 },
				profile: wolfProfile,
				skin: 'wolf',
			},
		],
	},
};

export const COMMON_ANIMAL_POPULATIONS: ReadonlyArray<AnimalPopulationKey> = [
	'deer',
	'donkey',
];

export const RARE_ANIMAL_POPULATIONS: ReadonlyArray<AnimalPopulationKey> = [
	'wolf',
	'bull',
];
