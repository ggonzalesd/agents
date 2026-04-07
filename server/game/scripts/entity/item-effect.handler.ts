import type { EntityEcs } from '#/ecs';
import type { ItemState } from '#/state/inventory.state';
import { ITEM_REGISTRY, ItemEffectType } from '#/state/item-registry';
import { CharacterBodyServerEcs } from './CharacterBodyServer.ecs';

export interface ConsumeResult {
	success: boolean;
	message: string;
}

export function applyItemEffects(
	entity: EntityEcs,
	item: ItemState,
): ConsumeResult {
	const definition = ITEM_REGISTRY[item.type];

	if (!definition) {
		return { success: false, message: `Unknown item type: ${item.type}` };
	}

	if (!definition.consumable) {
		return {
			success: false,
			message: `${item.type} is not consumable`,
		};
	}

	const characterBody = entity.get(CharacterBodyServerEcs).raw();
	if (!characterBody) {
		return { success: false, message: 'Entity has no character body' };
	}

	for (const effect of definition.effects) {
		switch (effect.type) {
			case ItemEffectType.HEAL:
				characterBody.heal(effect.value);
				break;
		}
	}

	return { success: true, message: `Consumed ${item.type}` };
}
