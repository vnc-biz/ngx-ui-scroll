import { Direction } from '../src/component/interfaces/direction';
import { makeTest } from './scaffolding/runner';

const singleForwardMaxScrollConfigList = [{
  datasourceSettings: { startIndex: 100, bufferSize: 4, padding: 0.22 },
  templateSettings: { viewportHeight: 71 },
  custom: { direction: Direction.forward }
}, {
  datasourceSettings: { startIndex: 1, bufferSize: 5, padding: 0.2 },
  templateSettings: { viewportHeight: 100 },
  custom: { direction: Direction.forward }
}, {
  datasourceSettings: { startIndex: -15, bufferSize: 12, padding: 0.98 },
  templateSettings: { viewportHeight: 66 },
  custom: { direction: Direction.forward }
}];

const singleBackwardMaxScrollConfigList =
  singleForwardMaxScrollConfigList.map(config => ({
    ...config,
    custom: {
      ...config.custom,
      direction: Direction.backward
    }
  }));

const massForwardScrollsConfigList = [{
  datasourceSettings: { startIndex: 1, bufferSize: 4, padding: 0.25 },
  templateSettings: { viewportHeight: 100 },
  custom: { direction: Direction.forward, count: 3 }
}, {
  datasourceSettings: { startIndex: 45, bufferSize: 14, padding: 1.25 },
  templateSettings: { viewportHeight: 120 },
  custom: { direction: Direction.forward, count: 4 }
}, {
  datasourceSettings: { startIndex: -24, bufferSize: 6, padding: 0.52 },
  templateSettings: { viewportHeight: 185 },
  custom: { direction: Direction.forward, count: 5 }
}];

const massBackwardScrollsConfigList =
  singleForwardMaxScrollConfigList.map(config => ({
    ...config,
    custom: {
      ...config.custom,
      direction: Direction.backward
    }
  }));

const doScrollMax = (config, misc) => {
  if (config.custom.direction === Direction.forward) {
    misc.scrollMax();
  } else {
    misc.scrollMin();
  }
};

const calculateIt = (config, misc) => {
  const bufferSize = config.datasourceSettings.bufferSize;
  const padding = config.datasourceSettings.padding;
  const viewportSize = config.templateSettings.viewportHeight;
  const direction = config.custom.direction;

  const _forward = direction === Direction.forward;
  const _paddingSize = misc.workflow.viewport.padding[direction].size;
  const _edgeItemIndex = misc.workflow.buffer.getEdgeVisibleItem(direction).$index;

  const sizeToFill = _paddingSize + padding * viewportSize;
  const itemsToFill = Math.ceil(sizeToFill / misc.itemHeight);
  const fetchCount = Math.ceil(itemsToFill / bufferSize);
  const fetchedItemsCount = fetchCount * bufferSize;
  const itemsToClip = fetchedItemsCount - itemsToFill;
  const sizeToClip = itemsToClip * misc.itemHeight;
  const edgeItemIndex = _edgeItemIndex + (_forward ? 1 : -1) * (fetchedItemsCount - itemsToClip);

  return {
    sizeToClip,
    edgeItemIndex
  };
};

const shouldScrollOneTime = (config) => (misc) => (done) => {
  const scrollCount = config.custom.count;
  const count = misc.workflowRunner.count;
  const result = calculateIt(config, misc);

  spyOn(misc.workflowRunner, 'finalize').and.callFake(() => {
    if (misc.workflowRunner.count === count + 1) {
      const direction = config.custom.direction;
      const edgeItem = misc.workflow.buffer.getEdgeVisibleItem(direction);
      expect(misc.padding[direction].getSize()).toEqual(result.sizeToClip);
      expect(edgeItem.$index).toEqual(result.edgeItemIndex);
      done();
    }
  });

  doScrollMax(config, misc);
};

const shouldScrollSomeTimes = (config) => (misc) => (done) => {
  const scrollCount = config.custom.count;
  const count = misc.workflowRunner.count;
  let result = calculateIt(config, misc);

  spyOn(misc.workflowRunner, 'finalize').and.callFake(() => {
    if (misc.workflowRunner.count < count + scrollCount) {
      result = calculateIt(config, misc);
      doScrollMax(config, misc);
    } else {
      const direction = config.custom.direction;
      const edgeItem = misc.workflow.buffer.getEdgeVisibleItem(direction);
      expect(misc.padding[direction].getSize()).toEqual(result.sizeToClip);
      expect(edgeItem.$index).toEqual(result.edgeItemIndex);
      done();
    }
  });
  doScrollMax(config, misc);
};

describe('Basic Scroll Spec', () => {

  describe('Single max fwd scroll event', () =>
    singleForwardMaxScrollConfigList.forEach(config =>
      makeTest({
        config,
        title: 'should process 1 forward max scroll',
        it: shouldScrollOneTime(config)
      })
    )
  );

  describe('Single max bwd scroll event', () =>
    singleBackwardMaxScrollConfigList.forEach(config =>
      makeTest({
        config,
        title: 'should process 1 backward max scroll',
        it: shouldScrollOneTime(config)
      })
    )
  );

  describe('Mass max fwd scroll events', () =>
    massForwardScrollsConfigList.forEach(config =>
      makeTest({
        config,
        title: 'should process some forward scrolls',
        it: shouldScrollSomeTimes(config)
      })
    )
  );

  describe('Mass max bwd scroll events', () =>
    massBackwardScrollsConfigList.forEach(config =>
      makeTest({
        config,
        title: 'should process some backward scrolls',
        it: shouldScrollSomeTimes(config)
      })
    )
  );

});