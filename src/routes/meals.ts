import { randomUUID } from "crypto";
import type { FastifyInstance } from "fastify";
import z, { ZodError } from "zod";
import { knex } from "../database";
import { checkUserId } from "../middlewares/check-user-id";
import type { tMeal } from "../@types/knex.s";
import { checkId } from "../middlewares/check-id";

const formatOnDietBoolean = (meal: tMeal) => {
  return {...meal, on_diet: Boolean(meal.on_diet)};
};

export const mealsRoutes = async(app: FastifyInstance) => {
  app.addHook('preHandler', checkUserId);

  app.post('/meal', async(req, res) => {
    try {
      const createMealBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        on_diet: z.boolean()
      });
  
      const { name, description, on_diet } = createMealBodySchema.parse(req.body);
      const { userId } = req.cookies;
  
      const meal = {
        id: randomUUID(),
        user_id: userId,
        name,
        description,
        on_diet,
        created_at: new Date().toISOString(), 
        updated_at: new Date().toISOString(),
        timestamp: new Date().toISOString()
      };
  
      await knex('meals').insert(meal);
  
      return res.status(201).send();
  
    } catch (error) {
      const err = error as { code: string; message: string; } | ZodError;
      
      if (err instanceof ZodError) return res.status(400).send({
        errors: z.flattenError(err)
      });
  
      return res.status(500).send({ error: 'Internal Server Error' });
    };
  });

  app.get('/meals', async(req, res) => {
    try {
      const { userId } = req.cookies;

      const meals = await knex('meals').where('user_id', userId).select();

      const formattedMeals = meals.map(meal => formatOnDietBoolean(meal));

      return res.status(200).send({ meals: formattedMeals });
      
    } catch(error) {
      return res.status(500).send({ error: 'Internal Server Error' });
    };
  });

  app.get('/meal/:id', {
    preHandler: checkId
  }, async(req, res) => {
    try {
      const getMealParamsSchema = z.object({ 
        id: z.string().uuid() 
      });
      const { id } = getMealParamsSchema.parse(req.params);

      const meal = await knex('meals').where({ id }).select().first();

      if (!meal) throw new Error('Meal not found');

      return res.status(200).send({ meals: formatOnDietBoolean(meal) });
      
    } catch(error) {
      const err = error as { message: string; };

      if (err.message === 'Meal not found') return res.status(400).send({ error: 'Meal not found' });

      return res.status(500).send({ error: 'Internal Server Error' });
    };
  });

  app.get('/summary', async(req, res) => {
    try {
      const { userId } = req.cookies;

      const meals = await knex('meals').where('user_id', userId).select();

      const totalMeals = meals.length;
      const onDietMeals = meals.filter(meal => meal.on_diet === 1).length;
      const offDietMeals = meals.filter(meal => meal.on_diet !== 1).length;

      const summary = { totalMeals, onDietMeals, offDietMeals };

      return res.status(200).send({ summary });

    } catch (error) {
      return res.status(500).send({ error: 'Internal Server Error' });
    }
  });

  app.put('/meal/:id', {
    preHandler: checkId
  }, async(req, res) => {
    try {
      const putMealParamsSchema = z.object({ 
        id: z.string().uuid() 
      });

      const putMealBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        timestamp: z.coerce.date(),
        on_diet: z.boolean()
      }).partial();

      const { id } = putMealParamsSchema.parse(req.params);
      const { name, description,timestamp, on_diet } = putMealBodySchema.parse(req.body);
      const { userId } = req.cookies;

      const meal = await knex('meals').where({ id, user_id: userId }).select().first();

      if (!meal) throw new Error('Meal not found');

      const newMeal = {
        ...meal,
        name: name ?? meal.name,
        description: description ?? meal.description,
        timestamp: timestamp ?? meal.timestamp,
        on_diet: on_diet ?? meal.on_diet,
        updated_at: new Date().toISOString()
      };

      await knex('meals').where({ id }).update(newMeal);

      return res.status(200).send({ meals: formatOnDietBoolean(newMeal) });
      
    } catch(error) {
      const err = error as { message: string; };

      if (err.message === 'Meal not found') return res.status(400).send({ error: 'Meal not found' });

      return res.status(500).send({ error: 'Internal Server Error' });
    };
  });

  app.delete('/meal/:id', {
    preHandler: checkId
  }, async(req, res) => {
    try {
      const deleteMealParamsSchema = z.object({ 
        id: z.string().uuid() 
      });
      const { id } = deleteMealParamsSchema.parse(req.params);

      await knex('meals').where({ id }).delete();

      return res.status(200).send();
      
    } catch(error) {
      const err = error as { message: string; };

      if (err.message === 'Meal not found') return res.status(400).send({ error: 'Meal not found' });

      return res.status(500).send({ error: 'Internal Server Error' });
    };
  });
};