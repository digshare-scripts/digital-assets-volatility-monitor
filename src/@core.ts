import ms from 'ms';

const CANDLES_INTERVAL = '5m';
const CANDLES_INTERVAL_MS = ms(CANDLES_INTERVAL);
const CANDLES_LIMIT = ms('24h') / CANDLES_INTERVAL_MS;

function CANDLES_API_URL(symbol: string): string {
  return `https://api.binance.com/api/v3/klines?${new URLSearchParams({
    symbol: `${symbol}USDT`,
    interval: CANDLES_INTERVAL,
    limit: CANDLES_LIMIT.toString(),
  })}`;
}

export interface AssetVolatility {
  maxVolatility: number;
  closePositiveVolatility: number;
  closeNegativeVolatility: number;
  close: string;
}

export async function getAssetVolatility(
  symbol: string,
): Promise<AssetVolatility> {
  console.log(CANDLES_API_URL(symbol));

  const candles = await fetch(CANDLES_API_URL(symbol)).then(
    response =>
      response.json() as Promise<
        [
          timestamp: number,
          open: string,
          high: string,
          low: string,
          close: string,
          volume: string,
        ][]
      >,
  );

  if ('msg' in candles) {
    throw new Error(`${symbol}: ${(candles as any).msg}`);
  }

  candles.reverse();

  const closeString = candles[0][4];
  const close = Number(closeString);

  let high = 0;
  let low = Infinity;

  let maxVolatility = 0;

  for (const candle of candles) {
    const candleHigh = Number(candle[2]);
    const candleLow = Number(candle[3]);

    high = Math.max(high, candleHigh);
    low = Math.min(low, candleLow);

    const positiveVolatility = (high - low) / low;
    const negativeVolatility = (low - high) / high;

    if (positiveVolatility > Math.abs(maxVolatility)) {
      maxVolatility = positiveVolatility;
    }

    if (-negativeVolatility > Math.abs(maxVolatility)) {
      maxVolatility = negativeVolatility;
    }
  }

  const closePositiveVolatility = Math.max((close - low) / low, 0);
  const closeNegativeVolatility = Math.min((close - high) / high, 0);

  return {
    maxVolatility,
    closePositiveVolatility,
    closeNegativeVolatility,
    close: closeString,
  };
}
