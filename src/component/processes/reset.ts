import { Scroller } from '../scroller';
import { ADAPTER_METHODS_PARAMS, validate } from '../utils/index';
import { Process, ProcessStatus, IDatasource, IDatasourceOptional } from '../interfaces/index';
import { Datasource } from '../classes/datasource';

const { RESET } = ADAPTER_METHODS_PARAMS;

export default class Reset {

  static run(scroller: Scroller, params: IDatasourceOptional | null) {
    const { datasource, buffer, viewport: { paddings } } = scroller;

    if (params) {
      const methodData = validate(params, RESET);
      if (!methodData.isValid) {
        scroller.logger.log(() => methodData.errors.join(', '));
        scroller.workflow.call({
          process: Process.reset,
          status: ProcessStatus.error,
          payload: { error: `Wrong argument of the "Adapter.reset" method call` }
        });
        return;
      }
      const constructed = params instanceof Datasource;
      Object.entries(RESET).forEach(([key, { name }]) => {
        const param = methodData.params[name];
        if (param.isSet || (constructed && datasource.hasOwnProperty(name))) {
          (datasource as any)[name] = param.value;
        }
      });
    }

    buffer.reset(true);
    paddings.backward.reset();
    paddings.forward.reset();

    scroller.workflow.call({
      process: Process.reset,
      status: ProcessStatus.next,
      payload: {
        finalize: scroller.adapter.isLoading,
        datasource
      }
    });
  }

}
