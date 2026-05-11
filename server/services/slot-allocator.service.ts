export type SlotPosition = {
	x: number;
	y: number;
	z: number;
};

export interface SlotAllocation {
	position: SlotPosition;
	release: () => void;
}

export const LOBBY_POSITION: SlotPosition = { x: 0, y: 2, z: 0 };

const SLOTS_PER_ROW = 5;
const SLOT_SPACING_X = 100;
const SLOT_SPACING_Z = 100;
const SLOT_START_X = 200;
const SLOT_Y = 3;

const occupiedSlots = new Set<number>();
const userSlots = new Map<string, number>();

const indexToPosition = (index: number): SlotPosition => ({
	x: SLOT_START_X + (index % SLOTS_PER_ROW) * SLOT_SPACING_X,
	y: SLOT_Y,
	z: Math.floor(index / SLOTS_PER_ROW) * SLOT_SPACING_Z,
});

const releaseSlot = (userId: string): void => {
	const index = userSlots.get(userId);
	if (index !== undefined) {
		occupiedSlots.delete(index);
		userSlots.delete(userId);
	}
};

export const allocateSlot = (userId: string): SlotAllocation => {
	const existing = userSlots.get(userId);
	if (existing !== undefined) {
		return {
			position: indexToPosition(existing),
			release: () => releaseSlot(userId),
		};
	}

	let index = 0;
	while (occupiedSlots.has(index)) index++;

	occupiedSlots.add(index);
	userSlots.set(userId, index);

	return {
		position: indexToPosition(index),
		release: () => releaseSlot(userId),
	};
};

export const getSlotPosition = (userId: string): SlotPosition | null => {
	const index = userSlots.get(userId);
	return index !== undefined ? indexToPosition(index) : null;
};

export const getAvailableSlotCount = (): number => occupiedSlots.size;
