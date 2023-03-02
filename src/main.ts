import * as core from '@actions/core';
import GoogleSheetsUtil from './google-sheets-util';
import UpBankUtil from './up-bank-util';
import {flattenAndSplitTransactionsByMonth} from './transforms';

let googleSheetsUtil: GoogleSheetsUtil;

async function processAccount(
  upBankApikey: string,
  columnOffset: number,
  syncFromDate: Date
): Promise<void> {
  const upBankUtil = new UpBankUtil(upBankApikey);
  core.info(`Fetching transactions`);
  const transactions = await upBankUtil.getTransactionsByMonthSinceDate(
    syncFromDate
  );

  core.info(`Flattening ${transactions.length} transactions`);
  const transactionsByMonth = flattenAndSplitTransactionsByMonth(transactions);
  await googleSheetsUtil.syncTransactionsToSpreadsheet(
    transactionsByMonth,
    columnOffset
  );
}

async function run(): Promise<void> {
  try {
    const syncFromDate = core.getInput('syncFromDate');
    const upApiKey1 = core.getInput('upApiKey1');
    const upApiKey2 = core.getInput('upApiKey2');
    const googleSpreadsheetId = core.getInput('googleSpreadsheetId');

    core.info(`Syncing from date ${syncFromDate}`);

    core.info(`Initialising google auth`);
    googleSheetsUtil = new GoogleSheetsUtil(googleSpreadsheetId);
    await googleSheetsUtil.initAuth();

    const date = new Date(syncFromDate);

    const accountKeys = [upApiKey1];
    if (upApiKey2) {
      accountKeys.push(upApiKey2);
    }
    for (const key of accountKeys) {
      const i = accountKeys.indexOf(key);
      await googleSheetsUtil.updateSheetsList();
      await processAccount(key, i, date);
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

run();
