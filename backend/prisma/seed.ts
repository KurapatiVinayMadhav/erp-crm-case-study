import { PrismaClient, Role, StockMovementType } from "@prisma/client";
import { hashPassword } from "../src/modules/auth/auth.service";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding demo data...");

  await prisma.challanItem.deleteMany();
  await prisma.challan.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // Users ---------------------------------------------------------------
  const password = await hashPassword("demo@12345");

  await prisma.user.create({
    data: {
      name: "Aditya Kale",
      email: "admin@nirvana.in",
      passwordHash: password,
      role: Role.ADMIN,
    },
  });
  const sales = await prisma.user.create({
    data: {
      name: "Sneha Patil",
      email: "sales@nirvana.in",
      passwordHash: password,
      role: Role.SALES,
    },
  });
  const warehouse = await prisma.user.create({
    data: {
      name: "Rohan Deshmukh",
      email: "warehouse@nirvana.in",
      passwordHash: password,
      role: Role.WAREHOUSE,
    },
  });
  await prisma.user.create({
    data: {
      name: "Priya Iyer",
      email: "accounts@nirvana.in",
      passwordHash: password,
      role: Role.ACCOUNTS,
    },
  });

  // Customers ------------------------------------------------------------
  const c1 = await prisma.customer.create({
    data: {
      name: "Mahesh Sharma",
      mobile: "9822012345",
      email: "sharma.store@gmail.com",
      businessName: "Sharma General Store",
      gstNumber: "27AAHCS1234F1Z5",
      type: "RETAIL",
      address: "Shop 4, MG Road, Camp, Pune 411001",
      status: "ACTIVE",
      followUpDate: new Date("2026-09-18T10:00:00.000Z"),
      notes: "Regular monthly order. Prefers cash on delivery.",
      createdById: sales.id,
    },
  });
  const c2 = await prisma.customer.create({
    data: {
      name: "Farhan Shaikh",
      mobile: "9765011223",
      email: "farhan@starfoods.in",
      businessName: "Star Foods Distributors",
      gstNumber: "27AAKFR2345H1Z2",
      type: "DISTRIBUTOR",
      address: "Plot 12, Ganesh Nagar, Hadapsar, Pune 411028",
      status: "ACTIVE",
      followUpDate: new Date("2026-09-25T09:30:00.000Z"),
      notes: "Large distributor across Pune. Billing on credit, 30 days.",
      createdById: sales.id,
    },
  });
  const c3 = await prisma.customer.create({
    data: {
      name: "Rajesh Kulkarni",
      mobile: "9921601122",
      email: null,
      businessName: "Kulkarni Kirana",
      gstNumber: null,
      type: "WHOLESALE",
      address: "Shop 22, Budhwar Peth, Pune 411002",
      status: "LEAD",
      followUpDate: new Date("2026-09-12T11:00:00.000Z"),
      notes: "Met at the Diwali trade fair. Interested in bulk rice and oil.",
      createdById: sales.id,
    },
  });
  const c4 = await prisma.customer.create({
    data: {
      name: "Anita Joshi",
      mobile: "9890099887",
      email: "anita@laxmiowls.in",
      businessName: "Laxmi Oil Traders",
      gstNumber: "27AAQPL6789K1Z7",
      type: "WHOLESALE",
      address: "Shed 3, Vegetable Market, Pimpri, Pune 411018",
      status: "ACTIVE",
      createdById: sales.id,
    },
  });
  await prisma.customer.create({
    data: {
      name: "Sunil Verma",
      mobile: "9876543210",
      email: "sunil.supermarket@gmail.com",
      businessName: "Sunil SuperMart",
      gstNumber: "27AAHVS5678L1Z3",
      type: "RETAIL",
      address: "Survey 45, Kharadi Bypass, Pune 411014",
      status: "INACTIVE",
      notes: "Paused orders for festival season. Re-engaging in October.",
      createdById: sales.id,
    },
  });

  await prisma.followUp.create({
    data: {
      customerId: c3.id,
      note: "Called to confirm interest in 25kg rice packs. Wants a price quote.",
      createdById: sales.id,
    },
  });
  await prisma.followUp.create({
    data: {
      customerId: c3.id,
      note: "Shared updated rates for Basmati and Sonamasuri rice.",
      createdById: sales.id,
    },
  });
  await prisma.followUp.create({
    data: {
      customerId: c1.id,
      note: "Monthly order confirmed - 10 cartons detergent, 5 cartons soap.",
      createdById: sales.id,
    },
  });

  // Products -------------------------------------------------------------
  const p1 = await prisma.product.create({
    data: { name: "Wheel Detergent Powder 1kg", sku: "WDL-001", category: "Detergents", unitPrice: 122, currentStock: 84, minStock: 40, location: "Rack A-1" },
  });
  const p2 = await prisma.product.create({
    data: { name: "Surf Excel Matic 1kg", sku: "SUR-004", category: "Detergents", unitPrice: 158, currentStock: 36, minStock: 30, location: "Rack A-2" },
  });
  const p3 = await prisma.product.create({
    data: { name: "India Gate Basmati Rice 5kg", sku: "RIC-011", category: "Staples", unitPrice: 545, currentStock: 156, minStock: 60, location: "Bay 2" },
  });
  const p4 = await prisma.product.create({
    data: { name: "Lokhandwala Sonamasuri Rice 25kg", sku: "RIC-023", category: "Staples", unitPrice: 1490, currentStock: 48, minStock: 25, location: "Bay 2" },
  });
  const p5 = await prisma.product.create({
    data: { name: "Fortune Sunflower Oil 1L", sku: "OIL-032", category: "Oils", unitPrice: 142, currentStock: 61, minStock: 50, location: "Rack C-1" },
  });
  const p6 = await prisma.product.create({
    data: { name: "Dhara Groundnut Oil 1L", sku: "OIL-048", category: "Oils", unitPrice: 176, currentStock: 12, minStock: 25, location: "Rack C-2" },
  });
  const p7 = await prisma.product.create({
    data: { name: "Lifebuoy Soap 1kg pack", sku: "SOA-006", category: "Personal Care", unitPrice: 210, currentStock: 18, minStock: 20, location: "Rack D-1" },
  });
  const p8 = await prisma.product.create({
    data: { name: "Vim Dishwash Bar 300g", sku: "VIM-013", category: "Household", unitPrice: 45, currentStock: 220, minStock: 80, location: "Rack D-2" },
  });

  // Stock movements (opening + adjustments) --------------------------------
  const opening = [
    [p1.id, 60], [p2.id, 50], [p3.id, 100], [p4.id, 30],
    [p5.id, 40], [p6.id, 25], [p7.id, 20], [p8.id, 150],
  ] as const;

  await Promise.all(
    opening.map(([productId, qty], i) =>
      prisma.stockMovement.create({
        data: {
          productId,
          quantityChanged: qty,
          type: StockMovementType.IN,
          reason: "Opening stock",
          createdById: warehouse.id,
          createdAt: new Date(Date.now() - (i + 1) * 86400000),
        },
      })
    )
  );

  await prisma.stockMovement.create({
    data: {
      productId: p1.id,
      quantityChanged: 30,
      type: StockMovementType.IN,
      reason: "Supplier delivery - Hindustan Unilever",
      createdById: warehouse.id,
      createdAt: new Date(Date.now() - 2 * 86400000),
    },
  });
  await prisma.stockMovement.create({
    data: {
      productId: p6.id,
      quantityChanged: 3,
      type: StockMovementType.OUT,
      reason: "Damaged in transit - disposed",
      createdById: warehouse.id,
      createdAt: new Date(Date.now() - 1 * 86400000),
    },
  });

  // Challans ----------------------------------------------------------------
  const confirmedChallan = await prisma.challan.create({
    data: {
      challanNumber: "CHL-2026-0001",
      customerId: c1.id,
      status: "CONFIRMED",
      totalQuantity: 15,
      createdById: sales.id,
      confirmedAt: new Date(Date.now() - 3 * 86400000),
      createdAt: new Date(Date.now() - 4 * 86400000),
      items: {
        create: [
          { productId: p1.id, productName: p1.name, sku: p1.sku, unitPrice: p1.unitPrice, quantity: 10, amount: 1220 },
          { productId: p7.id, productName: p7.name, sku: p7.sku, unitPrice: p7.unitPrice, quantity: 5, amount: 1050 },
        ],
      },
    },
  });

  // Match stock with the confirmed challan - p1 84 -> 74, p7 18 -> 13
  await prisma.product.update({ where: { id: p1.id }, data: { currentStock: 74 } });
  await prisma.product.update({ where: { id: p7.id }, data: { currentStock: 13 } });
  await prisma.stockMovement.create({
    data: { productId: p1.id, quantityChanged: 10, type: StockMovementType.OUT, reason: `Sales challan ${confirmedChallan.challanNumber}`, createdById: warehouse.id, createdAt: new Date(Date.now() - 3 * 86400000) },
  });
  await prisma.stockMovement.create({
    data: { productId: p7.id, quantityChanged: 5, type: StockMovementType.OUT, reason: `Sales challan ${confirmedChallan.challanNumber}`, createdById: warehouse.id, createdAt: new Date(Date.now() - 3 * 86400000) },
  });

  const draftChallan = await prisma.challan.create({
    data: {
      challanNumber: "CHL-2026-0002",
      customerId: c4.id,
      status: "DRAFT",
      totalQuantity: 30,
      createdById: sales.id,
      createdAt: new Date(Date.now() - 1 * 86400000),
      items: {
        create: [
          { productId: p5.id, productName: p5.name, sku: p5.sku, unitPrice: p5.unitPrice, quantity: 20, amount: 2840 },
          { productId: p8.id, productName: p8.name, sku: p8.sku, unitPrice: p8.unitPrice, quantity: 10, amount: 450 },
        ],
      },
    },
  });
  void draftChallan;

  console.log("Seed complete.");
  console.log("");
  console.log("Demo login credentials (password: demo@12345):");
  console.log("  Admin    -> admin@nirvana.in");
  console.log("  Sales    -> sales@nirvana.in");
  console.log("  Warehouse-> warehouse@nirvana.in");
  console.log("  Accounts -> accounts@nirvana.in");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });