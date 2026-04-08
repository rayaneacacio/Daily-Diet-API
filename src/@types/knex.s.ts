import { Knex } from "knex";

export type tUser = {
  id: string,
  name: string,
  email: string,
  password: string,
  created_at: string,
};

export type tMeal = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  on_diet: boolean;
  timestamp: Date;
};

declare module 'knex/types/tables' {
  export interface Tables {
    users: tUser;
    meeal: tMeal;
  }
};