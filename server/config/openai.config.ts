import OpenAI from 'openai';

import envConfig from './env.config';

const openaiCli = new OpenAI({
	apiKey: envConfig.OPEN_AI_KEY,
});

export default openaiCli;
