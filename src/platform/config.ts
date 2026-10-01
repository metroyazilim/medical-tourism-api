import { Injectable } from '@nestjs/common';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['local', 'test', 'staging', 'production']).default('local'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  HOST: z.string().default('127.0.0.1'),
  APP_VERSION: z.string().default('0.1.0'),
  DATABASE_URL: z.string().optional(),
});

export type AppConfig = z.infer<typeof schema>;

@Injectable()
export class AppConfigService {
  readonly value: AppConfig;
  constructor() {
    this.value = schema.parse(process.env);
    if (this.value.NODE_ENV === 'production' && !this.value.DATABASE_URL) {
      throw new Error('DATABASE_URL is required in production');
    }
  }
}
