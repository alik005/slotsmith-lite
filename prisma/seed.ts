import { PrismaClient } from "@prisma/client";
import { localTime, upcomingDays, weekdayOf } from "../src/lib/time";

const db = new PrismaClient();

async function main() {
  await db.booking.deleteMany();
  await db.timeOff.deleteMany();
  await db.availability.deleteMany();
  await db.staffService.deleteMany();
  await db.service.deleteMany();
  await db.staff.deleteMany();

  await db.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, businessName: "Willow & Stone Studio", tagline: "Massage, facials and wellness. Book online in under a minute." },
  });

  const weekdays = [1, 2, 3, 4, 5];
  const maya = await db.staff.create({
    data: {
      name: "Maya Chen",
      email: "",
      bio: "Licensed massage therapist, 8 years.",
      availability: { create: weekdays.map((weekday) => ({ weekday, startMin: 9 * 60, endMin: 17 * 60 })) },
    },
  });
  const leo = await db.staff.create({
    data: {
      name: "Leo Martins",
      email: "",
      bio: "Skin specialist.",
      availability: {
        create: [
          ...[2, 3, 4].map((weekday) => ({ weekday, startMin: 12 * 60, endMin: 20 * 60 })),
          { weekday: 6, startMin: 10 * 60, endMin: 14 * 60 },
        ],
      },
    },
  });

  const services = [
    { name: "Intro Consultation", slug: "intro-consultation", durationMin: 20, priceCents: 0, staff: [maya.id, leo.id],
      description: "A free 20-minute chat to find the right treatment for you." },
    { name: "Deep Tissue Massage", slug: "deep-tissue-massage", durationMin: 60, priceCents: 9000, depositCents: 2000, staff: [maya.id],
      description: "Firm pressure to release tension in muscles and connective tissue." },
    { name: "Signature Facial", slug: "signature-facial", durationMin: 45, priceCents: 7500, depositCents: 1500, staff: [leo.id],
      description: "Cleanse, exfoliate, mask and massage, tailored to your skin." },
    { name: "Express Back Massage", slug: "express-back-massage", durationMin: 30, priceCents: 4500, staff: [maya.id, leo.id],
      description: "A focused 30 minutes for back, neck and shoulders." },
  ];
  const created: Record<string, { id: string; durationMin: number; priceCents: number }> = {};
  for (const [i, s] of services.entries()) {
    created[s.slug] = await db.service.create({
      data: {
        name: s.name,
        slug: s.slug,
        description: s.description,
        durationMin: s.durationMin,
        priceCents: s.priceCents,
        depositCents: s.depositCents ?? 0,
        sortOrder: i,
        staff: { create: s.staff.map((staffId) => ({ staffId })) },
      },
    });
  }

  // A few demo bookings over the next working days, so the dashboard isn't empty.
  const settings = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
  const tz = settings.timezone;
  const days = upcomingDays(14, tz).filter((d) => [2, 3, 4].includes(weekdayOf(d, tz))).slice(0, 3);
  const demo = [
    { day: 0, at: 10 * 60, slug: "deep-tissue-massage", staff: maya.id, name: "Priya Sharma", email: "priya@example.com" },
    { day: 0, at: 14 * 60, slug: "signature-facial", staff: leo.id, name: "Daniel Okafor", email: "daniel@example.com" },
    { day: 1, at: 11 * 60, slug: "express-back-massage", staff: maya.id, name: "Sofia Rossi", email: "sofia@example.com" },
    { day: 2, at: 16 * 60, slug: "intro-consultation", staff: leo.id, name: "Tom Becker", email: "tom@example.com" },
  ];
  for (const [i, b] of demo.entries()) {
    const svc = created[b.slug];
    const startsAt = localTime(days[b.day], b.at, tz);
    await db.booking.create({
      data: {
        serviceId: svc.id,
        staffId: b.staff,
        customerName: b.name,
        customerEmail: b.email,
        startsAt,
        endsAt: new Date(startsAt.getTime() + svc.durationMin * 60_000),
        priceCents: svc.priceCents,
        status: "CONFIRMED",
        manageToken: `demo-booking-${i + 1}`,
      },
    });
  }
  console.log("Seeded demo business: 2 staff, 4 services, 4 bookings.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
