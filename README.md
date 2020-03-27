[![Build Status](https://travis-ci.org/dhilt/ngx-ui-scroll.svg?branch=master)](https://travis-ci.org/dhilt/ngx-ui-scroll)
[![npm version](https://badge.fury.io/js/ngx-ui-scroll.svg)](https://www.npmjs.com/package/ngx-ui-scroll) 

# NgxUiScroll

Unlimited bidirectional scrolling over limited viewport. A directive for [Angular](https://angular.io/) framework. Built with [angular-library-starter](https://github.com/robisim74/angular-library-starter). Inspired by [angular-ui-scroll](https://github.com/angular-ui/ui-scroll) (AngularJS, since 2013). Demo is available at [dhilt.github.io/ngx-ui-scroll](https://dhilt.github.io/ngx-ui-scroll/).

- [Motivation](#motivation)
- [Features](#features)
- [Getting](#getting)
- [Usage](#usage)
- [Settings](#settings)
- [Adapter API](#adapter-api)
- [Development](#development)

### Motivation

Scrolling large date sets may cause performance issues. Many DOM elements, many data-bindings, many event listeners... The common way to improve this case is to render only a small portion of the data set visible to a user. Other data set elements that are not visible to a user are virtualized with upward and downward empty padding elements which should give us a consistent viewport with consistent scrollbar parameters.

The \*uiScroll is structural directive that works like \*ngFor and renders a templated element once per item from a collection. By requesting the external Datasource (the implementation of which is a developer responsibility) the \*uiScroll directive fetches necessary portion of the data set and renders corresponded elements until the visible part of the viewport is filled out. It starts to retrieve new data to render new elements again if a user scrolls to the edge of visible element list. It dynamically destroys elements as they become invisible and recreates them if they become visible again.
<p align="center">
  <img src="https://raw.githubusercontent.com/dhilt/ngx-ui-scroll/master/demo/assets/ngx-ui-scroll-demo.gif">
</p>

### Features

 - unlimited bidirectional virtual scroll
 - lots of virtualization settings
 - super easy templating
 - infinite mode, [demo](https://dhilt.github.io/ngx-ui-scroll/#settings#infinite-mode)
 - horizontal mode, [demo](https://dhilt.github.io/ngx-ui-scroll/#settings#horizontal-mode)
 - entire window scrollable, [demo](https://dhilt.github.io/ngx-ui-scroll/#settings#window-viewport)
 - items with non-constant heights, [demo](https://dhilt.github.io/ngx-ui-scroll/#settings#different-item-heights)
 - API Adapter object to manipulate and assess the scroller, [demos](https://dhilt.github.io/ngx-ui-scroll/#/adapter)

### Getting

The \*uiScroll directive is a part of UiScrollModule which is available via npm –

`npm install ngx-ui-scroll`

The UiScrollModule has to be imported in the App/feature module where it is going to be used.

```javascript
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { UiScrollModule } from 'ngx-ui-scroll';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    UiScrollModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

### Usage

Basic usage template may look like

```html
<div class="viewport">
  <div *uiScroll="let item of datasource">
    <b>{{item.text}}</b>
  </div>
</div>
```

where the viewport is a scrollable area of finite height:

```css
.viewport {
    height: 300px;
    overflow-y: auto;
    overflow-anchor: none;
}
```

If the viewport's height is not constrained, it will pull the entire content of the datasource and no scrollbar will appear. Also, [here](https://github.com/dhilt/ngx-ui-scroll/issues/115#issuecomment-577150328) is a few words on the scroll anchoring issue.

\*uiScroll acts like \*ngFor, but the datasource is an object of special type (IDatasource). It implements method _get_ to be used by the \*uiScroll directive to access the data by _index_ and _count_ parameters. The directive calls `Datasource.get` method each time a user scrolls to the edge of visible element list. That's the API provided by the \*uiScroll.

```javascript
import { IDatasource } from 'ngx-ui-scroll';

export class AppComponent {
  datasource: IDatasource = {
    get: (index, count, success) => {
      const data = [];
      for (let i = index; i <= index + count - 1; i++) {
        data.push({ text: 'item #' + i });
      }
      success(data);
    }
  };
}
```

_Datasource.get_ method must provide an array of _count_ data-items started from _index_ position. If there are no items within given range _[index; index + count - 1]_, an empty array has to be passed. Empty result (or result which length is less than _count_) is being treated as the edge of the dataset (eof/bof), and no further requests for preceding/tailing items will be issued.

_Datasource.get_ has 3 signatures: callback based, Promise based and Observable based. So, if we want some remote API to be a source of our data, basically it may look like

```javascript
  datasource: IDatasource = {
    get: (index, count) =>
      this.http.get(`${myApiUrl}?index=${index}&count=${count}`)
  };
``` 

More details could be found on the [Datasource demo page](https://dhilt.github.io/ngx-ui-scroll/#/datasource).

### Settings

Datasource implementation along with _get_ method property may include _settings_ object property:

```javascript
  datasource: IDatasource = {
    get: ...,
    settings: {
      minIndex: 0,
      startIndex: 0,
      ...
    }
  };
```

Settings are being applied during the uiScroll initialization and have an impact on how the uiScroll behaves. Below is the list of available settings with descriptions, defaults, types and demos.

|Name|Type|Default|Description|
|:--|:----:|:----------:|:----------|
|[bufferSize](https://dhilt.github.io/ngx-ui-scroll/#settings#buffer-size)|number,<br>integer|5| Fixes minimal size of the pack of the datasource items to be requested per single _Datasource.get_ call. Can't be less than 1. |
|[padding](https://dhilt.github.io/ngx-ui-scroll/#settings#padding)|number,<br>float|0.5| Determines viewport outlets relative to the viewport's size that need to be filled. For example, 0.5 means that we'll have as many items at a moment as needed to fill out 100% of the visible part of the viewport, + 50% of the viewport size in backward direction and + 50% in forward direction. The value can't be less than 0.01. |
|[startIndex](https://dhilt.github.io/ngx-ui-scroll/#settings#start-index)|number,<br>integer|1| Specifies item index to be requested/rendered first. Can be any, but real datasource boundaries should be taken into account. |
|[minIndex](https://dhilt.github.io/ngx-ui-scroll/#settings#min-max-indexes)|number,<br>integer|-Infinity| Fixes absolute minimal index of the data set. The datasource left boundary. |
|[maxIndex](https://dhilt.github.io/ngx-ui-scroll/#settings#min-max-indexes)|number,<br>integer|+Infinity| Fixes absolute maximal index of the data set. The datasource right boundary. |
|[infinite](https://dhilt.github.io/ngx-ui-scroll/#settings#infinite-mode)|boolean|false| Allows to run "infinite" mode, when items rendered once are never removed. |
|[horizontal](https://dhilt.github.io/ngx-ui-scroll/#settings#horizontal-mode)|boolean|false| Allows to run "horizontal" mode, when the viewport's orientation is horizontal. |
|[windowViewport](https://dhilt.github.io/ngx-ui-scroll/#settings#window-viewport)|boolean|false| Allows to run "entire window scrollable" mode, when the entire window becomes the scrollable viewport. |

### Adapter API

The uiScroll has API to assess its parameters and provide some manipulations run-time. This API is available via special Adapter object. The datasource needs to be instantiated via operator "new" for the Adapter object to be added to it:

```javascript
import { Datasource } from 'ngx-ui-scroll';
...
  datasource = new Datasource({
    get: ... ,
    settings: { ... }
  });
```

Then `this.datasource.adapter.version`, `this.datasource.adapter.reload()` and other Adapter expressions become legal. Below is the list of read-only properties of the Adapter API.

|Name|Type|Description|
|:--|:----|:----------|
|version|string|Current version of ngx-ui-scroll library|
|[isLoading](https://dhilt.github.io/ngx-ui-scroll/#/adapter#is-loading)|boolean|Indicates whether the uiScroll is working ot not. |
|[isLoading$](https://dhilt.github.io/ngx-ui-scroll/#/adapter#is-loading)|Subject&lt;boolean&gt;|An Observable version of "isLoading" property. |
|[itemsCount](https://dhilt.github.io/ngx-ui-scroll/#/adapter#items-count)|number|A number of items that are rendered in the viewport at a moment.|
|[bof](https://dhilt.github.io/ngx-ui-scroll/#/adapter#bof-eof)|boolean|Indicates whether the beginning of the dataset is reached or not.|
|[bof$](https://dhilt.github.io/ngx-ui-scroll/#/adapter#bof-eof)|Subject&lt;boolean&gt;|An Observable version of "bof" property.|
|[eof](https://dhilt.github.io/ngx-ui-scroll/#/adapter#bof-eof)|boolean|Indicates whether the end of the dataset is reached or not.|
|[eof$](https://dhilt.github.io/ngx-ui-scroll/#/adapter#bof-eof)|Subject&lt;boolean&gt;|An Observable version of "eof" property.|
|[firstVisible](https://dhilt.github.io/ngx-ui-scroll/#/adapter#first-last-visible-items)|ItemAdapter {<br>&nbsp;&nbsp;$index:&nbsp;number;<br>&nbsp;&nbsp;data:&nbsp;any;<br>&nbsp;&nbsp;element?:&nbsp;HTMLElement;<br>}|Object of ItemAdapter type containing information about first visible item, where "$index" corresponds to the datasource item index value, "data" is exactly the item's content, "element" is a link to DOM element which is relevant to the item. |
|[firstVisible$](https://dhilt.github.io/ngx-ui-scroll/#/adapter#first-last-visible-items)|BehaviorSubject<br>&lt;ItemAdapter&gt;|An observable version of "firstVisible" property. |
|[lastVisible](https://dhilt.github.io/ngx-ui-scroll/#/adapter#first-last-visible-items)|ItemAdapter {<br>&nbsp;&nbsp;$index:&nbsp;number;<br>&nbsp;&nbsp;data:&nbsp;any;<br>&nbsp;&nbsp;element?:&nbsp;HTMLElement;<br>}|Object of ItemAdapter type containing information about last visible item. |
|[lastVisible$](https://dhilt.github.io/ngx-ui-scroll/#/adapter#first-last-visible-items)|BehaviorSubject<br>&lt;ItemAdapter&gt;|An observable version of "lastVisible" property. |

Below is the list of invocable methods of the Adapter API.

|Name|Parameters|Description|
|:--|:----|:----------|
|[reload](https://dhilt.github.io/ngx-ui-scroll/#/adapter#reload)|(startIndex?:&nbsp;number)|Resets the items buffer, resets the viewport params and starts fetching items from "startIndex" (if set). |
|[reset](https://dhilt.github.io/ngx-ui-scroll/#/adapter#reset)|(datasource?: IDatasource)|Performs hard reset of the uiScroll internal state by re-instantiating all its entities (instead of reusing them when _reload_). If _datasource_ argument is passed, it will be treated as new Datasource. All props of the _datasource_ are optional and the result Datasource will be a combination (merge) of the original one and the one passed as an argument. |
|[append](https://dhilt.github.io/ngx-ui-scroll/#/adapter#append-prepend)|(items:&nbsp;any&nbsp;&vert;&nbsp;any[], eof?:&nbsp;boolean)|Adds items or single item to the end of the uiScroll dataset. If eof parameter is not set, items will be added and rendered immediately, they will be placed right after the last item in the uiScroll buffer. If eof parameter is set to true, items will be added and rendered only if the end of the dataset is reached; otherwise, these items will be virtualized. |
|[prepend](https://dhilt.github.io/ngx-ui-scroll/#/adapter#append-prepend)|(items:&nbsp;any&nbsp;&vert;&nbsp;any[], bof?:&nbsp;boolean)|Adds items or single item to the beginning of the uiScroll dataset. If bof parameter is not set, items will be added and rendered immediately, they will be placed right before the first item in the uiScroll buffer. If bof parameter is set to true, items will be added and rendered only if the beginning of the dataset is reached; otherwise, these items will be virtualized. |
|[check](https://dhilt.github.io/ngx-ui-scroll/#/adapter#check-size)| |Checks if any of current items changed it's size and runs a procedure to provide internal consistency and new items fetching if needed. |
|[remove](https://dhilt.github.io/ngx-ui-scroll/#/adapter#remove)|(predicate:&nbsp;ItemsPredicate)<br><br>type&nbsp;ItemsPredicate&nbsp;=<br>&nbsp;&nbsp;(item: ItemAdapter)&nbsp;=><br>&nbsp;&nbsp;&nbsp;&nbsp;boolean|Removes items from current buffer. Predicate is a function to be applied to every item presently in the buffer. Predicate must return boolean value. If predicate's return value is true, the item will be removed. _Note!_ Current implementation allows to remove only a continuous series of items per call. If you want to remove, say, 5 and 7 items, you should call the remove method twice. Removing a series of items from 5 to 7 could be done in a single call. |
|[clip](https://dhilt.github.io/ngx-ui-scroll/#/adapter#clip)|(options: {<br>&nbsp;&nbsp;forwardOnly?:&nbsp;boolean,<br>&nbsp;&nbsp;backwardOnly?:&nbsp;boolean<br>})|Removes out-of-viewport items on demand. The direction in which invisible items should be clipped can be specified by passing an options object. If no options is passed, clipping will affect both forward and backward directions. |
|[insert](https://dhilt.github.io/ngx-ui-scroll/#/adapter#insert)|(options: {<br>&nbsp;&nbsp;items:&nbsp;any[],<br>&nbsp;&nbsp;before?:&nbsp;ItemsPredicate,<br>&nbsp;&nbsp;after?:&nbsp;ItemsPredicate,<br>&nbsp;&nbsp;decrease?:&nbsp;boolean<br>})|Inserts items _before_ or _after_ the one that satisfies the predicate condition. Only one of _before_ and _after_ options is allowed. Indexes increase by default. Decreasing strategy can be enabled via _decrease_ option. |

Along with the documented API there are some undocumented features that can be treated as experimental. They are not tested enough and might change over time. Some of them can be found on the [experimental tab](https://dhilt.github.io/ngx-ui-scroll/#/experimental) of the demo app.

### Development

There are some npm scripts available from package.json:

- `npm start` to run demo App on port 4200
- `npm test` to run Karma tests
- `npm run build` to build the ngx-ui-scroll module into the ./dist folder
- `npm run pack:install` to build tar-gzipped version of package and install it locally into ./node_modules
- `npm run build-app` to build demo App into the ./dist-app folder

Along with settings object the datasource implementation may include also devSettings object: 

```javascript
import { Datasource } from 'ngx-ui-scroll';
...
  datasource = new Datasource({
    get: ... ,
    settings: { ... },
    devSettings: {
      debug: true,
      immediateLog: true,
      ...
    }
  });
```

Like the experimental features, the development settings are not documented. Information about them can be obtained directly from the [source code](https://github.com/dhilt/ngx-ui-scroll/blob/master/src/component/classes/settings.ts). The uiScroll has "debug" mode with powerful logging which can be enabled via `devSettings.debug = true`. Also, with `devSettings.immediateLog = false` the console logging will be postponed until the undocumented Adapter method `showLog` is called (`datasource.adapter.showLog()`). This case could be important from the performance view: there might be too many logs and pushing them to the console output immediately could slow down the App.

At last, any participation is welcome, so feel free to submit new [Issues](https://github.com/dhilt/ngx-ui-scroll/issues) and open [Pull Requests](https://github.com/dhilt/ngx-ui-scroll/pulls).

__________

2020 &copy; dhilt, [Hill30 Inc](http://www.hill30.com/)
