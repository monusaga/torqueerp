import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seeding for Spare Parts ERP SaaS...');

  // Clean existing tables
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.productPriceHistory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.businessMember.deleteMany();
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  // 1. Create User A & Business A (Tenant A)
  const userA = await prisma.user.create({
    data: {
      name: 'Rajesh Kumar',
      email: 'owner.a@example.com',
      passwordHash,
      phone: '+919876543210',
    },
  });

  const businessA = await prisma.business.create({
    data: {
      name: 'Royal Spares & Service Station',
      slug: 'royal-spares-chennai',
      phone: '+919876543210',
      email: 'contact@royalspares.example',
      address: '42, Mount Road, Guindy',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pin: '600032',
      gstin: '33AAAAA0000A1Z5',
      invoicePrefix: 'RSP',
      nextInvoiceNumber: 1001,
      defaultTaxRate: 18.0,
    },
  });

  await prisma.businessMember.create({
    data: {
      businessId: businessA.id,
      userId: userA.id,
      role: 'OWNER',
      permissions: JSON.stringify(['*']),
    },
  });

  // 2. Create User B & Business B (Tenant B) for Isolation Testing
  const userB = await prisma.user.create({
    data: {
      name: 'Vikram Singh',
      email: 'owner.b@example.com',
      passwordHash,
      phone: '+919123456780',
    },
  });

  const businessB = await prisma.business.create({
    data: {
      name: 'Apex Auto Parts Delhi',
      slug: 'apex-auto-delhi',
      phone: '+919123456780',
      email: 'contact@apexauto.example',
      address: '15, Karol Bagh Spare Market',
      city: 'New Delhi',
      state: 'Delhi',
      pin: '110005',
      gstin: '07BBBBB1111B2Z8',
      invoicePrefix: 'APX',
      nextInvoiceNumber: 2001,
      defaultTaxRate: 18.0,
    },
  });

  await prisma.businessMember.create({
    data: {
      businessId: businessB.id,
      userId: userB.id,
      role: 'OWNER',
      permissions: JSON.stringify(['*']),
    },
  });

  // 3. Seed Suppliers for Business A
  const supplier1 = await prisma.supplier.create({
    data: {
      businessId: businessA.id,
      name: 'Southern Auto Distributors',
      company: 'Southern Auto Corp',
      phone: '+919840123456',
      email: 'sales@southernauto.example',
      address: '12, Industrial Estate, Ambattur, Chennai',
      gstin: '33AABCS1234F1Z1',
      paymentTerms: '30 Days Net',
    },
  });

  // 4. Seed Products for Business A
  const p1 = await prisma.product.create({
    data: {
      businessId: businessA.id,
      name: 'Royal Enfield Front Disc Brake Pads',
      partNumber: 'RAH00140/B',
      sku: 'RE-BP-001',
      barcode: '8901234567890',
      brand: 'Royal Enfield Genuine',
      category: 'Braking System',
      description: 'Genuine OEM Front Brake Pads for Classic 350 / Meteor 350 / Hunter 350',
      mrp: 550.0,
      purchaseCost: 380.0,
      sellingPrice: 520.0,
      taxRate: 18.0,
      minStock: 5,
      maxStock: 50,
      currentStock: 24,
      supplierId: supplier1.id,
      vehicleCompatibility: 'Royal Enfield Classic 350, Meteor 350, Hunter 350, Bullet 350 (2023+)',
    },
  });

  const p2 = await prisma.product.create({
    data: {
      businessId: businessA.id,
      name: 'Clutch Cable Assembly',
      partNumber: '145214/C',
      sku: 'RE-CC-102',
      barcode: '8901234567891',
      brand: 'Royal Enfield Genuine',
      category: 'Cables & Controls',
      description: 'Smooth friction-free clutch wire for Bullet 350 / Standard',
      mrp: 220.0,
      purchaseCost: 140.0,
      sellingPrice: 210.0,
      taxRate: 18.0,
      minStock: 8,
      maxStock: 40,
      currentStock: 3, // Low stock on purpose!
      supplierId: supplier1.id,
      vehicleCompatibility: 'Royal Enfield Classic 350 (BS3/BS4/BS6), Bullet 350/500',
    },
  });

  const p3 = await prisma.product.create({
    data: {
      businessId: businessA.id,
      name: 'NGK Spark Plug CPR8EA-9',
      partNumber: 'CPR8EA-9',
      sku: 'NGK-SP-89',
      barcode: '8901234567892',
      brand: 'NGK',
      category: 'Ignition & Electrical',
      description: 'High performance nickel spark plug',
      mrp: 180.0,
      purchaseCost: 110.0,
      sellingPrice: 170.0,
      taxRate: 18.0,
      minStock: 10,
      maxStock: 100,
      currentStock: 45,
      supplierId: supplier1.id,
      vehicleCompatibility: 'Universal Motorcycle / Royal Enfield Himalayan / Classic 350',
    },
  });

  const p4 = await prisma.product.create({
    data: {
      businessId: businessA.id,
      name: 'Motul 7100 15W50 4T 2.5L Fully Synthetic',
      partNumber: 'MOT-7100-25',
      sku: 'MOT-15W50-25',
      barcode: '8901234567893',
      brand: 'Motul',
      category: 'Lubricants & Oils',
      description: '100% Synthetic 4-Stroke motorcycle engine oil',
      mrp: 2400.0,
      purchaseCost: 1750.0,
      sellingPrice: 2250.0,
      taxRate: 18.0,
      minStock: 4,
      maxStock: 20,
      currentStock: 12,
      supplierId: supplier1.id,
      vehicleCompatibility: 'Royal Enfield 350/500/650 Twins, KTM Duke 390, Dominar 400',
    },
  });

  // Seed Stock Ledger Movements for Business A
  await prisma.stockMovement.createMany({
    data: [
      {
        businessId: businessA.id,
        productId: p1.id,
        movementType: 'OPENING_STOCK',
        quantity: 24,
        beforeQuantity: 0,
        afterQuantity: 24,
        unitCost: 380.0,
        referenceType: 'OPENING_STOCK',
        notes: 'Initial opening stock',
      },
      {
        businessId: businessA.id,
        productId: p2.id,
        movementType: 'OPENING_STOCK',
        quantity: 3,
        beforeQuantity: 0,
        afterQuantity: 3,
        unitCost: 140.0,
        referenceType: 'OPENING_STOCK',
        notes: 'Initial opening stock (low)',
      },
      {
        businessId: businessA.id,
        productId: p3.id,
        movementType: 'OPENING_STOCK',
        quantity: 45,
        beforeQuantity: 0,
        afterQuantity: 45,
        unitCost: 110.0,
        referenceType: 'OPENING_STOCK',
        notes: 'Initial opening stock',
      },
      {
        businessId: businessA.id,
        productId: p4.id,
        movementType: 'OPENING_STOCK',
        quantity: 12,
        beforeQuantity: 0,
        afterQuantity: 12,
        unitCost: 1750.0,
        referenceType: 'OPENING_STOCK',
        notes: 'Initial opening stock',
      },
    ],
  });

  // 5. Seed Customer & Initial Sale for Business A
  const customer1 = await prisma.customer.create({
    data: {
      businessId: businessA.id,
      name: 'Karthik Raman',
      phone: '+919876500001',
      vehicleNumber: 'TN 09 BX 4520',
      vehicleModel: 'Royal Enfield Classic 350 Stealth Black',
    },
  });

  const sale1 = await prisma.sale.create({
    data: {
      businessId: businessA.id,
      customerId: customer1.id,
      invoiceNumber: 'RSP-1001',
      saleDate: new Date(),
      subtotal: 520.0,
      discountAmount: 0.0,
      taxAmount: 0.0,
      grandTotal: 520.0,
      totalCostCOGS: 380.0,
      grossProfit: 140.0,
      grossMarginPercent: 26.92,
      amountPaid: 520.0,
      balanceDue: 0.0,
      paymentStatus: 'PAID',
      paymentMethod: 'UPI',
      items: {
        create: [
          {
            productId: p1.id,
            partNumber: p1.partNumber,
            productName: p1.name,
            quantity: 1,
            unitPrice: 520.0,
            unitCostAtSale: 380.0,
            totalAmount: 520.0,
            grossProfit: 140.0,
          },
        ],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      businessId: businessA.id,
      saleId: sale1.id,
      customerId: customer1.id,
      invoiceNumber: 'RSP-1001',
      customerName: customer1.name,
      customerPhone: customer1.phone,
      subtotal: 520.0,
      grandTotal: 520.0,
      amountPaid: 520.0,
      balanceDue: 0.0,
      paymentStatus: 'PAID',
      paymentMethod: 'UPI',
    },
  });

  await prisma.payment.create({
    data: {
      businessId: businessA.id,
      referenceType: 'SALE',
      referenceId: sale1.id,
      saleId: sale1.id,
      customerId: customer1.id,
      amount: 520.0,
      method: 'UPI',
      referenceNumber: 'UPI/987612345/TXN',
      status: 'COMPLETED',
    },
  });

  // Low stock notification
  await prisma.notification.create({
    data: {
      businessId: businessA.id,
      type: 'LOW_STOCK',
      title: 'Low Stock Warning',
      message: `Product "Clutch Cable Assembly" (145214/C) has 3 units remaining (Min Threshold: 8).`,
      linkUrl: `/app/products?id=${p2.id}`,
    },
  });

  // 6. Seed Product for Business B (Isolated Tenant B)
  await prisma.product.create({
    data: {
      businessId: businessB.id,
      name: 'Hyundai i20 Air Filter',
      partNumber: 'HY-AF-9901',
      mrp: 450.0,
      purchaseCost: 280.0,
      sellingPrice: 420.0,
      currentStock: 15,
      minStock: 5,
    },
  });

  console.log('✅ Database Seeding Completed Successfully!');
  console.log('Tenant A: owner.a@example.com / password123 (Royal Spares & Service Station)');
  console.log('Tenant B: owner.b@example.com / password123 (Apex Auto Parts Delhi)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
