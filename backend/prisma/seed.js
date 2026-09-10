// ─── DB Seed Script ───────────────────────────────────────────────────────────
// Pre-populates ThreatBlocklist with known Indian scam UPI IDs, domains, phone numbers
// Run: node prisma/seed.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SEED_THREATS = [
  // Known scam UPI IDs (anonymized examples — replace with real reported ones)
  { type: 'upi', value: 'fraudpay@ybl', reportedCount: 47, verified: true, source: 'manual' },
  { type: 'upi', value: 'helpdesk.refund@paytm', reportedCount: 23, verified: true, source: 'manual' },
  { type: 'upi', value: 'support.kyc@oksbi', reportedCount: 31, verified: false, source: 'user_report' },
  { type: 'upi', value: 'cashback2024@ibl', reportedCount: 18, verified: false, source: 'user_report' },

  // Known scam domains
  { type: 'domain', value: 'kyc-update-sbi.in', reportedCount: 89, verified: true, source: 'manual' },
  { type: 'domain', value: 'sbi-netbanking-verify.com', reportedCount: 54, verified: true, source: 'manual' },
  { type: 'domain', value: 'hdfc-secure-login.xyz', reportedCount: 42, verified: true, source: 'manual' },
  { type: 'domain', value: 'paytm-cashback-offer.in', reportedCount: 67, verified: true, source: 'manual' },
  { type: 'domain', value: 'aadhaar-kyc-update.top', reportedCount: 35, verified: true, source: 'manual' },
  { type: 'domain', value: 'bescom-payment-portal.xyz', reportedCount: 29, verified: false, source: 'user_report' },
  { type: 'domain', value: 'rbi-reward-scheme.co.in', reportedCount: 51, verified: true, source: 'manual' },

  // Known scam phone numbers (examples)
  { type: 'phone', value: '9999999990', reportedCount: 22, verified: false, source: 'user_report' },
  { type: 'phone', value: '8888888880', reportedCount: 15, verified: false, source: 'user_report' },

  // Known phishing URLs
  { type: 'url', value: 'http://kyc-update-sbi.in/login', reportedCount: 44, verified: true, source: 'manual' },
  { type: 'url', value: 'https://hdfc-secure-login.xyz/verify', reportedCount: 33, verified: true, source: 'manual' },
];

async function main() {
  console.log('🌱  Seeding ThreatBlocklist...');

  let created = 0;
  let skipped = 0;

  for (const threat of SEED_THREATS) {
    try {
      await prisma.threatBlocklist.upsert({
        where: { value: threat.value },
        create: threat,
        update: { reportedCount: threat.reportedCount, verified: threat.verified },
      });
      created++;
    } catch (err) {
      console.warn(`  Skipped ${threat.value}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`✅  Seeded ${created} threats (${skipped} skipped)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
