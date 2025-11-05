export interface LongTermMemoryDB {
	id: string;
	npcId: string;
	identifier: string;
	text: string;
	metadata: { [key: string]: any };
	embedding: number[];
	createdAt: Date;
}
