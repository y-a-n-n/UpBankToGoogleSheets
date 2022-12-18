import * as core from '@actions/core';
import GoogleSheetsUtil from './google-sheets-util';
import UpBankUtil from './up-bank-util';
import {flattenAndSplitTransactionsByMonth} from './transforms';

async function run(): Promise<void> {
  try {
    const syncFromDate = core.getInput('syncFromDate');
    const upApiKey = core.getInput('upApiKey');
    const googleSpreadsheetId = core.getInput('googleSpreadsheetId');

    core.info(`Syncing from date ${syncFromDate}`);

    const upBankUtil = new UpBankUtil(upApiKey);

    core.info(`Initialising google auth`);
    const googleSheetsUtil = new GoogleSheetsUtil(googleSpreadsheetId);
    await googleSheetsUtil.initAuth();

    core.info(`Fetching transactions`);
    const transactions = await upBankUtil.getTransactionsByMonthSinceDate(
      new Date(syncFromDate)
    );

    core.info(`Flattening transactions`);
    const transactionsByMonth =
      flattenAndSplitTransactionsByMonth(transactions);
    await googleSheetsUtil.syncTransactionsToSpreadsheet(transactionsByMonth);
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

run();
