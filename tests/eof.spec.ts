import { Direction } from '../src/component/interfaces';
import { makeTest, MakeTestConfig, TestBedConfig } from './scaffolding/runner';
import { Misc } from './miscellaneous/misc';

const min = 1, max = 100, scrollCount = 10;

describe('EOF/BOF Spec', () => {

  const config = {
    bof: <TestBedConfig>{
      datasourceName: 'limited',
      datasourceSettings: { startIndex: min, bufferSize: 10, padding: 0.5, adapter: true },
      templateSettings: { viewportHeight: 200 }
    },
    eof: <TestBedConfig>{
      datasourceName: 'limited',
      datasourceSettings: { startIndex: max - 10 + 1, bufferSize: 10, padding: 0.5, adapter: true },
      templateSettings: { viewportHeight: 200 }
    }
  };

  const emptyConfig: TestBedConfig = {
    ...config.bof,
    datasourceName: 'empty-callback',
    datasourceSettings: {
      ...config.bof.datasourceSettings
    }
  };

  const observableCountConfig: TestBedConfig = {
    ...config.bof,
    datasourceSettings: {
      ...config.bof.datasourceSettings,
      minIndex: min,
      maxIndex: max
    }
  };

  const initializeBofEofContainer = (misc: Misc) => {
    const { adapter } = misc.datasource;
    misc.shared.bofEofContainer = {
      bof: { count: 0, value: adapter.bof },
      eof: { count: 0, value: adapter.eof }
    };
    const { bof, eof } = misc.shared.bofEofContainer;
    bof.subscription = adapter.bof$.subscribe(value => {
      bof.count++;
      bof.value = value;
    });
    eof.subscription = adapter.eof$.subscribe(value => {
      eof.count++;
      eof.value = value;
    });
  };

  const disposeBofEofContainer = (misc: Misc) => {
    const { bof, eof } = misc.shared.bofEofContainer;
    eof.subscription.unsubscribe();
    bof.subscription.unsubscribe();
  };

  const expectLimit = (misc: Misc, direction: Direction, noscroll = false) => {
    const _forward = direction === Direction.forward;
    const elements = misc.getElements();
    expect(elements.length).toBeGreaterThan(config[_forward ? 'eof' : 'bof'].datasourceSettings.bufferSize);
    expect(misc.padding[_forward ? Direction.forward : Direction.backward].getSize()).toEqual(0);
    if (!noscroll) {
      expect(misc.padding[_forward ? Direction.backward : Direction.forward].getSize()).toBeGreaterThan(0);
    }
    expect(misc.checkElementId(elements[_forward ? elements.length - 1 : 0], _forward ? max : min)).toEqual(true);

    const { datasource: { adapter }, buffer: { eof, bof } } = misc.scroller;
    expect(bof).toEqual(!_forward);
    expect(bof).toEqual(adapter.bof);
    expect(bof).toEqual(misc.shared.bofEofContainer.bof.value);
    expect(eof).toEqual(adapter.eof);
    expect(eof).toEqual(_forward);
    expect(eof).toEqual(misc.shared.bofEofContainer.eof.value);
  };

  const _makeTest = (data: MakeTestConfig) => makeTest({
    ...data,
    before: (misc: Misc) => initializeBofEofContainer(misc),
    after: (misc: Misc) => disposeBofEofContainer(misc)
  });

  const runLimitSuite = (eof = 'bof') => {

    const isEOF = eof === 'eof';

    describe((isEOF ? 'End' : 'Begin') + ' of file', () => {

      const _eof = isEOF ? 'bof' : 'eof';
      const direction = isEOF ? Direction.forward : Direction.backward;
      const directionOpposite = isEOF ? Direction.backward : Direction.forward;
      const doScroll = (misc: Misc) => isEOF ? misc.scrollMin() : misc.scrollMax();
      const doScrollOpposite = (misc: Misc) => isEOF ? misc.scrollMax() : misc.scrollMin();

      _makeTest({
        config: (<any>config)[eof],
        title: `should get ${eof} on init`,
        it: (misc: Misc) => (done: Function) =>
          spyOn(misc.workflow, 'finalize').and.callFake(() => {
            expectLimit(misc, direction, true);
            done();
          })
      });

      _makeTest({
        config: (<any>config)[eof],
        title: `should reset ${eof} after scroll`,
        it: (misc: Misc) => (done: Function) =>
          spyOn(misc.workflow, 'finalize').and.callFake(() => {
            const buffer = <any>misc.scroller.buffer;
            const adapter = <any>misc.scroller.datasource.adapter;
            const { bofEofContainer } = misc.shared;
            if (misc.workflow.cyclesDone === 1) {
              expect(buffer[eof]).toEqual(true);
              expect(adapter[eof]).toEqual(true);
              expect(bofEofContainer[eof].value).toEqual(true);
              doScroll(misc);
            } else {
              expect(buffer[eof]).toEqual(false);
              expect(adapter[eof]).toEqual(false);
              expect(bofEofContainer[eof].value).toEqual(false);
              expect(buffer[_eof]).toEqual(false);
              expect(adapter[_eof]).toEqual(false);
              expect(bofEofContainer[_eof].value).toEqual(false);
              done();
            }
          })
      });

      _makeTest({
        config: (<any>config)[eof],
        title: `should stop when ${eof} is reached again`,
        it: (misc: Misc) => (done: Function) =>
          spyOn(misc.workflow, 'finalize').and.callFake(() => {
            if (misc.workflow.cyclesDone === 1) {
              doScroll(misc);
            } else if (misc.workflow.cyclesDone === 2) {
              doScrollOpposite(misc);
            } else {
              expectLimit(misc, direction);
              done();
            }
          })
      });

      _makeTest({
        config: (<any>config)[eof],
        title: `should reach ${_eof} after some scrolls`,
        it: (misc: Misc) => (done: Function) =>
          spyOn(misc.workflow, 'finalize').and.callFake(() => {
            if (misc.workflow.cyclesDone < scrollCount) {
              doScroll(misc);
            } else {
              expectLimit(misc, directionOpposite);
              done();
            }
          })
      });
    });
  };

  runLimitSuite('bof');
  runLimitSuite('eof');

  _makeTest({
    config: emptyConfig,
    title: `should reach both bof and eof during the first WF cycle`,
    it: (misc: Misc) => (done: Function) =>
      spyOn(misc.workflow, 'finalize').and.callFake(() => {
        const { bof, eof } = misc.shared.bofEofContainer;
        expect(bof.count).toEqual(1);
        expect(eof.count).toEqual(1);
        expect(bof.value).toEqual(true);
        expect(eof.value).toEqual(true);
        done();
      })
  });

  _makeTest({
    config: observableCountConfig,
    title: `should reach bof/eof multiple times`,
    it: (misc: Misc) => (done: Function) =>
      spyOn(misc.workflow, 'finalize').and.callFake(() => {
        const COUNT = 10;
        const { cyclesDone } = misc.workflow;
        if (cyclesDone === 1) {
          misc.scrollMax();
        } else if (cyclesDone > 1 && cyclesDone < COUNT) {
          if (cyclesDone % 2 === 0) {
            misc.scrollMin();
          } else {
            misc.scrollMax();
          }
        } else {
          const { bof, eof } = misc.shared.bofEofContainer;
          expect(bof.count).toEqual(COUNT); // because we are at BOF initially (startIndex = min)
          expect(eof.count).toEqual(COUNT - 1);
          done();
        }
      })
  });

});
