import { Scroller } from '../scroller';
import { Process, ProcessStatus, Direction } from '../interfaces/index';

export default class PreFetch {

  static run(scroller: Scroller, process: Process) {
    const { workflow, buffer, state: { fetch } } = scroller;
    scroller.state.preFetchPosition = scroller.viewport.scrollPosition;
    fetch.minIndex = buffer.minIndex;
    fetch.averageItemSize = buffer.averageSize || 0;

    // calculate size before start index
    PreFetch.setStartDelta(scroller);

    // set first and last indexes to fetch
    PreFetch.setFetchIndexes(scroller);

    // skip indexes that are in buffer
    PreFetch.skipBufferedItems(scroller);

    if (scroller.settings.infinite) {
      // fill indexes to include buffer if no clip
      PreFetch.checkBufferGaps(scroller);
    }

    // add indexes if there are too few items to fetch (clip padding)
    PreFetch.checkFetchPackSize(scroller);

    // set fetch direction
    PreFetch.setFetchDirection(scroller);

    if (fetch.shouldFetch) {
      scroller.logger.log(() => `going to fetch ${fetch.count} items started from index ${fetch.index}`);
    }

    workflow.call({
      process: Process.preFetch,
      status: fetch.shouldFetch ? ProcessStatus.next : ProcessStatus.done,
      payload: { ...(process ? { process } : {}) }
    });
  }

  static setStartDelta(scroller: Scroller) {
    const { buffer, viewport } = scroller;
    viewport.startDelta = 0;
    if (!buffer.hasItemSize) {
      return;
    }
    const minIndex = isFinite(buffer.absMinIndex) ? buffer.absMinIndex : buffer.minIndex;
    for (let index = minIndex; index < scroller.state.startIndex; index++) {
      const item = buffer.cache.get(index);
      viewport.startDelta += item ? item.size : buffer.averageSize;
    }
    if (scroller.settings.windowViewport) {
      viewport.startDelta += viewport.getOffset();
    }
    scroller.logger.log(() => `start delta is ${viewport.startDelta}`);
  }

  static setFetchIndexes(scroller: Scroller) {
    const { state, viewport } = scroller;
    const paddingDelta = viewport.getBufferPadding();
    const relativePosition = state.preFetchPosition - viewport.startDelta;
    const startPosition = relativePosition - paddingDelta;
    const endPosition = relativePosition + viewport.getSize() + paddingDelta;
    const firstIndexPosition =
      PreFetch.setFirstIndexBuffer(scroller, startPosition);
    PreFetch.setLastIndexBuffer(scroller, firstIndexPosition, endPosition);
    scroller.logger.fetch();
  }

  static setFirstIndexBuffer(scroller: Scroller, startPosition: number): number {
    const { state, buffer, state: { fetch } } = scroller;
    let firstIndex = state.startIndex;
    let firstIndexPosition = 0;
    if (scroller.state.isInitialLoop) {
      scroller.logger.log(`skipping fetch backward direction [initial loop]`);
    } else if (!buffer.hasItemSize) {
      scroller.logger.log(`skipping fetch backward direction [no item size]`);
    } else {
      let position = firstIndexPosition;
      let index = firstIndex;
      while (1) {
        if (startPosition >= 0) {
          const size = buffer.getSizeByIndex(index);
          const diff = (position + size) - startPosition;
          if (diff > 0) {
            firstIndex = index;
            firstIndexPosition = position;
            break;
          }
          position += size;
          index++;
          if (index < buffer.absMinIndex) {
            break;
          }
        }
        if (startPosition < 0) {
          index--;
          if (index < buffer.absMinIndex) {
            break;
          }
          position -= buffer.getSizeByIndex(index);
          const diff = position - startPosition;
          firstIndex = index;
          firstIndexPosition = position;
          if (diff <= 0) {
            break;
          }
        }
      }
    }
    fetch.firstIndex = fetch.firstIndexBuffer = Math.max(firstIndex, buffer.absMinIndex);
    return firstIndexPosition;
  }

