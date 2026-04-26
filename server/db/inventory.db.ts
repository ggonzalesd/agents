import prisma from '$/config/prisma.config';
import type { PrismaTransactionClient } from '$/config/prisma.config';
import type { InventoryItemDB } from '$/models/InventoryItem.model';

export const getItemsByEntityId = async (
	{ entityId }: { entityId: string },
	tx?: PrismaTransactionClient,
): Promise<InventoryItemDB[]> => {
	const db = tx ?? prisma;
	const items = await db.inventoryItem.findMany({
		where: { entityId },
	});
	return items as InventoryItemDB[];
};

export const saveInventory = async (
	{
		entityId,
		items,
	}: {
		entityId: string;
		items: Pick<InventoryItemDB, 'slot' | 'type' | 'quantity' | 'metadata'>[];
	},
	tx?: PrismaTransactionClient,
): Promise<void> => {
	const db = tx ?? prisma;

	await db.inventoryItem.deleteMany({ where: { entityId } });

	if (items.length === 0) return;

	await db.inventoryItem.createMany({
		data: items.map((item) => ({
			entityId,
			slot: item.slot,
			type: item.type,
			quantity: item.quantity,
			metadata: item.metadata,
		})),
	});
};
