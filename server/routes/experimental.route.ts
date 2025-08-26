import { jsonResponse } from '#/utils/HttpResponse';
import { ManualLLMService } from '$/services/llms/manual.llm';
import { Router } from 'express';

const router = Router();

const manualService = ManualLLMService.getInstance();

router.get('/manual-request-llm', (_, res) => {
	const requests = manualService.getManualRequests();

	res.json(
		jsonResponse.ok(requests, { message: 'Manual LLM requests fetched' }),
	);
});

router.post('/manual-request-llm/:id', (req, res) => {
	const { id } = req.params;
	const { response } = req.body;

	manualService.resolveManualRequest(id, response);

	res.json(jsonResponse.ok(null, { message: 'Manual LLM request resolved' }));
});

export default router;
