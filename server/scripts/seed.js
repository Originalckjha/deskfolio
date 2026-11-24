/**
 * Demo data for local development (used by scripts/dev-demo.js).
 *
 * DEMO LOGINS (local demo database only; every account uses DEMO_PASSWORD):
 *   Educator: rahul@demo.deskfolio.test
 *   Student:  priya@demo.deskfolio.test
 * Other educators: ananya@, meera@, arjun@, kavya@ (same domain). Students: student1@ ... student14@.
 */
import { env } from '../src/config/env.js';
import {
  User, EducatorProfile, Space, Enrollment, LockerItem, ClassSession, EducatorRating,
} from '../src/models/index.js';
import { recalculateEducatorStats } from '../src/services/ranking.js';

export const DEMO_PASSWORD = 'demo-pass-2026';
const DOMAIN = 'demo.deskfolio.test';
const hours = (h) => new Date(Date.now() + h * 3_600_000);

const educators = [
  { key: 'rahul', fullName: 'Rahul Sharma', subjects: ['physics'], slug: 'rahul-sharma-physics',
    bio: 'Physics teacher for 11 years. I teach mechanics with real-world experiments and lots of diagrams.' },
  { key: 'ananya', fullName: 'Ananya Iyer', subjects: ['maths', 'statistics'], slug: 'ananya-iyer-maths',
    bio: 'Making calculus feel obvious. Former olympiad coach.' },
  { key: 'meera', fullName: 'Meera Nair', subjects: ['chemistry'], slug: 'meera-nair-chemistry',
    bio: 'Organic chemistry without memorising: mechanisms first.' },
  { key: 'arjun', fullName: 'Arjun Patel', subjects: ['biology'], slug: 'arjun-patel-biology',
    bio: 'Biology through stories and sketches.' },
  { key: 'kavya', fullName: 'Kavya Rao', subjects: ['english'], slug: 'kavya-rao-english',
    bio: 'Essay writing and literature for board exams.' },
];

// [educatorKey, ratings from the first N students]: shows how review count affects rank.
const ratingPlan = {
  rahul: [5, 5, 4, 5, 4, 5, 5, 4, 5, 4, 5, 5],
  ananya: [5, 5, 5],
  meera: [4, 4, 5, 4, 3, 4, 4, 5],
  arjun: [3, 4, 3, 4, 3],
  kavya: [],
};

const NOTE_NEWTON = `## Newton's laws at a glance

| Law | Statement | Everyday example |
| --- | --- | --- |
| First | An object stays at rest or in uniform motion unless a net force acts | Passengers lurch forward when a bus brakes |
| Second | **F = ma**: net force equals mass times acceleration | A heavier trolley needs more push |
| Third | Every action has an equal and opposite reaction | A rocket pushes gas down, gas pushes it up |

### Solving problems
1. Draw a free-body diagram for **each** object.
2. Choose axes along the acceleration.
3. Write \`ΣF = ma\` for each axis.
4. Solve, then check units.

> Tip: friction always opposes *relative* motion, not motion in general.

- [x] Revise free-body diagrams
- [ ] Practise pulley problems
`;

const NOTE_KINEMATICS = `## Equations of motion (constant acceleration)

- v = u + at
- s = ut + ½at²
- v² = u² + 2as

**Signs matter.** Pick a positive direction and stick to it. A ball thrown up has *a = −g* if up is positive.

### Quick check
A car goes from 0 to 20 m/s in 5 s. Acceleration = 20 / 5 = **4 m/s²**.
`;

const NOTE_WORK = `## Work, energy & power

Work done **W = F·s·cos θ**. Energy is the capacity to do work.

- Kinetic energy: ½mv²
- Potential energy: mgh
- Power: P = W / t (watts)

Conservation: in the absence of friction, KE + PE stays constant.
`;

