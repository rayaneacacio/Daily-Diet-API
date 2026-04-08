import fastify from "fastify";
import cookie from "@fastify/cookie";
import { usersRoutes } from "./routes/users.js";
import { mealsRoutes } from "./routes/meals.js";

export const app = fastify();

app.register(cookie);

app.register(usersRoutes, { prefix: 'user' });
app.register(mealsRoutes);