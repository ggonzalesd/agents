export interface InventoryItemDB {
	id: string;
	entityId: string;
	slot: string;
	type: string;
	quantity: number;
	metadata: Record<string, string>;
}
