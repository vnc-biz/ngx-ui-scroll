import { BehaviorSubject, Subject } from 'rxjs';

import { Direction } from '../interfaces/index';
import { Cache } from './cache';
import { Item } from './item';
import { Settings } from './settings';
import { Logger } from './logger';

export class Buffer {

  private _items: Item[];
  private _absMinIndex: number;
  private _absMaxIndex: number;
  private _bof: boolean;
  private _eof: boolean;

  $items: BehaviorSubject<Item[]>;
  bofSource: Subject<boolean>;
  eofSource: Subject<boolean>;

  cache: Cache;
  minIndexUser: number;
  maxIndexUser: number;

  private startIndex: number;
  private pristine: boolean;
  readonly minBufferSize: number;
  readonly logger: Logger;

  constructor(settings: Settings, startIndex: number, logger: Logger, $items?: BehaviorSubject<Item[]>) {
    this.$items = $items || new BehaviorSubject<Item[]>([]);
    this.bofSource = new Subject<boolean>();
    this.eofSource = new Subject<boolean>();
    this.cache = new Cache(settings.itemSize, logger);
    this.minIndexUser = settings.minIndex;
    this.maxIndexUser = settings.maxIndex;
    this.reset();
    this.startIndex = startIndex;
    this.minBufferSize = settings.bufferSize;
    this.logger = logger;
  }

  dispose(forever?: boolean) {
    this.bofSource.complete();
    this.eofSource.complete();
    if (forever) {
      this.$items.complete();
    }
  }

  reset(reload?: boolean, startIndex?: number) {
    if (reload) {
      this.items.forEach(item => item.hide());
    }
    this.pristine = true;
    this.items = [];
    this.cache.reset();
    this.absMinIndex = this.minIndexUser;
    this.absMaxIndex = this.maxIndexUser;
    if (typeof startIndex !== 'undefined') {
      this.startIndex = startIndex;
    }
    this._bof = false;
    this._eof = false;
    this.pristine = false;
  }

  set items(items: Item[]) {
    this._items = items;
    this.$items.next(items);
    if (!this.pristine) {
      this.checkBOF();
      this.checkEOF();
    }
  }

  get items(): Item[] {
    return this._items;
  }

  set absMinIndex(value: number) {
    if (this._absMinIndex !== value) {
      this._absMinIndex = value;
    }
    if (!this.pristine) {
      this.checkBOF();
    }
  }

  get absMinIndex(): number {
    return this._absMinIndex;
  }

  set absMaxIndex(value: number) {
    if (this._absMaxIndex !== value) {
      this._absMaxIndex = value;
    }
    if (!this.pristine) {
      this.checkEOF();
    }
  }

  get absMaxIndex(): number {
    return this._absMaxIndex;
  }

  get bof(): boolean {
    return this._bof;
  }

  get eof(): boolean {
    return this._eof;
  }

  private checkBOF() {
    // since bof has no setter, need to call checkBOF() on items and absMinIndex change
    const bof = this.items.length
      ? (this.items[0].$index === this.absMinIndex)
      : isFinite(this.absMinIndex);
    if (this._bof !== bof) {
      this._bof = bof;
      this.bofSource.next(bof);
    }
  }

  private checkEOF() {
    // since eof has no setter, need to call checkEOF() on items and absMaxIndex change
    const eof = this.items.length
      ? (this.items[this.items.length - 1].$index === this.absMaxIndex)
      : isFinite(this.absMaxIndex);
    if (this._eof !== eof) {
      this._eof = eof;
      this.eofSource.next(eof);
    }
  }

  get size(): number {
    return this._items.length;
  }

  get averageSize(): number {
    return this.cache.averageSize;
  }

  get hasItemSize(): boolean {
    return this.averageSize !== void 0;
  }

  get minIndex(): number {
    return isFinite(this.cache.minIndex) ? this.cache.minIndex : this.startIndex;
  }

  get maxIndex(): number {
    return isFinite(this.cache.maxIndex) ? this.cache.maxIndex : this.startIndex;
  }

