
import { beforeAll, afterAll, describe, it, beforeEach, expect } from 'vitest';
import { execSync } from 'node:child_process';
import request from 'supertest';
import { app } from '../src/app';
import type { FastifyInstance } from 'fastify';

const getCookies = async(app: FastifyInstance) => {
  const email = `${Math.random()}@email.com`;
  const password = '123456';

  await request(app.server).post('/user').send({ name: 'Teste', email, password });

  const response = await request(app.server).post('/user/auth').send({ email, password });

  const cookies = response.get('Set-Cookie');

  expect(cookies).toBeDefined();

  return { cookies };
};

describe('Meals routes', () => {
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

  it('should be able to create a new meal', async() => {
    const { cookies } = await getCookies(app);

    await request(app.server)
      .post('/meal')
      .send({ name: 'meal', description: 'description', on_diet: true })
      .set('Cookie', cookies!)
      .expect(201);
  });

  it('should be able to list the user meals', async() => {
    const { cookies } = await getCookies(app);

    await request(app.server)
      .post('/meal')
      .send({ name: 'meal', description: 'description', on_diet: true })
      .set('Cookie', cookies!)
      .expect(201);

    const getMealsResponse = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies!)
      .expect(200);

    expect(getMealsResponse.body.meals[0]).toEqual(
      expect.objectContaining({
        name: 'meal',
        description: 'description',
        on_diet: true
      })
    );
  });

  it('should be possible to recover a specific meal', async() => {
    const { cookies } = await getCookies(app);

    await request(app.server)
      .post('/meal')
      .send({ name: 'meal', description: 'description', on_diet: true })
      .set('Cookie', cookies!)
      .expect(201);

    const getMealsResponse = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies!)
      .expect(200);

    const mealId = getMealsResponse.body.meals[0].id;

    const getMealResponse = await request(app.server)
      .get(`/meal/${mealId}`)
      .set('Cookie', cookies!)
      .expect(200);
  
    expect(getMealResponse.body.meal).toEqual(
      expect.objectContaining({
        name: 'meal',
        description: 'description',
        on_diet: true
      })
    );
  }); 

  it('should be possible to search for the summary', async() => {
    const { cookies } = await getCookies(app);

    await request(app.server)
      .post('/meal')
      .send({ name: 'meal', description: 'description', on_diet: true })
      .set('Cookie', cookies!)
      .expect(201);
    
    await request(app.server)
      .post('/meal')
      .send({ name: 'meal', description: 'description', on_diet: false })
      .set('Cookie', cookies!)
      .expect(201);

    const getSummaryResponse = await request(app.server)
      .get('/summary')
      .set('Cookie', cookies!)
      .expect(200);
  
    expect(getSummaryResponse.body.summary).toEqual(
      expect.objectContaining({ 
        totalMeals: 2, 
        onDietMeals: 1, 
        offDietMeals: 1, 
        bestStreak: 1 
      })
    );
  }); 

  it('should be possible to edit a meal', async() => {
    const { cookies } = await getCookies(app);

    await request(app.server)
      .post('/meal')
      .send({ name: 'meal', description: 'description', on_diet: true })
      .set('Cookie', cookies!)
      .expect(201);

    const getMealsResponse = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies!)
      .expect(200);

    const mealId = getMealsResponse.body.meals[0].id;

    const putMealResponse = await request(app.server)
      .put(`/meal/${mealId}`)
      .set('Cookie', cookies!)
      .send({ on_diet: false, timestamp: '09/04/2026 18:15' })
      .expect(200);
  
    expect(putMealResponse.body.meal).toEqual(
      expect.objectContaining({
        name: 'meal',
        description: 'description',
        on_diet: false,
        timestamp: '2026-04-09T18:15:00.000Z'
      })
    );
  }); 

  it('should be possible to delete a meal', async() => {
    const { cookies } = await getCookies(app);

    await request(app.server)
      .post('/meal')
      .send({ name: 'meal', description: 'description', on_diet: true })
      .set('Cookie', cookies!)
      .expect(201);

    const getMealsResponse = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies!)
      .expect(200);

    const mealId = getMealsResponse.body.meals[0].id;

    await request(app.server)
      .delete(`/meal/${mealId}`)
      .set('Cookie', cookies!)
      .expect(200);

    const errorMealByIdResponse = await request(app.server)
      .get(`/meal/${mealId}`)
      .set('Cookie', cookies!)
      .expect(404);
  
    expect(errorMealByIdResponse.body).toEqual({error: 'Meal not found'});
  }); 
});