import { Observable } from 'rxjs/Observable';

import { DemoContext } from './interfaces';

const doLog = (demoContext: DemoContext, index: number, count: number, resolved: number) =>
  demoContext.log =
    `${++demoContext.count}) got ${resolved} items [${index}, ${index + count - 1}]\n`
    + demoContext.log;

export const datasourceGetInfinite =
  (demoContext: DemoContext, index: number, count: number) => {
    const data = [];
    for (let i = index; i <= index + count - 1; i++) {
      data.push({ id: i, text: 'item #' + i });
    }
    doLog(demoContext, index, count, data.length);
    return data;
  };

export const datasourceGetLimited =
  (demoContext: DemoContext, min: number, max: number, index: number, count: number) => {
    min = isNaN(Number(min)) ? Number.NEGATIVE_INFINITY : Number(min);
    max = isNaN(Number(max)) ? Number.POSITIVE_INFINITY : Number(max);
    const data = [];
    const start = Math.max(min, index);
    const end = Math.min(index + count - 1, max);
    if (start <= end) {
      for (let i = start; i <= end; i++) {
        data.push({ id: i, text: 'item #' + i, height: 20 + i });
      }
    }
    doLog(demoContext, index, count, data.length);
    return data;
  };

export const datasourceGetObservableInfinite = (index, count) =>
  Observable.create(observer =>
    observer.next(this.datasourceGetInfinite(index, count))
  );

export const datasourceGetPromiseInfinite = (index, count) =>
  new Promise(success =>
    success(this.datasourceGetInfinite(index, count))
  );

export const datasourceGetCallbackInfinite = (demoContext: DemoContext) =>
  (index: number, count: number, success: Function) =>
    success(this.datasourceGetInfinite(demoContext, index, count));

export const datasourceGetCallbackLimited = (demoContext: DemoContext, min: number, max: number) =>
  (index: number, count: number, success: Function) =>
    success(this.datasourceGetLimited(demoContext, min, max, index, count));
