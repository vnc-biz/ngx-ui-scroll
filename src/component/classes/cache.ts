import { Direction } from '../interfaces/direction';
import { Routines } from '../utils/domRoutines';
import { Item } from './item';

export class ItemCache {
  $index: number;
  nodeId: string;
  data: any; // todo: cache data only if it is permitted by settings

  params: DOMRect;

  constructor(item: Item) {
    this.$index = item.$index;
    this.nodeId = item.nodeId;
    this.data = item.data;
    this.params = item.getParams();
  }

  getEdge(direction: Direction, opposite?: boolean): number {
    return Routines.getRectEdge(this.params, direction, opposite);
  }
}

export class Cache {
  items: Array<ItemCache>;

  constructor() {
    this.items = [];
  }

  add(item: Item) {
    const found = this.items.find(i => i.$index === item.$index);
    if (found) {
      found.data = item.data;
      found.params = item.getParams();
    } else {
      // todo: do we need the list to be sorted? maybe an object?
      this.items.push(new ItemCache(item));
    }
  }

  get(index: number): ItemCache {
    return this.items.find(i => i.$index === index);
  }
}
