export interface ItemModelEntry {
	path: string;
	scale: number;
}

interface ItemModelCategory {
	path: string;
	scale: number;
	items: Readonly<Record<string, string>>;
}

const CATEGORIES: Readonly<Record<string, ItemModelCategory>> = {
	default: {
		path: '/3d/',
		scale: 0.25,
		items: {
			potion: 'potion.glb',
			seeds: 'seeds.glb',
			coin: 'coin.glb',
			cookies: 'cookies.glb',
		},
	},
	vegetables: {
		path: '/vegetables/Assets/gltf/',
		scale: 0.75,
		items: {
			lettuce: 'food_ingredient_lettuce.gltf',
			carrot: 'food_ingredient_carrot.gltf',
			tomato: 'food_ingredient_tomato.gltf',
			cheese: 'food_ingredient_cheese.gltf',
			onion: 'food_ingredient_onion.gltf',
			ham: 'food_ingredient_ham.gltf',
			steak: 'food_ingredient_steak.gltf',
			potato: 'food_ingredient_potato.gltf',
		},
	},
	armors: {
		path: '/armors/Assets/gltf/',
		scale: 0.5,
		items: {
			sword: 'sword_1handed.gltf',
			potion: 'sword_2handed.gltf',
			cookie: 'shield_square.gltf',
			seeds: 'axe_1handed.gltf',
			coin: 'axe_2handed.gltf',
		},
	},
} as const;

export const getItemModel = (itemType: string): ItemModelEntry | null => {
	for (const category of Object.values(CATEGORIES)) {
		if (itemType in category.items) {
			return {
				path: `${category.path}${category.items[itemType]}`,
				scale: category.scale,
			};
		}
	}
	return null;
};

export const ITEM_MODEL_CATEGORIES = CATEGORIES;