  static setLastIndexBuffer(scroller: Scroller, startPosition: number, endPosition: number) {
    const { state, buffer, settings, state: { fetch } } = scroller;
    let lastIndex;
    if (!buffer.hasItemSize) {
      // just to fetch forward bufferSize items if neither averageItemSize nor itemSize are present
      lastIndex = state.startIndex + settings.bufferSize - 1;
      scroller.logger.log(`forcing fetch forward direction [no item size]`);
    } else {
      let index = <number>fetch.firstIndexBuffer;
      let position = startPosition;
      lastIndex = index;
      while (1) {
        lastIndex = index;
        position += buffer.getSizeByIndex(index);
        if (position >= endPosition) {
          break;
        }
        if (index++ > buffer.absMaxIndex) {
          break;
        }
      }
    }
    fetch.lastIndex = fetch.lastIndexBuffer = Math.min(lastIndex, buffer.absMaxIndex);
  }

  static skipBufferedItems(scroller: Scroller) {
    const { buffer } = scroller;
    if (!buffer.size) {
      return;
    }
    const { fetch } = scroller.state;
    const firstIndex = <number>fetch.firstIndex;
    const lastIndex = <number>fetch.lastIndex;
    const packs: Array<Array<number>> = [[]];
    let p = 0;
    for (let i = firstIndex; i <= lastIndex; i++) {
      if (!buffer.get(i)) {
        packs[p].push(i);
      } else if (packs[p].length) {
        packs[++p] = [];
      }
    }
    let pack = packs[0];
    if (packs[0].length && packs[1] && packs[1].length) {
      fetch.hasAnotherPack = true;
      // todo: need to look for biggest pack in visible area
      // todo: or think about merging two requests in a single Fetch process
      if (packs[1].length >= packs[0].length) {
        pack = packs[1];
      }
    }
    fetch.firstIndex = Math.max(pack[0], buffer.absMinIndex);
    fetch.lastIndex = Math.min(pack[pack.length - 1], buffer.absMaxIndex);
    if (fetch.firstIndex !== firstIndex || fetch.lastIndex !== lastIndex) {
      scroller.logger.fetch('after Buffer flushing');
    }
  }

  static checkBufferGaps(scroller: Scroller) {
    const { buffer, state: { fetch } } = scroller;
    if (!buffer.size) {
      return;
    }
    const fetchFirst = <number>fetch.firstIndex;
    const bufferLast = <number>buffer.lastIndex;
    if (fetchFirst > bufferLast) {
      fetch.firstIndex = fetch.firstIndexBuffer = bufferLast + 1;
    }
    const bufferFirst = <number>buffer.firstIndex;
    const fetchLast = <number>fetch.lastIndex;
    if (fetchLast < bufferFirst) {
      fetch.lastIndex = fetch.lastIndexBuffer = bufferFirst - 1;
    }
    if (fetch.firstIndex !== fetchFirst || fetch.lastIndex !== fetchLast) {
      scroller.logger.fetch('after Buffer filling (no clip case)');
    }
  }

  static checkFetchPackSize(scroller: Scroller) {
    const { buffer, state: { fetch } } = scroller;
    if (!fetch.shouldFetch) {
      return;
    }
    const firstIndex = <number>fetch.firstIndex;
    const lastIndex = <number>fetch.lastIndex;
    const diff = scroller.settings.bufferSize - (lastIndex - firstIndex + 1);
    if (diff <= 0) {
      return;
    }
    if (!buffer.size || lastIndex > buffer.items[0].$index) { // forward
      const newLastIndex = Math.min(lastIndex + diff, buffer.absMaxIndex);
      if (newLastIndex > lastIndex) {
        fetch.lastIndex = fetch.lastIndexBuffer = newLastIndex;
      }
    } else {
      const newFirstIndex = Math.max(firstIndex - diff, buffer.absMinIndex);
      if (newFirstIndex < firstIndex) {
        fetch.firstIndex = fetch.firstIndexBuffer = newFirstIndex;
      }
    }
    if (fetch.firstIndex !== firstIndex || fetch.lastIndex !== lastIndex) {
      scroller.logger.fetch('after bufferSize adjustment');
      PreFetch.skipBufferedItems(scroller);
    }
  }

  static setFetchDirection(scroller: Scroller) {
    const { buffer, state: { fetch } } = scroller;
    if (fetch.lastIndex) {
      let direction = Direction.forward;
      if (buffer.size) {
        direction = fetch.lastIndex < buffer.items[0].$index ? Direction.backward : Direction.forward;
      }
      fetch.direction = direction;
      scroller.logger.log(() => `fetch direction is "${direction}"`);
    }
  }

}
