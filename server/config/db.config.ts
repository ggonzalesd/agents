import postgres from 'postgres';

import envConfig from './env.config';

const sql = postgres(envConfig.DB_URL);

export default sql;
