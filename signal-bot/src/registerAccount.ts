import 'dotenv/config';
import MetaApi from 'metaapi.cloud-sdk';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const token = process.env.METAAPI_TOKEN;
  if (!token) {
    console.error('❌ Error: METAAPI_TOKEN is not set in the .env file!');
    process.exit(1);
  }

  console.log('🤖 MetaAPI Account Manager — FTMO Demo Registration');
  console.log(`Token prefix: ${token.substring(0, 20)}...`);

  const api = new MetaApi(token);

  try {
    // Check if account already exists via infinite scroll pagination
    console.log('Checking for existing accounts...');
    const existingAccounts = await api.metatraderAccountApi.getAccountsWithInfiniteScrollPagination();

    const existing = existingAccounts.find(
      (acc: any) => acc.login === '1513486272' && acc.server === 'FTMO-Demo'
    );

    let accountId: string;

    if (existing) {
      accountId = existing.id;
      console.log(`✨ Account already registered! ID: ${accountId}`);
    } else {
      console.log('Registering FTMO Demo MT5 account with MetaAPI...');
      const created = await api.metatraderAccountApi.createAccount({
        name: 'FTMO Demo - Trading Bangla',
        type: 'cloud-g1',        // G1 = free tier
        login: '1513486272',
        password: '2M3!2j5Zn@49w5',
        server: 'FTMO-Demo',
        platform: 'mt5',
        magic: 0,
        reliability: 'regular',  // must be explicit — default is 'high' (paid)
        quoteStreamingIntervalInSeconds: 2.5,
        keywords: ['FTMO'],
      });
      accountId = created.id;
      console.log(`✅ Account created! ID: ${accountId}`);
    }

    // Retrieve account instance and deploy if needed
    const accInstance = await api.metatraderAccountApi.getAccount(accountId);
    const state = accInstance.state;
    console.log(`Account state: ${state}`);

    if (state === 'DRAFT' || state === 'UNDEPLOYED') {
      console.log('Deploying account...');
      await accInstance.deploy();
      console.log('Deployment initiated!');
    }

    // Update .env with the account ID
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      const regex = /^MT5_ACCOUNT_ID=.*$/m;
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `MT5_ACCOUNT_ID=${accountId}`);
      } else {
        envContent += `\nMT5_ACCOUNT_ID=${accountId}`;
      }
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log(`📝 Updated .env: MT5_ACCOUNT_ID=${accountId}`);
    }

    console.log('\n🎉 Done! MT5 account is registered and deploying.');
    console.log('Run "npm run dev" to start the signal bot.');
  } catch (err: any) {
    console.error('❌ Error:', err.message || err);
    if (err.details) console.error('Details:', err.details);
    process.exit(1);
  }
}

main();
