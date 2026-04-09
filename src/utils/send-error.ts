import type { FastifyReply } from "fastify/types/reply";
import { locales } from "../locales";

const { INTERNAL_SERVER_ERROR } = locales;

export const sendError = (res: FastifyReply, statusCode = 500, errorMessage = INTERNAL_SERVER_ERROR) => {

  return res.status(statusCode).send({ error: errorMessage });
};
