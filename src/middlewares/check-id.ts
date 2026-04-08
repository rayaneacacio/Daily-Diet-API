import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";

export const checkId = async (req: FastifyRequest, res: FastifyReply) => {
  try { 
    const getMealParamsSchema = z.object({ 
      id: z.string().uuid() 
    });

    getMealParamsSchema.parse(req.params);
  } catch(error) {
    return res.status(400).send({ error: 'Meal not found' });
  };
};