export interface ItemModelEntry {
	path: string;
	scale: number;
}

const ITEM_MODELS: Readonly<Record<string, ItemModelEntry>> = {
	apple: {
		path: '/3d/apple.glb',
		scale: 0.25,
	},
	green_apple: {
		path: '/3d/green-apple.glb',
		scale: 0.25,
	},
	coin: {
		path: '/3d/coin.glb',
		scale: 0.25,
	},
	cookie: {
		path: '/3d/cookies.glb',
		scale: 0.25,
	},
	meat: {
		path: '/3d/meat.glb',
		scale: 0.25,
	},
	potion: {
		path: '/3d/potion.glb',
		scale: 0.25,
	},
	seeds: {
		path: '/3d/seeds.glb',
		scale: 0.25,
	},
	sword: {
		path: '/armors/Assets/gltf/sword_1handed.gltf',
		scale: 0.7,
	},
};

export const getItemModel = (itemType: string): ItemModelEntry | null => {
	return ITEM_MODELS[itemType] ?? null;
};

export const ITEM_MODEL_CATEGORIES = ITEM_MODELS;
