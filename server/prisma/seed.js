

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES = [
  { code: "personal_information", name: "Personal Information" },
  { code: "certification", name: "Certification" },
  { code: "domain_knowledge", name: "Domain Knowledge" },
  { code: "soft_skills", name: "Soft Skills" },
];

const SYSTEM_ATTRIBUTES = [
  {
    name: "First Name",
    description: "Candidate first name (system attribute, Me section)",
    type: "STRING",
  },
  {
    name: "Last Name",
    description: "Candidate last name (system attribute, Me section)",
    type: "STRING",
  },
  {
    name: "Location",
    description: "City / country (system attribute, Me section)",
    type: "STRING",
  },
  {
    name: "Personal Photo",
    description: "Profile photo URL in cloud storage (system attribute, Me section)",
    type: "IMAGE",
  },
];

async function main() {
  console.log("Seeding categories…");

  for (const cat of CATEGORIES) {
    await prisma.attributeCategory.upsert({
      where: { code: cat.code },
      create: cat,
      update: { name: cat.name },
    });
  }

  const personal = await prisma.attributeCategory.findUniqueOrThrow({
    where: { code: "personal_information" },
  });

  console.log("Seeding system Me attributes…");

  for (const attr of SYSTEM_ATTRIBUTES) {
    await prisma.attribute.upsert({
      where: { name: attr.name },
      create: {
        name: attr.name,
        description: attr.description,
        type: attr.type,
        isSystem: true,
        categoryId: personal.id,
      },
      update: {
        description: attr.description,
        type: attr.type,
        isSystem: true,
        categoryId: personal.id,
      },
    });
  }

  console.log("Seed done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
