import fetch from 'node-fetch';

function CANDLES_API_URL(symbol: string, duration: number): string {
  let start = new Date(Date.now() - duration).toISOString();

  return `https://okcoin.vilicvane.workers.dev/api/spot/v3/instruments/${symbol}-USD/candles?granularity=300&start=${start}`;
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
  let candles = await fetch(CANDLES_API_URL(symbol, 24 * 3600 * 1000)).then(
    response => response.json() as Promise<string[]>,
  );

  if ('error_message' in candles) {
    console.error(symbol, candles);
    throw new Error((candles as any).error_message);
  }

  let closeString = candles[0][4];
  let close = Number(closeString);

  let high = 0;
  let low = Infinity;

  let maxVolatility = 0;

  for (let candle of candles) {
    let candleHigh = Number(candle[2]);
    let candleLow = Number(candle[3]);

    high = Math.max(high, candleHigh);
    low = Math.min(low, candleLow);

    let positiveVolatility = (high - low) / low;
    let negativeVolatility = (low - high) / high;

    if (positiveVolatility > Math.abs(maxVolatility)) {
      maxVolatility = positiveVolatility;
    }

    if (-negativeVolatility > Math.abs(maxVolatility)) {
      maxVolatility = negativeVolatility;
    }
  }

  let closePositiveVolatility = Math.max((close - low) / low, 0);
  let closeNegativeVolatility = Math.min((close - high) / high, 0);

  return {
    maxVolatility,
    closePositiveVolatility,
    closeNegativeVolatility,
    close: closeString,
  };
}
