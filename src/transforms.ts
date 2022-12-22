import {Transaction} from './up-bank-util';

export interface FlattenedTransaction {
  date: string;
  amount: string;
  desc: string;
  category: string;
}

export function flattenTransaction(
  transaction: Transaction
): FlattenedTransaction {
  return {
    date: transaction?.attributes?.createdAt,
    amount: transaction?.attributes?.amount?.value,
    desc: transaction?.attributes?.description,
    category: transaction?.relationships?.category?.data?.id,
  };
}

function getTransactionMonth(
  flattenedTransaction: FlattenedTransaction
): string {
  return flattenedTransaction.date?.substring(0, 7);
}

export function flattenAndSplitTransactionsByMonth(
  transactions: Transaction[]
): FlattenedTransaction[][] {
  const flattened = transactions.map(flattenTransaction);
  const months = flattened.map(getTransactionMonth);
  const transactionsByMonth: FlattenedTransaction[][] = [];
  for (const m of months) {
    const transactionsForMonth = flattened.filter(f => {
      return getTransactionMonth(f) === m;
    });
    transactionsByMonth.push(transactionsForMonth);
  }
  return transactionsByMonth;
}
