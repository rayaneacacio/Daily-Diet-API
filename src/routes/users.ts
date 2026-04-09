import type { FastifyInstance } from "fastify";
import { knex } from "../database";
import { randomUUID } from "crypto";
import z, { ZodError } from "zod";
import { compare, hash } from "bcryptjs";
import { sendError } from "../utils/send-error";
import { locales } from "../locales";

const { ALREADY_EXISTS_EMAIL_SQLITE_ERROR, ALREADY_EXISTS_EMAIL_ERROR, INVALID_USER_ERROR } = locales;

export const usersRoutes = async(app: FastifyInstance) => {
  app.post('/', async(req, res) => {
    try {
      const createUserBodySchema = z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string()
      });

      const { name, email, password } = createUserBodySchema.parse(req.body);

      const passwordHash = await hash(password, 6);

      const user = {
        id: randomUUID(),
        name,
        email,
        password: passwordHash,
      };

      await knex('users').insert(user);

      return res.status(201).send();

    } catch (error) {
      const err = error as { code: string; message: string; } | ZodError;
    
      if (err instanceof ZodError) return res.status(400).send({
        errors: z.flattenError(err)
      });

      if (err.message.includes(ALREADY_EXISTS_EMAIL_SQLITE_ERROR)) return sendError(res, 409, ALREADY_EXISTS_EMAIL_ERROR)
      
      sendError(res);
    };
  });

  app.post('/auth', async(req, res) => {
    try {
      const authUserBodySchema = z.object({
        email: z.string().email(),
        password: z.string(),
      });
  
      const { email, password } = authUserBodySchema.parse(req.body);

      const user = await knex('users')
        .where({ email })
        .select()
        .first();

      if (!user) throw new Error(INVALID_USER_ERROR);

      const passwordMatch = await compare(password, user.password);

      if (!passwordMatch) throw new Error(INVALID_USER_ERROR);

      res.setCookie('userId', user.id, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });

      return res.status(200).send();

    } catch (error) {
      const err = error as { message: string; };

      if (err.message === INVALID_USER_ERROR) return sendError(res, 401, INVALID_USER_ERROR);
      
      sendError(res);
    }
  });
};