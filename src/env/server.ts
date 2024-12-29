import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

require('dotenv').config();

export const env = createEnv({
	server: {
		TOKEN: z.string(),
		LOGS_CHANNEL: z.string()
	},
	runtimeEnv: process.env
});
