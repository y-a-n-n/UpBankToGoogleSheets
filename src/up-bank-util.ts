import * as core from '@actions/core';
import axios, {AxiosResponse} from 'axios';

// https://developer.up.com.au/#get_transactions
export interface Transaction {
  attributes: {
    description: string;
    message: string;
    amount: {
      currencyCode: string;
      value: string;
    };
    createdAt: string;
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

  async transactionsFromResponse(
    response: AxiosResponse
  ): Promise<Transaction[]> {
    const transactions: Transaction[] = [];
    const value = (await response.data) as {
      data: Transaction[];
      links: {next?: string};
    };
    transactions.concat(value.data);
    if (value.links.next) {
      transactions.concat(await this.followNextLink(value.links.next));
    }
    return transactions;
  }

  async followNextLink(nextLink: string): Promise<Transaction[]> {
    const response = await axios.get(nextLink, {
      headers: {
        Authorization: `Bearer ${this._upBankApiKey}`,
      },
    });
    return this.transactionsFromResponse(response);
  }

  async getTransactionsByMonthSinceDate(date: Date): Promise<Transaction[]> {
    core.info(`Getting transactions since ${date}`);
    const response = await axios.get(
      `https://api.up.com.au/api/v1/transactions?filter[since]=${date.toISOString()}`,
      {
        headers: {
          Authorization: `Bearer ${this._upBankApiKey}`,
        },
      }
    );
    return this.transactionsFromResponse(response);
  }
}
