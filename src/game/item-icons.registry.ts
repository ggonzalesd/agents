import coinSvgSrc from '@/assets/items/coin.svg';
import cookieSvgSrc from '@/assets/items/cookie.svg';
import potionSvgSrc from '@/assets/items/potion.svg';
import seedsSvgSrc from '@/assets/items/seeds.svg';
import swordSvgSrc from '@/assets/items/sword.svg';

const PUBLIC_ITEM_TEXTURES_PATH = '/3d/textures/items';

export const ITEM_ICONS: Readonly<Record<string, string>> = {
	apple: `${PUBLIC_ITEM_TEXTURES_PATH}/apple.svg`,
	coin: coinSvgSrc,
	cookie: cookieSvgSrc,
	meat: `${PUBLIC_ITEM_TEXTURES_PATH}/meat.svg`,
	potion: potionSvgSrc,
	seeds: seedsSvgSrc,
	sword: swordSvgSrc,
};

export const getItemIcon = (itemType: string): string | null => {
	return ITEM_ICONS[itemType] ?? null;
};
