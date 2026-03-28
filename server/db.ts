import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://bingo:bingo_password@localhost:5432/bingo',
});
