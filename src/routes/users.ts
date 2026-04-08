import type { FastifyInstance } from "fastify";
import { knex } from "../database";
import { randomUUID } from "crypto";
import z, { ZodError } from "zod";
import { compare, hash } from "bcryptjs";

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

      if (err.message.includes('SQLITE_CONSTRAINT: UNIQUE constraint failed: users.email')) return res.status(409).send({
        error: "Already exists user with this email."
      });
      
      return res.status(500).send({ error: 'Internal Server Error' });
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

      if (!user) throw new Error('Invalid User');

      const passwordMatch = await compare(password, user.password);

      if (!passwordMatch) throw new Error('Invalid User');

      res.setCookie('userId', user.id, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });

      return res.status(200).send();

    } catch (error) {
      const err = error as { message: string; };

      if (err.message === 'Invalid User') res.status(401).send({ error: 'Invalid User' });
      
      return res.status(500).send({ error: 'Internal Server Error' });
    }
  });
};