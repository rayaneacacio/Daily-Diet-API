
import { beforeAll, afterAll, describe, it, beforeEach, expect } from 'vitest';
import { execSync } from 'node:child_process';
import request from 'supertest';
import { app } from '../src/app';

describe('Users routes', () => {
  beforeAll(async() => {
    await app.ready();
  });

  beforeEach(async() => {
    execSync('yarn knex migrate:rollback --all');
    execSync('yarn knex migrate:latest');
  });

  afterAll(async() => {
    await app.close();
  });

  it('should be able to create a new user', async() => {
    await request(app.server)
      .post('/user')
      .send({ name: 'Teste', email: `${Math.random()}@email.com`, password: 'teste1@password' })
      .expect(201);
  });

  it('should be possible for the user to authenticate', async() => {
    const email = `${Math.random()}@email.com`;
    const password = 'teste2@password'

    await request(app.server)
      .post('/user')
      .send({ name: 'Teste', email, password })
      .expect(201);
      
    const authUserResponse = await request(app.server)
      .post('/user/auth')
      .send({ email, password })
      .expect(200);

    const cookies = authUserResponse.get('Set-Cookie');
    
    expect(cookies).toEqual(expect.arrayContaining([expect.stringContaining('userId')]));
  });
});