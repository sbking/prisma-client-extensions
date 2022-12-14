import { Prisma, PrismaClient } from "@prisma/client";

function forUser(userId: number) {
  return Prisma.defineExtension((prisma) =>
    prisma.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            const [, result] = await prisma.$transaction([
              prisma.$executeRaw`SELECT set_config('app.current_user_id', ${userId.toString()}, TRUE)`,
              query(args),
            ]);
            return result;
          },
        },
      },
    })
  );
}

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirstOrThrow();
  const product = await prisma.product.findFirstOrThrow();

  const userPrisma = prisma.$extends(forUser(user.id));

  await userPrisma.product.update({
    where: { id: product.id },
    data: { name: "New Slurm" },
  });

  await userPrisma.product.update({
    where: { id: product.id },
    data: { name: "Slurm Classic" },
  });

  const order = await userPrisma.order.create({
    data: { userId: user.id, productId: product.id, quantity: 10 },
  });

  await userPrisma.order.update({
    where: { id: order.id },
    data: { quantity: 20 },
  });

  await userPrisma.order.delete({
    where: { id: order.id },
  });

  const productVersions = await userPrisma.productVersion.findMany({
    where: { id: product.id },
  });

  const orderVersions = await userPrisma.orderVersion.findMany({
    where: { id: order.id },
  });

  console.log({ productVersions, orderVersions });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
