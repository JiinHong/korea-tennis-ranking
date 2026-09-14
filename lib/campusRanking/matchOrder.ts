type OrderableMatch = {
  date: string;
  sequenceNo?: number;
};

function parseMatchDateValue(date: string): number {
  const numbers = date.match(/\d+/g)?.map(Number) ?? [];
  const [year, month, day] = numbers;

  if (!year || !month || !day) {
    return 0;
  }

  return new Date(year, month - 1, day).getTime();
}

function compareSequenceNo(a: OrderableMatch, b: OrderableMatch): number {
  if (a.sequenceNo === undefined || b.sequenceNo === undefined) {
    return 0;
  }

  return a.sequenceNo - b.sequenceNo;
}

export function compareMatchesChronological(
  a: OrderableMatch,
  b: OrderableMatch
): number {
  return (
    parseMatchDateValue(a.date) - parseMatchDateValue(b.date) ||
    compareSequenceNo(a, b)
  );
}

export function compareMatchesRecentFirst(
  a: OrderableMatch,
  b: OrderableMatch
): number {
  return (
    parseMatchDateValue(b.date) - parseMatchDateValue(a.date) ||
    compareSequenceNo(b, a)
  );
}