export async function seedDemo() {
  const passwordHash = await User.hashPassword(DEMO_PASSWORD, env.BCRYPT_SALT_ROUNDS);

  // ---- users ----
  const eduUsers = {};
  for (const e of educators) {
    const user = await User.create({ fullName: e.fullName, email: `${e.key}@${DOMAIN}`, passwordHash, role: 'EDUCATOR' });
    await EducatorProfile.create({ userId: user._id, slug: e.slug, displayName: e.fullName, bio: e.bio, subjects: e.subjects });
    eduUsers[e.key] = user;
  }
  const priya = await User.create({ fullName: 'Priya Verma', email: `priya@${DOMAIN}`, passwordHash, role: 'STUDENT' });
  const studentNames = ['Aarav Singh', 'Diya Kapoor', 'Ishaan Gupta', 'Saanvi Reddy', 'Vihaan Joshi', 'Anika Das',
    'Reyansh Mehta', 'Myra Shah', 'Kabir Malhotra', 'Aadhya Pillai', 'Arnav Bose', 'Kiara Menon', 'Dev Chawla', 'Tara Ghosh'];
  const students = [priya];
  for (const [i, name] of studentNames.entries()) {
    students.push(await User.create({ fullName: name, email: `student${i + 1}@${DOMAIN}`, passwordHash, role: 'STUDENT' }));
  }

  // ---- spaces ----
  const mkSpace = (key, title, subject, joinCode, isPublic = true) =>
    Space.create({ educatorId: eduUsers[key]._id, title, subject, joinCode, isPublic });
  const physics = await mkSpace('rahul', 'Physics – Class 12 (2026 batch)', 'physics', 'PHYS12A');
  const physicsPrivate = await mkSpace('rahul', 'JEE Advanced crash course', 'physics', 'JEEADV7', false);
  const spacesBy = {
    rahul: physics,
    ananya: await mkSpace('ananya', 'Calculus foundations', 'maths', 'CALC101'),
    meera: await mkSpace('meera', 'Organic chemistry', 'chemistry', 'ORGCHEM'),
    arjun: await mkSpace('arjun', 'Cell biology', 'biology', 'CELLBIO'),
    kavya: await mkSpace('kavya', 'Essay writing workshop', 'english', 'ESSAY26'),
  };

  // ---- enrollments + ratings (a student must be enrolled to rate) ----
  const reviews = ['Explains every step clearly.', 'Notes are fantastic for revision.', 'Classes are fun and focused.',
    'Helped me finally understand this.', '', 'Great problem-solving sessions.'];
  for (const [key, plan] of Object.entries(ratingPlan)) {
    const enrolled = students.slice(0, Math.max(plan.length, 4));
    await Enrollment.insertMany(enrolled.map((s) => ({ spaceId: spacesBy[key]._id, studentId: s._id })));
    await EducatorRating.insertMany(
      plan.map((rating, i) => ({ educatorId: eduUsers[key]._id, studentId: students[i]._id, rating, reviewText: reviews[i % reviews.length] })),
    );
    await recalculateEducatorStats(eduUsers[key]._id);
  }
  await Enrollment.create({ spaceId: physicsPrivate._id, studentId: priya._id });

  // ---- locker (Rahul's physics space) ----
  const item = (data) => LockerItem.create({ spaceId: physics._id, educatorId: eduUsers.rahul._id, ...data });
  const newton = await item({ title: "Newton's laws – summary", folderName: 'Mechanics', itemType: 'RICH_NOTE', contentMarkdown: NOTE_NEWTON, visibility: 'PUBLIC', downloadCount: 42 });
  const kin = await item({ title: 'Kinematics formulas', folderName: 'Mechanics', itemType: 'RICH_NOTE', contentMarkdown: NOTE_KINEMATICS, visibility: 'ENROLLED_ONLY', downloadCount: 18 });
  const work = await item({ title: 'Work, energy & power', folderName: 'Energy', itemType: 'RICH_NOTE', contentMarkdown: NOTE_WORK, visibility: 'ENROLLED_ONLY' });
  await item({ title: 'Projectile motion simulator', folderName: 'Mechanics', itemType: 'EXTERNAL_LINK', fileUrl: 'https://phet.colorado.edu/en/simulations/projectile-motion', visibility: 'PUBLIC', downloadCount: 9 });
  await item({ title: 'Answer key – unit test 1', folderName: 'Tests', itemType: 'RICH_NOTE', contentMarkdown: '1. (b)\n2. (d)\n3. (a)', visibility: 'PRIVATE' });

  // ---- classes ----
  const session = (data) => ClassSession.create({ spaceId: physics._id, ...data });
  await session({ title: 'Lecture 1: Kinematics in 1D', scheduledAt: hours(-24 * 9), recordingUrl: 'https://www.youtube.com/watch?v=demo1', linkedNoteId: kin._id, status: 'COMPLETED' });
  await session({ title: "Lecture 2: Newton's laws", scheduledAt: hours(-24 * 6), recordingUrl: 'https://www.youtube.com/watch?v=demo2', linkedNoteId: newton._id, status: 'COMPLETED' });
  await session({ title: 'Lecture 3: Friction & pulleys', scheduledAt: hours(-24 * 2), linkedNoteId: newton._id });
  await session({ title: 'Lecture 4: Work & energy', scheduledAt: hours(20), meetingUrl: 'https://meet.google.com/abc-defg-hij', linkedNoteId: work._id });
  await session({ title: 'Doubt-clearing session', scheduledAt: hours(24 * 4), meetingUrl: 'https://meet.google.com/xyz-uvwx-rst' });

  return { educators: educators.length, students: students.length };
}
