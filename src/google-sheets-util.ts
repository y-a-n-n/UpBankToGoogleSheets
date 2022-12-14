import * as core from '@actions/core';
import {FlattenedTransaction} from './transforms';
import {GoogleAuth} from 'google-auth-library';
import {sheets_v4 as sheets} from 'googleapis';
import Sheets = sheets.Sheets;

const COLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export default class GoogleSheetsUtil {
  _spreadsheetId: string;
  _sheets?: Sheets;
  _targetSpreadsheet?: sheets.Schema$Spreadsheet;
  constructor(spreadsheetId: string) {
    this._spreadsheetId = spreadsheetId;
  }

  async initAuth(): Promise<void> {
    const auth = new GoogleAuth({
      keyFilename: '.keys/gapi.json',
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });
    const client = await auth.getClient();
    this._sheets = new sheets.Sheets({auth: client});
    const result = await this._sheets.spreadsheets.get({
      spreadsheetId: this._spreadsheetId,
    });
    this._targetSpreadsheet = result.data;
  }

  private async getExistingSheets(): Promise<
    sheets.Schema$Sheet[] | undefined
  > {
    core.info('getExistingSheets');
    return this._targetSpreadsheet?.sheets;
  }

  private async createSheet(targetSheetName: string): Promise<number> {
    core.info(`createSheet ${targetSheetName}`);
    const duplicateSheetRequest: sheets.Schema$DuplicateSheetRequest = {
      sourceSheetId: 0,
      insertSheetIndex: 0,
      newSheetName: targetSheetName,
    };
    await this._sheets?.spreadsheets?.batchUpdate({
      spreadsheetId: this._spreadsheetId,
      requestBody: {
        requests: [{duplicateSheet: duplicateSheetRequest}],
      },
    });
    return 0;
  }

  private async getOrCreateSheetForDate(date: string): Promise<string> {
    core.info(`getOrCreateSheetForDate ${date}`);
    const existingSheets = await this.getExistingSheets();
    const targetSheetName = date.substring(0, 7);
    const targetSheet = existingSheets?.find(
      sheet => sheet.properties?.title === targetSheetName
    );
    if (!targetSheet) {
      await this.createSheet(targetSheetName);
    }
    return targetSheetName;
  }

  private async writeHeader(startCol: string, endCol: string): Promise<void> {
    await this._sheets?.spreadsheets.values.update({
      spreadsheetId: this._spreadsheetId,
      range: `${startCol}1:${endCol}1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['Date', 'Amount', 'Merchant', 'Category']],
      },
    });
  }

  private async pushToSheet(
    targetSheetName: string,
    transactions: FlattenedTransaction[],
    columnOffset: number
  ): Promise<void> {
    core.info(`pushToSheet ${targetSheetName}`);

    const startCol = COLS[columnOffset * 4];
    const endCol = COLS[columnOffset * 4 + 3];
    await this.writeHeader(startCol, endCol);
    await this._sheets?.spreadsheets.values.clear({
      spreadsheetId: this._spreadsheetId,
      range: `${targetSheetName}!${startCol}2:${endCol}1000`,
    });
    const numRows = transactions.length;
    const rangeToWrite = `'${targetSheetName}'!${startCol}2:${endCol}${
      numRows + 2
    }`;
    core.info(`rangeToWrite ${rangeToWrite}`);
    const rows = transactions.map(r => [r.date, r.amount, r.desc, r.category]);
    await this._sheets?.spreadsheets.values.update({
      spreadsheetId: this._spreadsheetId,
      range: rangeToWrite,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows,
      },
    });
  }

  async syncTransactionsToSpreadsheet(
    transactionByMonth: FlattenedTransaction[][],
    columnOffset: number
  ): Promise<void> {
    core.info(`transactionByMonth ${transactionByMonth.length}`);
    core.info(`Pushing to spreadsheet ${this._spreadsheetId}`);
    for (const tbm of transactionByMonth) {
      const sheetId = await this.getOrCreateSheetForDate(tbm[0].date);
      await this.pushToSheet(sheetId, tbm, columnOffset);
    }
  }
}
