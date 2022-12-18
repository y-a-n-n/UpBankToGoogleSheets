import * as core from '@actions/core';
import axios from 'axios';

// https://developer.up.com.au/#get_transactions
export interface Transaction {
  attributes: {
    description: string;
    message: string;
    amount: {
      currencyCode: string;
      value: string;
    };
    settledAt: Date;
  };
  relationships: {
    category: {
      data: {
        id: string;
      };
    };
  };
}

export default class UpBankUtil {
  private _upBankApiKey;

  constructor(upBankApiKey: string) {
    this._upBankApiKey = upBankApiKey;
  }
  async getTransactionsByMonthSinceDate(date: Date): Promise<Transaction[]> {
    core.info(`Getting transactions since ${date}`);
    const response = await axios.get(
      `https://api.up.com.au/api/v1/transactions?filter[since]=${date.toISOString()}`,
      {
        headers: {
          Authorization: 'Bearer x',
        },
      }
    );
    const body = (await response.data) as {data: Transaction[]};
    return body.data;
  }
}
