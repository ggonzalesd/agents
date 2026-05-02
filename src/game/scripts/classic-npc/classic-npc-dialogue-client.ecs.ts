import { ComponentEcs } from '#/ecs/Component.ecs';
import { Character3DEcs } from '../player/character3D.ecs';
import { PlayerClientBehavior } from '../player/playerClientBehavior.ecs';

const DIALOGUE_RANGE = 4;
const DIALOGUE_STACK_KEY = 'dialogue-interact';

export class ClassicNpcDialogueClientEcs extends ComponentEcs {
	private npcCharacter: Character3DEcs = null!;
	private npcEntityId: string = null!;

	onStart(): void {
		const entity = this.world.getEntity(this.parent).unwrap('No entity found for ClassicNpcDialogueClientEcs');
		this.npcCharacter = entity.get(Character3DEcs).unwrap('No Character3DEcs found on NPC');
		this.npcEntityId = this.parent!;
	}

	onLoop(_delta: number): void {
		const playerEntity = this.findLocalPlayer();
		if (!playerEntity) return;

		const playerChar = playerEntity.get(Character3DEcs).raw();
		if (!playerChar) return;

		const npcPos = this.npcCharacter.object3D.position;
		const playerPos = playerChar.object3D.position;
		const distance = npcPos.distanceTo(playerPos);

		if (distance <= DIALOGUE_RANGE) {
			this.world.stacker.stackLoss(DIALOGUE_STACK_KEY, this.npcEntityId, 1);
		}
	}

	private findLocalPlayer() {
		const players = this.world.getEntityLike({ behavior: PlayerClientBehavior });
		return players[0]?.entity ?? null;
	}
}
