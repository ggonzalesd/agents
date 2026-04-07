export enum ItemCategory {
	FOOD = 'FOOD',
	WEAPON = 'WEAPON',
	MATERIAL = 'MATERIAL',
	CURRENCY = 'CURRENCY',
	POTION = 'POTION',
}

export enum ItemEffectType {
	HEAL = 'HEAL',
}

export interface ItemEffect {
	type: ItemEffectType;
	value: number;
}

export interface ItemDefinition {
	category: ItemCategory;
	consumable: boolean;
	effects: ItemEffect[];
}

export const ITEM_REGISTRY: Readonly<Record<string, ItemDefinition>> = {
	cookie: {
		category: ItemCategory.FOOD,
		consumable: true,
		effects: [{ type: ItemEffectType.HEAL, value: 15 }],
	},
	potion: {
		category: ItemCategory.POTION,
		consumable: true,
		effects: [{ type: ItemEffectType.HEAL, value: 30 }],
	},
	sword: {
		category: ItemCategory.WEAPON,
		consumable: false,
		effects: [],
	},
	seeds: {
		category: ItemCategory.MATERIAL,
		consumable: false,
		effects: [],
	},
	coin: {
		category: ItemCategory.CURRENCY,
		consumable: false,
		effects: [],
	},
};
