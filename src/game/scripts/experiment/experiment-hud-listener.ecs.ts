import { ComponentEcs } from '#/ecs/Component.ecs';

import { ColyseusClientEcs } from '../colyseus-client.ecs';
import {
	awaitingFeedbackEvent,
	phaseCountdownEvent,
	phaseMessageEvent,
	type AwaitingFeedbackEvent,
	type PhaseCountdownEvent,
	type PhaseMessageEvent,
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

				room.onMessage('experiment:phase:message', (data: PhaseMessageEvent) => {
					phaseMessageEvent.set(data);
				});
			}),
		);
	}
}