  get firstIndex(): number | null {
    return this.items.length ? this.items[0].$index : null;
  }

  get lastIndex(): number | null {
    return this.items.length ? this.items[this.items.length - 1].$index : null;
  }

  get($index: number): Item | undefined {
    return this.items.find((item: Item) => item.$index === $index);
  }

  setItems(items: Item[]): boolean {
    if (!this.items.length) {
      this.items = [...items];
    } else if (this.items[0].$index > items[items.length - 1].$index) {
      this.items = [...items, ...this.items];
    } else if (items[0].$index > this.items[this.items.length - 1].$index) {
      this.items = [...this.items, ...items];
    } else {
      return false;
    }
    return true;
  }

  append(items: Item[]) {
    this.items = [...this.items, ...items];
  }

  prepend(items: Item[]) {
    this.items = [...items, ...this.items];
  }

  removeItem(item: Item) {
    const items = this.items.filter(({ $index }: Item) => $index !== item.$index);
    items.forEach((_item: Item) => {
      if (_item.$index > item.$index) {
        _item.$index--;
        _item.nodeId = String(_item.$index);
      }
    });
    this.absMaxIndex--; // todo: perhaps we want to reduce absMinIndex in some cases
    this.items = items;
    this.cache.removeItem(item.$index);
  }

  insertItems(items: Item[], from: Item, addition: number, decrement: boolean) {
    const count = items.length;
    const index = this.items.indexOf(from) + addition;
    const itemsBefore = this.items.slice(0, index);
    const itemsAfter = this.items.slice(index);
    if (decrement) {
      itemsBefore.forEach((item: Item) => item.updateIndex(item.$index - count));
    } else {
      itemsAfter.forEach((item: Item) => item.updateIndex(item.$index + count));
    }
    const result = <Item[]>[
      ...itemsBefore,
      ...items,
      ...itemsAfter
    ];
    if (decrement) {
      this.absMinIndex -= count;
    } else {
      this.absMaxIndex += count;
    }
    this.items = result;
    this.cache.insertItems(from.$index + addition, count, decrement);
  }

  getFirstVisibleItemIndex(): number {
    const length = this.items.length;
    for (let i = 0; i < length; i++) {
      if (!this.items[i].invisible) {
        return i;
      }
    }
    return -1;
  }

  getLastVisibleItemIndex(): number {
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (!this.items[i].invisible) {
        return i;
      }
    }
    return -1;
  }

  getFirstVisibleItem(): Item | undefined {
    const index = this.getFirstVisibleItemIndex();
    if (index >= 0) {
      return this.items[index];
    }
  }

  getLastVisibleItem(): Item | undefined {
    const index = this.getLastVisibleItemIndex();
    if (index >= 0) {
      return this.items[index];
    }
  }

  getEdgeVisibleItem(direction: Direction, opposite?: boolean): Item | undefined {
    return direction === (!opposite ? Direction.forward : Direction.backward) ?
      this.getLastVisibleItem() : this.getFirstVisibleItem();
  }

  getVisibleItemsCount(): number {
    return this.items.reduce((acc: number, item: Item) => acc + (item.invisible ? 0 : 1), 0);
  }

  getSizeByIndex(index: number): number {
    const item = this.cache.get(index);
    return item ? item.size : this.averageSize;
  }

  checkAverageSize(): boolean {
    return this.cache.recalculateAverageSize();
  }

  getIndexToAppend(eof?: boolean): number {
    return (!eof ? (this.size ? this.items[this.size - 1].$index : this.maxIndex) : this.absMaxIndex) + (this.size ? 1 : 0);
  }

  getIndexToPrepend(bof?: boolean): number {
    return (!bof ? (this.size ? this.items[0].$index : this.minIndex) : this.absMinIndex) - (this.size ? 1 : 0);
  }

  getIndexToAdd(eof: boolean, prepend: boolean): number {
    return prepend ? this.getIndexToPrepend(eof) : this.getIndexToAppend(eof);
  }

}
