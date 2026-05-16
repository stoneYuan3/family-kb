import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";
import bcrypt from 'bcrypt';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('admin260516', 10);

  const admin = await prisma.users.upsert({
    where: { email: 'jackyuan110@gmail.com' },
    update: {},
    create: {
      name: 'shucong',
      email: 'jackyuan110@gmail.com',
      password: passwordHash,
      role: 'admin',
    },
  });
  console.log({admin})
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
