export interface AgentDB {
	id: string;
	identifier: string;
	display: string;
	positionX: number;
	positionY: number;
	positionZ: number;
	rotation: number;
	metadata: { [key: string]: any };
	createdAt: Date;
}
