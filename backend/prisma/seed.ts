import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clean existing data
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  // Users
  const admin = await prisma.user.create({
    data: { email: 'admin@vracademy.lat', password: hash('admin123'), name: 'Héctor Admin', role: 'admin' },
  });

  const instructor1 = await prisma.user.create({
    data: { email: 'carlos@vracademy.lat', password: hash('pass123'), name: 'Carlos Méndez', role: 'instructor' },
  });

  const instructor2 = await prisma.user.create({
    data: { email: 'maria@vracademy.lat', password: hash('pass123'), name: 'María López', role: 'instructor' },
  });

  const instructor3 = await prisma.user.create({
    data: { email: 'jorge@vracademy.lat', password: hash('pass123'), name: 'Jorge Ramírez', role: 'instructor' },
  });

  console.log(`Created ${4} users`);

  // Students
  const statuses = ['activo', 'inactivo', 'completado', 'abandonado'] as const;
  const institutions = ['UNAM', 'Tec de Monterrey', 'Universidad de Chile', 'UBA', 'Universidad de los Andes', 'ESPOL'];
  const courses = ['VR Basics', 'Inmersión 3D Avanzada', 'Diseño de Entornos VR', 'Anatomía en VR', 'Historia Inmersiva', 'Simulación Industrial VR'];

  const instructors = [instructor1, instructor2, instructor3];

  const studentsData: Array<{
    name: string;
    email: string;
    institution: string;
    course: string;
    progress: number;
    status: string;
    instructorId: string;
    registeredAt: Date;
  }> = [];

  const names = [
    'Ana García', 'Luis Fernández', 'Sofía Torres', 'Diego Morales', 'Valentina Ruiz',
    'Mateo Castro', 'Camila Herrera', 'Sebastián Díaz', 'Isabella Vargas', 'Nicolás Rojas',
    'Luciana Peña', 'Andrés Silva', 'Mariana Gómez', 'Felipe Ortiz', 'Gabriela Sánchez',
    'Daniel Reyes', 'Paula Jiménez', 'Alejandro Flores', 'Catalina Muñoz', 'Tomás Navarro',
    'Renata Espinoza', 'Emilio Delgado', 'Victoria Romero', 'Santiago Acosta', 'Julieta Medina',
    'Ricardo Ponce', 'Elena Cordero', 'Martín Salazar', 'Carmen Ríos', 'Adrián Vega',
  ];

  for (let i = 0; i < names.length; i++) {
    const instructor = instructors[i % instructors.length];
    const daysAgo = Math.floor(Math.random() * 30);
    const registeredAt = new Date();
    registeredAt.setDate(registeredAt.getDate() - daysAgo);

    const status = statuses[Math.floor(Math.random() * statuses.length)];
    let progress: number;
    if (status === 'completado') progress = 100;
    else if (status === 'abandonado') progress = Math.floor(Math.random() * 40);
    else if (status === 'inactivo') progress = Math.floor(Math.random() * 60);
    else progress = Math.floor(Math.random() * 95) + 5;

    studentsData.push({
      name: names[i],
      email: `${names[i].toLowerCase().replace(/ /g, '.').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@mail.com`,
      institution: institutions[Math.floor(Math.random() * institutions.length)],
      course: courses[Math.floor(Math.random() * courses.length)],
      progress,
      status,
      instructorId: instructor.id,
      registeredAt,
    });
  }

  for (const data of studentsData) {
    await prisma.student.create({ data });
  }

  console.log(`Created ${studentsData.length} students`);

  // Summary
  const byStatus = studentsData.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});
  console.log('Distribution:', byStatus);
  console.log('\nCredentials:');
  console.log('  Admin:       admin@vracademy.lat / admin123');
  console.log('  Instructor:  carlos@vracademy.lat / pass123');
  console.log('  Instructor:  maria@vracademy.lat / pass123');
  console.log('  Instructor:  jorge@vracademy.lat / pass123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
