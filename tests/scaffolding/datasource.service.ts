import { Observable } from 'rxjs';
import { Datasource } from '../../src/component/interfaces/datasource';

export class DatasourceService implements Datasource {

  constructor() {
  }

  get(index: number, count: number) {
    return Observable.create(observer => {
      let data = [];
      for (let i = index; i <= index + count - 1; i++) {
        data.push({id: i, text: "item #" + i});
      }
      observer.next(data);
    })
  }
}