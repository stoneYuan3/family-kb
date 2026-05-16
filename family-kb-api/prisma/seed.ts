import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Stone001219@', 10);

  await prisma.user.upsert({
    where: { email: 'jackyuan110@gmail.com' },
    update: {},
    create: {
      name: 'shucong',
      email: 'jackyuan110@gmail.com',
      password: passwordHash,
      role: 'ADMIN',
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
