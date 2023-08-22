import {script} from '@digshare/script';

import {getAssetVolatility} from './@core';
import {getPercentageString} from './@utils';

const MUTE_DURATION = 24 * 3600 * 1000;

const SYMBOLS = ['BTC', 'ETH', 'LTC'];

const VOLATILITY_THRESHOLD_STEP = 0.05;

interface State {
  mutes?: Record<
    string,
    | {
        threshold: number;
        before: number;
      }
    | undefined
  >;
}

export default script<State>(async ({mutes = {}} = {}) => {
  let now = Date.now();

  let messages: string[] = [];
  let tags: string[] = [];

  for (let symbol of SYMBOLS) {
    let {
      maxVolatility,
      closePositiveVolatility,
      closeNegativeVolatility,
      close,
    } = await getAssetVolatility(symbol);

    let mute = mutes[symbol];

    if (mute && mute.before < now) {
      mute = undefined;
    }

    let {threshold} = mute ?? {
      threshold: VOLATILITY_THRESHOLD_STEP,
      before: 0,
    };

    if (maxVolatility < threshold) {
      continue;
    }

    let icon = closePositiveVolatility > -closeNegativeVolatility ? '📈' : '📉';

    messages.push(
      `${icon} ${symbol} 24 小时内最大波动 ${getPercentageString(
        maxVolatility,
      )}。当前价格 ${Number(close).toFixed(
        2,
      )} 美元：相比 24 小时内最低上涨 ${getPercentageString(
        closePositiveVolatility,
      )}，相比 24 小时内最高下跌 ${getPercentageString(
        closeNegativeVolatility,
      )}。`,
    );

    tags.push(symbol);

    mutes[symbol] = {
      threshold:
        (Math.floor(maxVolatility / VOLATILITY_THRESHOLD_STEP) + 1) *
        VOLATILITY_THRESHOLD_STEP,
      before: now + MUTE_DURATION,
    };
  }

  if (messages.length === 0) {
    console.info('没有发现新的超阈值波动');
    return;
  }

  return {
    message: {
      tags,
      content: messages.join('\n\n'),
    },
    state: {
      mutes,
    },
  };
});
