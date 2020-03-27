import { Component } from '@angular/core';

import { DemoContext, DemoSources, DemoSourceType } from '../../shared/interfaces';
import { doLog } from '../../shared/datasource-get';
import { IDatasource } from '../../../../public_api';

@Component({
  selector: 'app-bidirectional-unlimited-datasource',
  templateUrl: './bidirectional-unlimited-datasource.component.html'
})
export class DemoBidirectionalUnlimitedDatasourceComponent {

  demoContext: DemoContext = <DemoContext> {
    scope: 'datasource',
    title: `Unlimited bidirectional datasource`,
    titleId: `unlimited-bidirectional`,
    logViewOnly: true,
    log: '',
    count: 0
  };

  datasource: IDatasource = {
    get: (index: number, count: number, success: Function) => {
      const data = [];
      for (let i = index; i <= index + count - 1; i++) {
        data.push({ id: i, text: 'item #' + i });
      }
      doLog(this.demoContext, index, count, data.length);
      success(data);
    }
  };

  sources: DemoSources = [{
    name: DemoSourceType.Datasource,
    text: `datasource: IDatasource = {
  get: (index, count, success) => {
    const data = [];
    for (let i = index; i <= index + count - 1; i++) {
      data.push({ id: i, text: 'item #' + i });
    }
    success(data);
  }
};`
  }];

}
