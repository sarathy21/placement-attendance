import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Reference Data: Department, Course, Batch
  const department = await prisma.department.upsert({
    where: { code: 'MCA' },
    update: {},
    create: {
      code: 'MCA',
      name: 'Master of Computer Applications',
    },
  });

  const course = await prisma.course.upsert({
    where: { code: 'MCA-FT' },
    update: {},
    create: {
      code: 'MCA-FT',
      name: 'Master of Computer Applications (Full Time)',
      departmentId: department.id,
    },
  });

  const batch = await prisma.batch.upsert({
    where: {
      courseId_name: {
        courseId: course.id,
        name: '2023-2025',
      },
    },
    update: {},
    create: {
      name: '2023-2025',
      startYear: 2023,
      endYear: 2025,
      courseId: course.id,
    },
  });

  // Second Department/Course/Batch for relationship validation testing
  const cseDept = await prisma.department.upsert({
    where: { code: 'CSE' },
    update: {},
    create: {
      code: 'CSE',
      name: 'Computer Science and Engineering',
    },
  });

  const cseCourse = await prisma.course.upsert({
    where: { code: 'BTECH-CSE' },
    update: {},
    create: {
      code: 'BTECH-CSE',
      name: 'B.Tech Computer Science and Engineering',
      departmentId: cseDept.id,
    },
  });

  await prisma.batch.upsert({
    where: {
      courseId_name: {
        courseId: cseCourse.id,
        name: '2024-2028',
      },
    },
    update: {},
    create: {
      name: '2024-2028',
      startYear: 2024,
      endYear: 2028,
      courseId: cseCourse.id,
    },
  });

  // Hashed development password for all seed accounts
  const devPasswordHash = await argon2.hash('password123');

  // 2. Super Admin User
  await prisma.user.upsert({
    where: { email: 'superadmin@kahedu.edu.in' },
    update: { passwordHash: devPasswordHash, status: UserStatus.ACTIVE },
    create: {
      email: 'superadmin@kahedu.edu.in',
      passwordHash: devPasswordHash,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  // 3. Admin User
  await prisma.user.upsert({
    where: { email: 'admin@kahedu.edu.in' },
    update: { passwordHash: devPasswordHash, status: UserStatus.ACTIVE },
    create: {
      email: 'admin@kahedu.edu.in',
      passwordHash: devPasswordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  // 4. Staff Account
  const staffUser = await prisma.user.upsert({
    where: { email: 'staff001@kahedu.edu.in' },
    update: { passwordHash: devPasswordHash, status: UserStatus.ACTIVE },
    create: {
      email: 'staff001@kahedu.edu.in',
      passwordHash: devPasswordHash,
      role: UserRole.STAFF,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.staff.upsert({
    where: { userId: staffUser.id },
    update: {},
    create: {
      userId: staffUser.id,
      staffId: 'STAFF001',
      firstName: 'Placement',
      lastName: 'Officer',
      designation: 'Placement Coordinator',
      departmentId: department.id,
    },
  });

  // 5. Eligible Placement Student Account
  const studentUser = await prisma.user.upsert({
    where: { email: '25cap109@kahedu.edu.in' },
    update: { passwordHash: devPasswordHash, status: UserStatus.ACTIVE },
    create: {
      email: '25cap109@kahedu.edu.in',
      passwordHash: devPasswordHash,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: { isPlacementEligible: true, status: UserStatus.ACTIVE },
    create: {
      userId: studentUser.id,
      registerNumber: '25cap109',
      collegeEmail: '25cap109@kahedu.edu.in',
      firstName: 'Sarathy',
      lastName: 'S',
      phoneNumber: '+919876543210',
      departmentId: department.id,
      courseId: course.id,
      batchId: batch.id,
      isPlacementEligible: true,
      status: UserStatus.ACTIVE,
    },
  });

  // 6. Ineligible Placement Student Account (For Access Control Testing)
  const ineligibleStudentUser = await prisma.user.upsert({
    where: { email: 'ineligible_student@kahedu.edu.in' },
    update: { passwordHash: devPasswordHash, status: UserStatus.ACTIVE },
    create: {
      email: 'ineligible_student@kahedu.edu.in',
      passwordHash: devPasswordHash,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.student.upsert({
    where: { userId: ineligibleStudentUser.id },
    update: { isPlacementEligible: false, status: UserStatus.ACTIVE },
    create: {
      userId: ineligibleStudentUser.id,
      registerNumber: '25cap999',
      collegeEmail: 'ineligible_student@kahedu.edu.in',
      firstName: 'NonPlacement',
      lastName: 'Student',
      departmentId: department.id,
      courseId: course.id,
      batchId: batch.id,
      isPlacementEligible: false,
      status: UserStatus.ACTIVE,
    },
  });

  console.log('✅ Database seed completed successfully!');
  console.log('🔑 Development Test Accounts (Password for all: password123):');
  console.log(' - Student (Placement Eligible): 25cap109@kahedu.edu.in');
  console.log(' - Student (Ineligible):         ineligible_student@kahedu.edu.in');
  console.log(' - Staff:                        staff001@kahedu.edu.in');
  console.log(' - Admin:                        admin@kahedu.edu.in');
  console.log(' - Super Admin:                  superadmin@kahedu.edu.in');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
