import { Scroller } from '../scroller';
import { ADAPTER_METHODS_PARAMS, validate } from '../utils/index';
import { Item } from '../classes/item';
import {
  Process, ProcessStatus, AdapterInsertOptions, ItemsPredicate, IAdapterValidatedMethodData
} from '../interfaces/index';

const { INSERT } = ADAPTER_METHODS_PARAMS;

export default class Insert {

  static run(scroller: Scroller, options: AdapterInsertOptions) {

    const methodData = validate(options, INSERT);
    if (!methodData.isValid) {
      scroller.logger.log(() => methodData.errors.join(', '));
      scroller.workflow.call({
        process: Process.insert,
        status: ProcessStatus.error,
        payload: { error: `Wrong argument of the "Adapter.insert" method call` }
      });
      return;
    }

    const next = Insert.doInsert(scroller, methodData);

    scroller.workflow.call({
      process: Process.insert,
      status: next ? ProcessStatus.next : ProcessStatus.done
    });
  }

  static doInsert(scroller: Scroller, methodData: IAdapterValidatedMethodData): boolean {
    const { buffer } = scroller;
    const { before, after, items, decrease } = methodData.params;
    const method: ItemsPredicate = before.isSet ? before.value : after.value;
    const found = buffer.items.find(item => method(item.get()));
    if (!found) {
      return false;
    }
    const decrement = decrease.isSet && decrease.value;
    return Insert.simulateFetch(scroller, found, items.value, before.isSet, decrement);
  }

  static simulateFetch(
    scroller: Scroller, from: Item, items: any[], before: boolean, decrement: boolean
  ): boolean {
    const { buffer, routines, state: { fetch, clip } } = scroller;
    const bufferLimit = decrement ? buffer.absMinIndex : buffer.absMaxIndex;
    const addition = before ? 0 : 1;
    const count = items.length;
    const itemsToInsert = items.map((item: any, i: number) =>
      new Item(from.$index + i + addition - (decrement ? count : 0), item, routines)
    );
    buffer.insertItems(itemsToInsert, from, addition, decrement);
    scroller.logger.log(() => {
      const newBufferLimit = decrement ? buffer.absMinIndex : buffer.absMaxIndex;
      const token = decrement ? 'absMinIndex' : 'absMaxIndex';
      return `buffer.${token} value has been changed from ${bufferLimit} to ${newBufferLimit}`;
    });
    fetch.insert(itemsToInsert);
    fetch.firstIndexBuffer = buffer.firstIndex;
    fetch.lastIndexBuffer = buffer.lastIndex;
    clip.noClip = true;
    return true;
  }

}
