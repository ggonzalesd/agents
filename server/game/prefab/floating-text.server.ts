import { EntityEcs } from '#/ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import type { WorldEcs } from '#/ecs/World.ecs';
import type { IVec3 } from '#/utils/math.util';
import { FloatingTextServerEcs } from '../scripts/floating-text/floating-text.server.ecs';

interface FloatingTextServerFactoryProps {
	world: WorldEcs;
	name: string;
	pos: IVec3;
	text: string;
	foreground?: string;
	background?: string;
	fontSize?: number;
}

/**
 * Crea una entidad de texto flotante estático en el mundo.
 * No tiene física ni colisionador — no es perceptible por los NPCs.
 * Para modificar el texto en runtime usa floatingTextEcs.setText().
 */
export const floatingTextServerFactory = ({
	world,
	name,
	pos,
	text,
	foreground,
	background,
	fontSize,
}: FloatingTextServerFactoryProps) =>
	new EntityEcs({
		name,
		world,
		components: {
			[RecordEcs.name]: new RecordEcs({
				stats: {
					id: name,
					name,
					type: 'floating_text',
					description: 'Texto flotante en el mundo.',
				},
			}),
			[FloatingTextServerEcs.name]: new FloatingTextServerEcs(pos, {
				text,
				foreground,
				background,
				fontSize,
			}),
		},
	});
