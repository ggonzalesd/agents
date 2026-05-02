import { ComponentEcs } from '#/ecs/Component.ecs';

import { ColyseusClientEcs } from '../colyseus-client.ecs';
import {
	awaitingFeedbackEvent,
	phaseCountdownEvent,
	type AwaitingFeedbackEvent,
	type PhaseCountdownEvent,
} from './experiment-hud-events.store';

export class ExperimentHudListenerEcs extends ComponentEcs {
	onStart(): void {
		const colyseusClient = this.world
			.get(ColyseusClientEcs)
			.unwrap('ColyseusClientEcs not found');

		this.callOnDelete(
			colyseusClient.alarm.subscribe(() => {
				const room = colyseusClient.connection
					.pick('room')
					.unwrap('Room not found');

				room.onMessage('experiment:phase:countdown', (data: PhaseCountdownEvent) => {
					phaseCountdownEvent.set(data);
				});

				room.onMessage('experiment:awaiting-feedback', (data: AwaitingFeedbackEvent) => {
					awaitingFeedbackEvent.set(data);
				});
			}),
		);
	}
}
