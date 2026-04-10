import setupKnex from 'knex';
import type { Knex } from 'knex';
import env  from './env/index.js';

export const config: Knex.Config = {
  client: env.DATABASE_CLIENT,
  connection: {
    connectionString: process.env.DATABASE_URL, // Sua URL do banco (postgres://...)
    ssl: {
      rejectUnauthorized: false 
    }
  },
  useNullAsDefault: true,
  migrations: {
    extension: 'ts',
    directory: './db/migrations',
  },
};

export const knex = setupKnex(config);