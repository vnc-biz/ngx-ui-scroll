import { Component } from '@angular/core';

import { IDatasource } from '../../../public_api'; // from 'ngx-ui-scroll';

const MAX = 1000;
const MIN = -999;
const MIN_ROW_HEIGHT = 5;

@Component({
  selector: 'app-samples-window',
  templateUrl: './window.component.html'
})
export class WindowComponent {

  init: boolean;

  constructor() {
    setTimeout(() => this.init = true);
  }

  datasource: IDatasource = {
    get: (index: number, count: number, success: Function) => {
      const start = Math.max(index, MIN);
      const end = Math.min(index + count - 1, MAX);
      const data: any[] = [];
      if (start <= end) {
        for (let i = start; i <= end; i++) {
          const item = <any>{
            text: 'item #' + (i),
            height: 20 // Math.max(MIN_ROW_HEIGHT, 20 + i + MIN)
          };
          if (i % 15 === 0) {
            item.data = Array.from({ length: Math.random() * (10 - 3) + 3 }, (x, j) => '*').join('');
            item.color = i % 30 === 0 ? 'red' : 'black';
          }
          data.push(item);
        }
      }
      success(data);
    },
    settings: {
      windowViewport: true,
      startIndex: 1,
      // maxIndex: MAX,
      // minIndex: MIN,
      padding: 0.25,
      bufferSize: 10,
      itemSize: 20
    }
  };

}
