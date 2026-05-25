#!/bin/bash
cd /root/admin-meilisearch
source /dev/stdin <<< "$(cat .env | sed 's/export //g')"
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const m = await prisma.module.findUnique({ where: { id: 18 } });
  console.log(JSON.stringify(m));
  await prisma.\$disconnect();
}
main();
"