import { randomUUID } from "crypto";
import type { FastifyInstance } from "fastify";
import z, { ZodError } from "zod";
import { knex } from "../database";
import { checkUserId } from "../middlewares/check-user-id";
import type { tMeal } from "../@types/knex.s";
import { checkId } from "../middlewares/check-id";
import { sendError } from "../utils/send-error";
import { locales } from "../locales";

const { MEAL_NOT_FOUND_ERROR } = locales;

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
  
      sendError(res);
    };
  });

  app.get('/meals', async(req, res) => {
    try {
      const { userId } = req.cookies;

      const meals = await knex('meals').where('user_id', userId).select();

      const formattedMeals = meals.map(meal => formatOnDietBoolean(meal));

      return res.status(200).send({ meals: formattedMeals });
      
    } catch(error) {
      sendError(res);
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
      const { userId } = req.cookies;

      const meal = await knex('meals').where({ id, 'user_id': userId }).select().first();

      if (!meal) throw new Error(MEAL_NOT_FOUND_ERROR);

      return res.status(200).send({ meal: formatOnDietBoolean(meal) });
      
    } catch(error) {
      const err = error as { message: string; };

      if (err.message === MEAL_NOT_FOUND_ERROR) return sendError(res, 404, MEAL_NOT_FOUND_ERROR);

      sendError(res);
    };
  });

  app.get('/summary', async(req, res) => {
    try {
      const { userId } = req.cookies;

      const meals = await knex('meals').where('user_id', userId).select().orderBy('timestamp', 'asc');;

      const totalMeals = meals.length;
      const onDietMeals = meals.filter(meal => Boolean(meal.on_diet)).length;
      const offDietMeals = meals.filter(meal => !Boolean(meal.on_diet)).length;

      const bestStreak = meals.reduce((acc, meal) => {
        if (meal.on_diet) {
          acc.current++;
          acc.best = Math.max(acc.best, acc.current);
        } else acc.current = 0;
        
        return acc;
      }, { current: 0, best: 0 }).best;

      const summary = { totalMeals, onDietMeals, offDietMeals, bestStreak };

      return res.status(200).send({ summary });

    } catch (error) {
      sendError(res);
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
        on_diet: z.boolean(),
        timestamp: z.string().transform((val) => {
          const [date, time] = val.split(' ');

          if(!date) return;
          
          const [day, month, year] = date.split('/');
  
          return new Date(`${year}-${month}-${day}T${time}:00.000Z`);
        }),
      }).partial();

      const { id } = putMealParamsSchema.parse(req.params);
      const { name, description,timestamp, on_diet } = putMealBodySchema.parse(req.body);
      const { userId } = req.cookies;

      const meal = await knex('meals').where({ id, user_id: userId }).select().first();

      if (!meal) throw new Error(MEAL_NOT_FOUND_ERROR);

      const newMeal = {
        ...meal,
        name: name ?? meal.name,
        description: description ?? meal.description,
        timestamp: timestamp ?? meal.timestamp,
        on_diet: on_diet ?? meal.on_diet,
        updated_at: new Date().toISOString()
      };

      await knex('meals').where({ id }).update(newMeal);

      return res.status(200).send({ meal: formatOnDietBoolean(newMeal) });
      
    } catch(error) {
      const err = error as { message: string; };

      if (err.message === MEAL_NOT_FOUND_ERROR) return sendError(res, 404, MEAL_NOT_FOUND_ERROR);

      sendError(res);
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
      const { userId } = req.cookies;

      const deleted = await knex('meals').where({ id, 'user_id': userId }).delete();

      if (!Boolean(deleted)) throw new Error(MEAL_NOT_FOUND_ERROR);

      return res.status(200).send();
      
    } catch(error) {
      const err = error as { message: string; };

      if (err.message === MEAL_NOT_FOUND_ERROR) return sendError(res, 404, MEAL_NOT_FOUND_ERROR);

      sendError(res);
    };
  });
};