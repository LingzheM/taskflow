import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateKeyBetween } from 'fractional-indexing';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      name: 'Alice',
      password: hashedPassword,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      name: 'Bob',
      password: hashedPassword,
    },
  });

  // Create a demo board for Alice
  const board = await prisma.board.create({
    data: {
      name: 'Demo Project',
      ownerId: alice.id,
      members: {
        create: [
          { userId: alice.id, role: 'owner' },
          { userId: bob.id, role: 'member' },
        ],
      },
    },
  });

  // Create default columns with fractional positions
  const pos1 = generateKeyBetween(null, null);         // "a0"
  const pos2 = generateKeyBetween(pos1, null);         // "a1"
  const pos3 = generateKeyBetween(pos2, null);         // "a2"

  const todoCol = await prisma.column.create({
    data: { boardId: board.id, name: 'To Do', position: pos1 },
  });
  const inProgressCol = await prisma.column.create({
    data: { boardId: board.id, name: 'In Progress', position: pos2 },
  });
  await prisma.column.create({
    data: { boardId: board.id, name: 'Done', position: pos3 },
  });

  // Seed some cards
  const cp1 = generateKeyBetween(null, null);
  const cp2 = generateKeyBetween(cp1, null);
  const cp3 = generateKeyBetween(cp2, null);

  await prisma.card.createMany({
    data: [
      { columnId: todoCol.id, title: 'Design database schema', position: cp1 },
      { columnId: todoCol.id, title: 'Set up CI/CD pipeline', position: cp2 },
      { columnId: todoCol.id, title: 'Write API documentation', position: cp3 },
    ],
  });

  const ip1 = generateKeyBetween(null, null);
  await prisma.card.create({
    data: {
      columnId: inProgressCol.id,
      title: 'Implement drag-and-drop',
      description: 'Using dnd-kit for smooth drag interactions',
      position: ip1,
    },
  });

  console.log('✅ Seed complete!');
  console.log('   alice@example.com / password123');
  console.log('   bob@example.com   / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });