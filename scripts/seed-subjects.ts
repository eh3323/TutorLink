import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUBJECTS = [
  { department: "CSCI", code: "UA 101", name: "Intro to Computer Science" },
  { department: "CSCI", code: "UA 102", name: "Data Structures" },
  { department: "CSCI", code: "UA 201", name: "Computer Systems Organization" },
  { department: "CSCI", code: "UA 310", name: "Basic Algorithms" },
  { department: "CSCI", code: "UA 470", name: "Object Oriented Programming" },
  { department: "MATH", code: "UA 121", name: "Calculus I" },
  { department: "MATH", code: "UA 122", name: "Calculus II" },
  { department: "MATH", code: "UA 211", name: "Linear Algebra" },
  { department: "MATH", code: "UA 233", name: "Probability and Statistics" },
  { department: "ECON", code: "UA 1", name: "Principles of Microeconomics" },
  { department: "ECON", code: "UA 2", name: "Principles of Macroeconomics" },
  { department: "PHYS", code: "UA 91", name: "Physics I" },
  { department: "CHEM", code: "UA 125", name: "General Chemistry I" },
  { department: "WRIT", code: "UA 1", name: "Writing the Essay" },
];

async function main() {
  for (const subject of SUBJECTS) {
    await prisma.subject.upsert({
      where: {
        department_code: {
          department: subject.department,
          code: subject.code,
        },
      },
      create: subject,
      update: { name: subject.name },
    });
  }
  const total = await prisma.subject.count();
  console.log(`Subjects in database: ${total}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
