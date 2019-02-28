(function(root) {
define("angular-ui-scroll", ["angular","jquery"], function() {
  return (function() {
/*!
 * angular-ui-scroll (uncompressed)
 * https://github.com/angular-ui/ui-scroll
 * Version: 1.6.1 -- 2017-03-06T07:25:29.944Z
 * License: MIT
 */
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var _jqLiteExtras = __webpack_require__(1);
	
	var _jqLiteExtras2 = _interopRequireDefault(_jqLiteExtras);
	
	var _elementRoutines = __webpack_require__(2);
	
	var _elementRoutines2 = _interopRequireDefault(_elementRoutines);
	
	var _buffer = __webpack_require__(3);
	
	var _buffer2 = _interopRequireDefault(_buffer);
	
	var _viewport = __webpack_require__(4);
	
	var _viewport2 = _interopRequireDefault(_viewport);
	
	var _adapter = __webpack_require__(6);
	
	var _adapter2 = _interopRequireDefault(_adapter);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	angular.module('ui.scroll', []).service('jqLiteExtras', function () {
	  return new _jqLiteExtras2.default();
	}).run(['jqLiteExtras', function (jqLiteExtras) {
	  return !window.jQuery ? jqLiteExtras.registerFor(angular.element) : null;
	}]).directive('uiScrollViewport', function () {
	  return {
	    restrict: 'A',
	    controller: ['$scope', '$element', function (scope, element) {
	      var _this = this;
	
	      this.container = element;
	      this.viewport = element;
	      this.scope = scope;
	
	      angular.forEach(element.children(), function (child) {
	        if (child.tagName.toLowerCase() === 'tbody') {
	          _this.viewport = angular.element(child);
	        }
	      });
	
	      return this;
	    }]
	  };
	}).directive('uiScroll', ['$log', '$injector', '$rootScope', '$timeout', '$q', '$parse', function (console, $injector, $rootScope, $timeout, $q, $parse) {
	
	  return {
	    require: ['?^uiScrollViewport'],
	    restrict: 'A',
	    transclude: 'element',
	    priority: 1000,
	    terminal: true,
	    link: link
	  };
	
	  function link($scope, element, $attr, controllers, linker) {
	    var match = $attr.uiScroll.match(/^\s*(\w+)\s+in\s+([(\w|\$)\.]+)\s*$/);
	    if (!match) {
	      throw new Error('Expected uiScroll in form of \'_item_ in _datasource_\' but got \'' + $attr.uiScroll + '\'');
	    }
	
	    function parseNumericAttr(value, defaultValue) {
	      var result = $parse(value)($scope);
	      return isNaN(result) ? defaultValue : result;
	    }
	
	    var BUFFER_MIN = 3;
	    var BUFFER_DEFAULT = 10;
	    var PADDING_MIN = 0.3;
	    var PADDING_DEFAULT = 0.5;
	
	    var datasource = null;
	    var itemName = match[1];
	    var datasourceName = match[2];
	    var viewportController = controllers[0];
	    var bufferSize = Math.max(BUFFER_MIN, parseNumericAttr($attr.bufferSize, BUFFER_DEFAULT));
	    var padding = Math.max(PADDING_MIN, parseNumericAttr($attr.padding, PADDING_DEFAULT));
	    var startIndex = parseNumericAttr($attr.startIndex, 1);
	    var ridActual = 0; // current data revision id
	    var pending = [];
	
	    var elementRoutines = new _elementRoutines2.default($injector, $q);
	    var buffer = new _buffer2.default(elementRoutines, bufferSize);
	    var viewport = new _viewport2.default(elementRoutines, buffer, element, viewportController, $rootScope, padding);
	    var adapter = new _adapter2.default(viewport, buffer, adjustBuffer, reload, $attr, $parse, element, $scope);
	
	    if (viewportController) {
	      viewportController.adapter = adapter;
	    }
	
	    var isDatasourceValid = function isDatasourceValid() {
	      return angular.isObject(datasource) && angular.isFunction(datasource.get);
	    };
	    datasource = $parse(datasourceName)($scope); // try to get datasource on scope
	    if (!isDatasourceValid()) {
	      datasource = $injector.get(datasourceName); // try to inject datasource as service
	      if (!isDatasourceValid()) {
	        throw new Error(datasourceName + ' is not a valid datasource');
	      }
	    }
	
	    var indexStore = {};
	
	    function defineProperty(datasource, propName, propUserName) {
	      var descriptor = Object.getOwnPropertyDescriptor(datasource, propName);
	      if (!descriptor || !descriptor.set && !descriptor.get) {
	        Object.defineProperty(datasource, propName, {
	          set: function set(value) {
	            indexStore[propName] = value;
	            $timeout(function () {
	              buffer[propUserName] = value;
	              if (!pending.length) {
	                var topPaddingHeightOld = viewport.topDataPos();
	                viewport.adjustPadding();
	                if (propName === 'minIndex') {
	                  viewport.adjustScrollTopAfterMinIndexSet(topPaddingHeightOld);
	                }
	              }
	            });
	          },
	          get: function get() {
	            return indexStore[propName];
	          }
	        });
	      }
	    }
	
	    defineProperty(datasource, 'minIndex', 'minIndexUser');
	    defineProperty(datasource, 'maxIndex', 'maxIndexUser');
	
	    var fetchNext = datasource.get.length !== 2 ? function (success) {
	      return datasource.get(buffer.next, bufferSize, success);
	    } : function (success) {
	      datasource.get({
	        index: buffer.next,
	        append: buffer.length ? buffer[buffer.length - 1].item : void 0,
	        count: bufferSize
	      }, success);
	    };
	
	    var fetchPrevious = datasource.get.length !== 2 ? function (success) {
	      return datasource.get(buffer.first - bufferSize, bufferSize, success);
	    } : function (success) {
	      datasource.get({
	        index: buffer.first - bufferSize,
	        prepend: buffer.length ? buffer[0].item : void 0,
	        count: bufferSize
	      }, success);
	    };
	
	    /**
	     * Build padding elements
	     *
	     * Calling linker is the only way I found to get access to the tag name of the template
	     * to prevent the directive scope from pollution a new scope is created and destroyed
	     * right after the builder creation is completed
	     */
	    linker(function (clone, scope) {
	      viewport.createPaddingElements(clone[0]);
	      // we do not include the clone in the DOM. It means that the nested directives will not
	      // be able to reach the parent directives, but in this case it is intentional because we
	      // created the clone to access the template tag name
	      scope.$destroy();
	      clone.remove();
	    });
	
	    $scope.$on('$destroy', function () {
	      unbindEvents();
	      viewport.unbind('mousewheel', wheelHandler);
	    });
	
	    viewport.bind('mousewheel', wheelHandler);
	
	    $timeout(function () {
	      viewport.applyContainerStyle();
	      reload();
	    });
	
	    /* Private function definitions */
	
	    function isInvalid(rid) {
	      return rid && rid !== ridActual || $scope.$$destroyed;
	    }
	
	    function bindEvents() {
	      viewport.bind('resize', resizeAndScrollHandler);
	      viewport.bind('scroll', resizeAndScrollHandler);
	    }
	
	    function unbindEvents() {
	      viewport.unbind('resize', resizeAndScrollHandler);
	      viewport.unbind('scroll', resizeAndScrollHandler);
	    }
	
	    function reload() {
	      viewport.resetTopPadding();
	      viewport.resetBottomPadding();
	      if (arguments.length) {
	        startIndex = arguments[0];
	      }
	      buffer.reset(startIndex);
	      adjustBuffer();
	    }
	
	    function isElementVisible(wrapper) {
	      return wrapper.element.height() && wrapper.element[0].offsetParent;
	    }
	
	    function visibilityWatcher(wrapper) {
	      if (isElementVisible(wrapper)) {
	        buffer.forEach(function (item) {
	          if (angular.isFunction(item.unregisterVisibilityWatcher)) {
	            item.unregisterVisibilityWatcher();
	            delete item.unregisterVisibilityWatcher;
	          }
	        });
	        if (!pending.length) {
	          adjustBuffer();
	        }
	      }
	    }
	
	    function insertWrapperContent(wrapper, insertAfter) {
	      createElement(wrapper, insertAfter, viewport.insertElement);
	      if (!isElementVisible(wrapper)) {
	        wrapper.unregisterVisibilityWatcher = wrapper.scope.$watch(function () {
	          return visibilityWatcher(wrapper);
	        });
	      }
	      wrapper.element.addClass('ng-hide'); // hide inserted elements before data binding
	    }
	
	    function createElement(wrapper, insertAfter, insertElement) {
	      var promises = null;
	      var sibling = insertAfter > 0 ? buffer[insertAfter - 1].element : undefined;
	      linker(function (clone, scope) {
	        promises = insertElement(clone, sibling);
	        wrapper.element = clone;
	        wrapper.scope = scope;
	        scope[itemName] = wrapper.item;
	      });
	      if (adapter.transform) adapter.transform(wrapper.scope, wrapper.element);
	      return promises;
	    }
	
	    function updateDOM() {
	      var promises = [];
	      var toBePrepended = [];
	      var toBeRemoved = [];
	      var inserted = [];
	
	      buffer.forEach(function (wrapper, i) {
	        switch (wrapper.op) {
	          case 'prepend':
	            toBePrepended.unshift(wrapper);
	            break;
	          case 'append':
	            insertWrapperContent(wrapper, i);
	            wrapper.op = 'none';
	            inserted.push(wrapper);
	            break;
	          case 'insert':
	            promises = promises.concat(createElement(wrapper, i, viewport.insertElementAnimated));
	            wrapper.op = 'none';
	            inserted.push(wrapper);
	            break;
	          case 'remove':
	            toBeRemoved.push(wrapper);
	        }
	      });
	
	      toBeRemoved.forEach(function (wrapper) {
	        return promises = promises.concat(buffer.remove(wrapper));
	      });
	
	      if (toBePrepended.length) toBePrepended.forEach(function (wrapper) {
	        insertWrapperContent(wrapper);
	        wrapper.op = 'none';
	      });
	
	      buffer.forEach(function (item, i) {
	        return item.scope.$index = buffer.first + i;
	      });
	
	      return {
	        prepended: toBePrepended,
	        removed: toBeRemoved,
	        inserted: inserted,
	        animated: promises
	      };
	    }
	
	    function updatePaddings(rid, updates) {
	      // schedule another adjustBuffer after animation completion
	      if (updates.animated.length) {
	        $q.all(updates.animated).then(function () {
	          viewport.adjustPadding();
	          adjustBuffer(rid);
	        });
	      } else {
	        viewport.adjustPadding();
	      }
	    }
	
	    function enqueueFetch(rid, updates) {
	      if (viewport.shouldLoadBottom()) {
	        if (!updates || buffer.effectiveHeight(updates.inserted) > 0) {
	          // this means that at least one item appended in the last batch has height > 0
	          if (pending.push(true) === 1) {
	            fetch(rid);
	            adapter.loading(true);
	          }
	        }
	      } else if (viewport.shouldLoadTop()) {
	        if (!updates || buffer.effectiveHeight(updates.prepended) > 0 || pending[0]) {
	          // this means that at least one item appended in the last batch has height > 0
	          // pending[0] = true means that previous fetch was appending. We need to force at least one prepend
	          // BTW there will always be at least 1 element in the pending array because bottom is fetched first
	          if (pending.push(false) === 1) {
	            fetch(rid);
	            adapter.loading(true);
	          }
	        }
	      }
	    }
	
	    function adjustBuffer(rid) {
	      if (!rid) {
	        // dismiss pending requests
	        pending = [];
	        rid = ++ridActual;
	      }
	
	      var updates = updateDOM();
	
	      // We need the item bindings to be processed before we can do adjustment
	      $timeout(function () {
	
	        // show elements after data binging has been done
	        updates.inserted.forEach(function (w) {
	          return w.element.removeClass('ng-hide');
	        });
	        updates.prepended.forEach(function (w) {
	          return w.element.removeClass('ng-hide');
	        });
	
	        if (isInvalid(rid)) {
	          return;
	        }
	
	        updatePaddings(rid, updates);
	        enqueueFetch(rid);
	
	        if (!pending.length) {
	          adapter.calculateProperties();
	        }
	      });
	    }
	
	    function adjustBufferAfterFetch(rid) {
	      var updates = updateDOM();
	
	      // We need the item bindings to be processed before we can do adjustment
	      $timeout(function () {
	
	        // show elements after data binging has been done
	        updates.inserted.forEach(function (w) {
	          return w.element.removeClass('ng-hide');
	        });
	        updates.prepended.forEach(function (w) {
	          return w.element.removeClass('ng-hide');
	        });
	
	        viewport.adjustScrollTopAfterPrepend(updates);
	
	        if (isInvalid(rid)) {
	          return;
	        }
	
	        updatePaddings(rid, updates);
	        enqueueFetch(rid, updates);
	        pending.shift();
	
	        if (pending.length) fetch(rid);else {
	          adapter.loading(false);
	          bindEvents();
	          adapter.calculateProperties();
	        }
	      });
	    }
	
	    function fetch(rid) {
	      if (pending[0]) {
	        // scrolling down
	        if (buffer.length && !viewport.shouldLoadBottom()) {
	          adjustBufferAfterFetch(rid);
	        } else {
	          fetchNext(function (result) {
	            if (isInvalid(rid)) {
	              return;
	            }
	
	            if (result.length < bufferSize) {
	              buffer.eof = true;
	            }
	
	            if (result.length > 0) {
	              viewport.clipTop();
	              buffer.append(result);
	            }
	
	            adjustBufferAfterFetch(rid);
	          });
	        }
	      } else {
	        // scrolling up
	        if (buffer.length && !viewport.shouldLoadTop()) {
	          adjustBufferAfterFetch(rid);
	        } else {
	          fetchPrevious(function (result) {
	            if (isInvalid(rid)) {
	              return;
	            }
	
	            if (result.length < bufferSize) {
	              buffer.bof = true;
	              // log 'bof is reached'
	            }
	
	            if (result.length > 0) {
	              if (buffer.length) {
	                viewport.clipBottom();
	              }
	              buffer.prepend(result);
	            }
	
	            adjustBufferAfterFetch(rid);
	          });
	        }
	      }
	    }
	
	    function resizeAndScrollHandler() {
	      if (!$rootScope.$$phase && !adapter.isLoading && !adapter.disabled) {
	
	        enqueueFetch(ridActual);
	
	        if (pending.length) {
	          unbindEvents();
	        } else {
	          adapter.calculateProperties();
	          $scope.$apply();
	        }
	      }
	    }
	
	    function wheelHandler(event) {
	      if (!adapter.disabled) {
	        var scrollTop = viewport[0].scrollTop;
	        var yMax = viewport[0].scrollHeight - viewport[0].clientHeight;
	
	        if (scrollTop === 0 && !buffer.bof || scrollTop === yMax && !buffer.eof) {
	          event.preventDefault();
	        }
	      }
	    }
	  }
	}]);

/***/ },
/* 1 */
/***/ function(module, exports) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	
	var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();
	
	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	/*!
	 globals: angular, window
	 List of used element methods available in JQuery but not in JQuery Lite
	 element.before(elem)
	 element.height()
	 element.outerHeight(true)
	 element.height(value) = only for Top/Bottom padding elements
	 element.scrollTop()
	 element.scrollTop(value)
	 */
	
	var JQLiteExtras = function () {
	  function JQLiteExtras() {
	    _classCallCheck(this, JQLiteExtras);
	  }
	
	  _createClass(JQLiteExtras, [{
	    key: 'registerFor',
	    value: function registerFor(element) {
	      var convertToPx = void 0,
	          css = void 0,
	          getStyle = void 0,
	          isWindow = void 0;
	      // angular implementation blows up if elem is the window
	      css = angular.element.prototype.css;
	
	      element.prototype.css = function (name, value) {
	        var self = this;
	        var elem = self[0];
	        if (!(!elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style)) {
	          return css.call(self, name, value);
	        }
	      };
	
	      // as defined in angularjs v1.0.5
	      isWindow = function isWindow(obj) {
	        return obj && obj.document && obj.location && obj.alert && obj.setInterval;
	      };
	
	      function scrollTo(self, direction, value) {
	        var elem = self[0];
	
	        var _top$left$direction = _slicedToArray({
	          top: ['scrollTop', 'pageYOffset', 'scrollLeft'],
	          left: ['scrollLeft', 'pageXOffset', 'scrollTop']
	        }[direction], 3),
	            method = _top$left$direction[0],
	            prop = _top$left$direction[1],
	            preserve = _top$left$direction[2];
	
	        if (isWindow(elem)) {
	          if (angular.isDefined(value)) {
	            return elem.scrollTo(self[preserve].call(self), value);
	          }
	          return prop in elem ? elem[prop] : elem.document.documentElement[method];
	        } else {
	          if (angular.isDefined(value)) {
	            elem[method] = value;
	          }
	          return elem[method];
	        }
	      }
	
	      if (window.getComputedStyle) {
	        getStyle = function getStyle(elem) {
	          return window.getComputedStyle(elem, null);
	        };
	        convertToPx = function convertToPx(elem, value) {
	          return parseFloat(value);
	        };
	      } else {
	        getStyle = function getStyle(elem) {
	          return elem.currentStyle;
	        };
	        convertToPx = function convertToPx(elem, value) {
	          var left = void 0,
	              result = void 0,
	              rs = void 0,
	              rsLeft = void 0,
	              style = void 0;
	          var core_pnum = /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source;
	          var rnumnonpx = new RegExp('^(' + core_pnum + ')(?!px)[a-z%]+$', 'i');
	
	          if (!rnumnonpx.test(value)) {
	            return parseFloat(value);
	          }
	
	          // ported from JQuery
	          style = elem.style;
	          left = style.left;
	          rs = elem.runtimeStyle;
	          rsLeft = rs && rs.left;
	          if (rs) {
	            rs.left = style.left;
	          }
	          // put in the new values to get a computed style out
	          style.left = value;
	          result = style.pixelLeft;
	          style.left = left;
	          if (rsLeft) {
	            rs.left = rsLeft;
	          }
	          return result;
	        };
	      }
	
	      function getMeasurements(elem, measure) {
	        var base = void 0,
	            borderA = void 0,
	            borderB = void 0,
	            computedMarginA = void 0,
	            computedMarginB = void 0,
	            computedStyle = void 0,
	            dirA = void 0,
	            dirB = void 0,
	            marginA = void 0,
	            marginB = void 0,
	            paddingA = void 0,
	            paddingB = void 0;
	
	        if (isWindow(elem)) {
	          base = document.documentElement[{ height: 'clientHeight', width: 'clientWidth' }[measure]];
	
	          return {
	            base: base,
	            padding: 0,
	            border: 0,
	            margin: 0
	          };
	        }
	
	        // Start with offset property
	
	        var _width$height$measure = _slicedToArray({
	          width: [elem.offsetWidth, 'Left', 'Right'],
	          height: [elem.offsetHeight, 'Top', 'Bottom']
	        }[measure], 3);
	
	        base = _width$height$measure[0];
	        dirA = _width$height$measure[1];
	        dirB = _width$height$measure[2];
	
	
	        computedStyle = getStyle(elem);
	        paddingA = convertToPx(elem, computedStyle['padding' + dirA]) || 0;
	        paddingB = convertToPx(elem, computedStyle['padding' + dirB]) || 0;
	        borderA = convertToPx(elem, computedStyle['border' + dirA + 'Width']) || 0;
	        borderB = convertToPx(elem, computedStyle['border' + dirB + 'Width']) || 0;
	        computedMarginA = computedStyle['margin' + dirA];
	        computedMarginB = computedStyle['margin' + dirB];
	
	        // I do not care for width for now, so this hack is irrelevant
	        // if ( !supportsPercentMargin )
	        // computedMarginA = hackPercentMargin( elem, computedStyle, computedMarginA )
	        // computedMarginB = hackPercentMargin( elem, computedStyle, computedMarginB )
	        marginA = convertToPx(elem, computedMarginA) || 0;
	        marginB = convertToPx(elem, computedMarginB) || 0;
	
	        return {
	          base: base,
	          padding: paddingA + paddingB,
	          border: borderA + borderB,
	          margin: marginA + marginB
	        };
	      }
	
	      function getWidthHeight(elem, direction, measure) {
	        var computedStyle = void 0,
	            result = void 0;
	
	        var measurements = getMeasurements(elem, direction);
	
	        if (measurements.base > 0) {
	          return {
	            base: measurements.base - measurements.padding - measurements.border,
	            outer: measurements.base,
	            outerfull: measurements.base + measurements.margin
	          }[measure];
	        }
	
	        // Fall back to computed then uncomputed css if necessary
	        computedStyle = getStyle(elem);
	        result = computedStyle[direction];
	
	        if (result < 0 || result === null) {
	          result = elem.style[direction] || 0;
	        }
	
	        // Normalize "", auto, and prepare for extra
	        result = parseFloat(result) || 0;
	
	        return {
	          base: result - measurements.padding - measurements.border,
	          outer: result,
	          outerfull: result + measurements.padding + measurements.border + measurements.margin
	        }[measure];
	      }
	
	      // define missing methods
	      return angular.forEach({
	        before: function before(newElem) {
	          var children, elem, i, j, parent, ref, self;
	          self = this;
	          elem = self[0];
	          parent = self.parent();
	          children = parent.contents();
	          if (children[0] === elem) {
	            return parent.prepend(newElem);
	          } else {
	            for (i = j = 1, ref = children.length - 1; 1 <= ref ? j <= ref : j >= ref; i = 1 <= ref ? ++j : --j) {
	              if (children[i] === elem) {
	                angular.element(children[i - 1]).after(newElem);
	                return;
	              }
	            }
	            throw new Error('invalid DOM structure ' + elem.outerHTML);
	          }
	        },
	        height: function height(value) {
	          var self;
	          self = this;
	          if (angular.isDefined(value)) {
	            if (angular.isNumber(value)) {
	              value = value + 'px';
	            }
	            return css.call(self, 'height', value);
	          } else {
	            return getWidthHeight(this[0], 'height', 'base');
	          }
	        },
	        outerHeight: function outerHeight(option) {
	          return getWidthHeight(this[0], 'height', option ? 'outerfull' : 'outer');
	        },
	        outerWidth: function outerWidth(option) {
	          return getWidthHeight(this[0], 'width', option ? 'outerfull' : 'outer');
	        },
	
	
	        /*
	         The offset setter method is not implemented
	         */
	        offset: function offset(value) {
	          var docElem = void 0,
	              win = void 0;
	          var self = this;
	          var box = {
	            top: 0,
	            left: 0
	          };
	          var elem = self[0];
	          var doc = elem && elem.ownerDocument;
	
	          if (arguments.length) {
	            if (value === undefined) {
	              return self;
	            }
	            // TODO: implement setter
	            throw new Error('offset setter method is not implemented');
	          }
	
	          if (!doc) {
	            return;
	          }
	
	          docElem = doc.documentElement;
	
	          // TODO: Make sure it's not a disconnected DOM node
	
	          if (elem.getBoundingClientRect != null) {
	            box = elem.getBoundingClientRect();
	          }
	
	          win = doc.defaultView || doc.parentWindow;
	
	          return {
	            top: box.top + (win.pageYOffset || docElem.scrollTop) - (docElem.clientTop || 0),
	            left: box.left + (win.pageXOffset || docElem.scrollLeft) - (docElem.clientLeft || 0)
	          };
	        },
	        scrollTop: function scrollTop(value) {
	          return scrollTo(this, 'top', value);
	        },
	        scrollLeft: function scrollLeft(value) {
	          return scrollTo(this, 'left', value);
	        }
	      }, function (value, key) {
	        if (!element.prototype[key]) {
	          return element.prototype[key] = value;
	        }
	      });
	    }
	  }]);
	
	  return JQLiteExtras;
	}();
	
	exports.default = JQLiteExtras;

/***/ },
/* 2 */
/***/ function(module, exports) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	
	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };
	
	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	var ElementRoutines = function () {
	  function ElementRoutines($injector, $q) {
	    _classCallCheck(this, ElementRoutines);
	
	    this.$animate = $injector.has && $injector.has('$animate') ? $injector.get('$animate') : null;
	    this.isAngularVersionLessThen1_3 = angular.version.major === 1 && angular.version.minor < 3;
	    this.$q = $q;
	  }
	
	  _createClass(ElementRoutines, [{
	    key: 'insertElement',
	    value: function insertElement(newElement, previousElement) {
	      previousElement.after(newElement);
	      return [];
	    }
	  }, {
	    key: 'removeElement',
	    value: function removeElement(wrapper) {
	      wrapper.element.remove();
	      wrapper.scope.$destroy();
	      return [];
	    }
	  }, {
	    key: 'insertElementAnimated',
	    value: function insertElementAnimated(newElement, previousElement) {
	      var _this = this;
	
	      if (!this.$animate) {
	        return this.insertElement(newElement, previousElement);
	      }
	
	      if (this.isAngularVersionLessThen1_3) {
	        var _ret = function () {
	          var deferred = _this.$q.defer();
	          // no need for parent - previous element is never null
	          _this.$animate.enter(newElement, null, previousElement, function () {
	            return deferred.resolve();
	          });
	
	          return {
	            v: [deferred.promise]
	          };
	        }();
	
	        if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
	      }
	
	      // no need for parent - previous element is never null
	      return [this.$animate.enter(newElement, null, previousElement)];
	    }
	  }, {
	    key: 'removeElementAnimated',
	    value: function removeElementAnimated(wrapper) {
	      var _this2 = this;
	
	      if (!this.$animate) {
	        return this.removeElement(wrapper);
	      }
	
	      if (this.isAngularVersionLessThen1_3) {
	        var _ret2 = function () {
	          var deferred = _this2.$q.defer();
	          _this2.$animate.leave(wrapper.element, function () {
	            wrapper.scope.$destroy();
	            return deferred.resolve();
	          });
	
	          return {
	            v: [deferred.promise]
	          };
	        }();
	
	        if ((typeof _ret2 === 'undefined' ? 'undefined' : _typeof(_ret2)) === "object") return _ret2.v;
	      }
	
	      return [this.$animate.leave(wrapper.element).then(function () {
	        return wrapper.scope.$destroy();
	      })];
	    }
	  }]);
	
	  return ElementRoutines;
	}();
	
	exports.default = ElementRoutines;

/***/ },
/* 3 */
/***/ function(module, exports) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = ScrollBuffer;
	function ScrollBuffer(elementRoutines, bufferSize) {
	  var buffer = Object.create(Array.prototype);
	
	  angular.extend(buffer, {
	    size: bufferSize,
	
	    reset: function reset(startIndex) {
	      buffer.remove(0, buffer.length);
	      buffer.eof = false;
	      buffer.bof = false;
	      buffer.first = startIndex;
	      buffer.next = startIndex;
	      buffer.minIndex = startIndex;
	      buffer.maxIndex = startIndex;
	      buffer.minIndexUser = null;
	      buffer.maxIndexUser = null;
	    },
	    append: function append(items) {
	      items.forEach(function (item) {
	        ++buffer.next;
	        buffer.insert('append', item);
	      });
	      buffer.maxIndex = buffer.eof ? buffer.next - 1 : Math.max(buffer.next - 1, buffer.maxIndex);
	    },
	    prepend: function prepend(items) {
	      items.reverse().forEach(function (item) {
	        --buffer.first;
	        buffer.insert('prepend', item);
	      });
	      buffer.minIndex = buffer.bof ? buffer.minIndex = buffer.first : Math.min(buffer.first, buffer.minIndex);
	    },
	
	
	    /**
	     * inserts wrapped element in the buffer
	     * the first argument is either operation keyword (see below) or a number for operation 'insert'
	     * for insert the number is the index for the buffer element the new one have to be inserted after
	     * operations: 'append', 'prepend', 'insert', 'remove', 'update', 'none'
	     */
	    insert: function insert(operation, item) {
	      var wrapper = {
	        item: item
	      };
	
	      if (operation % 1 === 0) {
	        // it is an insert
	        wrapper.op = 'insert';
	        buffer.splice(operation, 0, wrapper);
	      } else {
	        wrapper.op = operation;
	        switch (operation) {
	          case 'append':
	            buffer.push(wrapper);
	            break;
	          case 'prepend':
	            buffer.unshift(wrapper);
	            break;
	        }
	      }
	    },
	
	
	    // removes elements from buffer
	    remove: function remove(arg1, arg2) {
	      if (angular.isNumber(arg1)) {
	        // removes items from arg1 (including) through arg2 (excluding)
	        for (var i = arg1; i < arg2; i++) {
	          elementRoutines.removeElement(buffer[i]);
	        }
	
	        return buffer.splice(arg1, arg2 - arg1);
	      }
	      // removes single item(wrapper) from the buffer
	      buffer.splice(buffer.indexOf(arg1), 1);
	
	      return elementRoutines.removeElementAnimated(arg1);
	    },
	    effectiveHeight: function effectiveHeight(elements) {
	      if (!elements.length) {
	        return 0;
	      }
	      var top = Number.MAX_VALUE;
	      var bottom = Number.MIN_VALUE;
	      elements.forEach(function (wrapper) {
	        if (wrapper.element[0].offsetParent) {
	          // element style is not display:none
	          top = Math.min(top, wrapper.element.offset().top);
	          bottom = Math.max(bottom, wrapper.element.offset().top + wrapper.element.outerHeight(true));
	        }
	      });
	      return Math.max(0, bottom - top);
	    }
	  });
	
	  return buffer;
	}

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = Viewport;
	
	var _padding = __webpack_require__(5);
	
	var _padding2 = _interopRequireDefault(_padding);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	function Viewport(elementRoutines, buffer, element, viewportController, $rootScope, padding) {
	  var topPadding = null;
	  var bottomPadding = null;
	  var viewport = viewportController && viewportController.viewport ? viewportController.viewport : angular.element(window);
	  var container = viewportController && viewportController.container ? viewportController.container : undefined;
	  var scope = viewportController && viewportController.scope ? viewportController.scope : $rootScope;
	
	  viewport.css({
	    'overflow-anchor': 'none',
	    'overflow-y': 'auto',
	    'display': 'block'
	  });
	
	  function bufferPadding() {
	    return viewport.outerHeight() * padding; // some extra space to initiate preload
	  }
	
	  angular.extend(viewport, {
	    getScope: function getScope() {
	      return scope;
	    },
	    createPaddingElements: function createPaddingElements(template) {
	      topPadding = new _padding2.default(template);
	      bottomPadding = new _padding2.default(template);
	      element.before(topPadding);
	      element.after(bottomPadding);
	    },
	    applyContainerStyle: function applyContainerStyle() {
	      if (container && container !== viewport) {
	        viewport.css('height', window.getComputedStyle(container[0]).height);
	      }
	    },
	    bottomDataPos: function bottomDataPos() {
	      var scrollHeight = viewport[0].scrollHeight;
	      scrollHeight = scrollHeight != null ? scrollHeight : viewport[0].document.documentElement.scrollHeight;
	      return scrollHeight - bottomPadding.height();
	    },
	    topDataPos: function topDataPos() {
	      return topPadding.height();
	    },
	    bottomVisiblePos: function bottomVisiblePos() {
	      return viewport.scrollTop() + viewport.outerHeight();
	    },
	    topVisiblePos: function topVisiblePos() {
	      return viewport.scrollTop();
	    },
	    insertElement: function insertElement(e, sibling) {
	      return elementRoutines.insertElement(e, sibling || topPadding);
	    },
	    insertElementAnimated: function insertElementAnimated(e, sibling) {
	      return elementRoutines.insertElementAnimated(e, sibling || topPadding);
	    },
	    shouldLoadBottom: function shouldLoadBottom() {
	      return !buffer.eof && viewport.bottomDataPos() < viewport.bottomVisiblePos() + bufferPadding();
	    },
	    clipBottom: function clipBottom() {
	      // clip the invisible items off the bottom
	      var overage = 0;
	      var overageHeight = 0;
	      var itemHeight = 0;
	      var emptySpaceHeight = viewport.bottomDataPos() - viewport.bottomVisiblePos() - bufferPadding();
	
	      for (var i = buffer.length - 1; i >= 0; i--) {
	        itemHeight = buffer[i].element.outerHeight(true);
	        if (overageHeight + itemHeight > emptySpaceHeight) {
	          break;
	        }
	        bottomPadding.cache.add(buffer[i]);
	        overageHeight += itemHeight;
	        overage++;
	      }
	
	      if (overage > 0) {
	        buffer.eof = false;
	        buffer.remove(buffer.length - overage, buffer.length);
	        buffer.next -= overage;
	        viewport.adjustPadding();
	      }
	    },
	    shouldLoadTop: function shouldLoadTop() {
	      return !buffer.bof && viewport.topDataPos() > viewport.topVisiblePos() - bufferPadding();
	    },
	    clipTop: function clipTop() {
	      // clip the invisible items off the top
	      var overage = 0;
	      var overageHeight = 0;
	      var itemHeight = 0;
	      var emptySpaceHeight = viewport.topVisiblePos() - viewport.topDataPos() - bufferPadding();
	
	      for (var i = 0; i < buffer.length; i++) {
	        itemHeight = buffer[i].element.outerHeight(true);
	        if (overageHeight + itemHeight > emptySpaceHeight) {
	          break;
	        }
	        topPadding.cache.add(buffer[i]);
	        overageHeight += itemHeight;
	        overage++;
	      }
	
	      if (overage > 0) {
	        // we need to adjust top padding element before items are removed from top
	        // to avoid strange behaviour of scroll bar during remove top items when we are at the very bottom
	        topPadding.height(topPadding.height() + overageHeight);
	        buffer.bof = false;
	        buffer.remove(0, overage);
	        buffer.first += overage;
	      }
	    },
	    adjustPadding: function adjustPadding() {
	      if (!buffer.length) {
	        return;
	      }
	
	      // precise heights calculation, items that were in buffer once
	      var topPaddingHeight = topPadding.cache.reduce(function (summ, item) {
	        return summ + (item.index < buffer.first ? item.height : 0);
	      }, 0);
	      var bottomPaddingHeight = bottomPadding.cache.reduce(function (summ, item) {
	        return summ + (item.index >= buffer.next ? item.height : 0);
	      }, 0);
	
	      // average item height based on buffer data
	      var visibleItemsHeight = buffer.reduce(function (summ, item) {
	        return summ + item.element.outerHeight(true);
	      }, 0);
	      var averageItemHeight = (visibleItemsHeight + topPaddingHeight + bottomPaddingHeight) / (buffer.maxIndex - buffer.minIndex + 1);
	
	      // average heights calculation, items that have never been reached
	      var adjustTopPadding = buffer.minIndexUser !== null && buffer.minIndex > buffer.minIndexUser;
	      var adjustBottomPadding = buffer.maxIndexUser !== null && buffer.maxIndex < buffer.maxIndexUser;
	      var topPaddingHeightAdd = adjustTopPadding ? (buffer.minIndex - buffer.minIndexUser) * averageItemHeight : 0;
	      var bottomPaddingHeightAdd = adjustBottomPadding ? (buffer.maxIndexUser - buffer.maxIndex) * averageItemHeight : 0;
	
	      // paddings combine adjustment
	      topPadding.height(topPaddingHeight + topPaddingHeightAdd);
	      bottomPadding.height(bottomPaddingHeight + bottomPaddingHeightAdd);
	    },
	    adjustScrollTopAfterMinIndexSet: function adjustScrollTopAfterMinIndexSet(topPaddingHeightOld) {
	      // additional scrollTop adjustment in case of datasource.minIndex external set
	      if (buffer.minIndexUser !== null && buffer.minIndex > buffer.minIndexUser) {
	        var diff = topPadding.height() - topPaddingHeightOld;
	        viewport.scrollTop(viewport.scrollTop() + diff);
	      }
	    },
	    adjustScrollTopAfterPrepend: function adjustScrollTopAfterPrepend(updates) {
	      if (!updates.prepended.length) return;
	      var height = buffer.effectiveHeight(updates.prepended);
	      var paddingHeight = topPadding.height() - height;
	      if (paddingHeight >= 0) {
	        topPadding.height(paddingHeight);
	      } else {
	        topPadding.height(0);
	        viewport.scrollTop(viewport.scrollTop() - paddingHeight);
	      }
	    },
	    resetTopPadding: function resetTopPadding() {
	      topPadding.height(0);
	      topPadding.cache.clear();
	    },
	    resetBottomPadding: function resetBottomPadding() {
	      bottomPadding.height(0);
	      bottomPadding.cache.clear();
	    }
	  });
	
	  return viewport;
	}

/***/ },
/* 5 */
/***/ function(module, exports) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = Padding;
	function Cache() {
	  var cache = Object.create(Array.prototype);
	
	  angular.extend(cache, {
	    add: function add(item) {
	      for (var i = cache.length - 1; i >= 0; i--) {
	        if (cache[i].index === item.scope.$index) {
	          cache[i].height = item.element.outerHeight();
	          return;
	        }
	      }
	      cache.push({
	        index: item.scope.$index,
	        height: item.element.outerHeight()
	      });
	    },
	    clear: function clear() {
	      cache.length = 0;
	    }
	  });
	
	  return cache;
	}
	
	function Padding(template) {
	  var result = void 0;
	
	  switch (template.tagName) {
	    case 'dl':
	      throw new Error('ui-scroll directive does not support <' + template.tagName + '> as a repeating tag: ' + template.outerHTML);
	    case 'tr':
	      var table = angular.element('<table><tr><td><div></div></td></tr></table>');
	      result = table.find('tr');
	      break;
	    case 'li':
	      result = angular.element('<li></li>');
	      break;
	    default:
	      result = angular.element('<div></div>');
	  }
	
	  result.cache = new Cache();
	
	  return result;
	}

/***/ },
/* 6 */
/***/ function(module, exports) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	
	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	function getCtrlOnData(attr, element) {
	  var onSyntax = attr.match(/^(.+)(\s+on\s+)(.+)?/);
	  if (onSyntax && onSyntax.length === 4) {
	    window.console.log('Angular ui-scroll adapter assignment warning. "Controller On" syntax has been deprecated since ui-scroll v1.6.1.');
	    var ctrl = onSyntax[3];
	    var tail = onSyntax[1];
	    var candidate = element;
	    while (candidate.length) {
	      var candidateScope = candidate.scope(); // doesn't work when debugInfoEnabled flag = true
	      var candidateName = (candidate.attr('ng-controller') || '').match(/(\w(?:\w|\d)*)(?:\s+as\s+(\w(?:\w|\d)*))?/);
	      if (candidateName && candidateName[1] === ctrl) {
	        return {
	          target: candidateScope,
	          source: tail
	        };
	      }
	      candidate = candidate.parent();
	    }
	    throw new Error('Angular ui-scroll adapter assignment error. Failed to locate target controller "' + ctrl + '" to inject "' + tail + '"');
	  }
	}
	
	var Adapter = function () {
	  function Adapter(viewport, buffer, adjustBuffer, reload, $attr, $parse, element, $scope) {
	    _classCallCheck(this, Adapter);
	
	    this.viewport = viewport;
	    this.buffer = buffer;
	    this.adjustBuffer = adjustBuffer;
	    this.reload = reload;
	
	    this.isLoading = false;
	    this.disabled = false;
	
	    var viewportScope = viewport.getScope();
	    this.startScope = viewportScope.$parent ? viewportScope : $scope;
	
	    this.publicContext = {};
	    this.assignAdapter($attr.adapter, $parse, element);
	    this.generatePublicContext($attr, $parse);
	  }
	
	  _createClass(Adapter, [{
	    key: 'assignAdapter',
	    value: function assignAdapter(adapterAttr, $parse, element) {
	      if (!adapterAttr || !(adapterAttr = adapterAttr.replace(/^\s+|\s+$/gm, ''))) {
	        return;
	      }
	      var ctrlOnData = getCtrlOnData(adapterAttr, element);
	      var adapterOnScope = void 0;
	
	      try {
	        if (ctrlOnData) {
	          // "Controller On", deprecated since v1.6.1
	          $parse(ctrlOnData.source).assign(ctrlOnData.target, {});
	          adapterOnScope = $parse(ctrlOnData.source)(ctrlOnData.target);
	        } else {
	          $parse(adapterAttr).assign(this.startScope, {});
	          adapterOnScope = $parse(adapterAttr)(this.startScope);
	        }
	      } catch (error) {
	        error.message = 'Angular ui-scroll Adapter assignment exception.\n' + ('Can\'t parse "' + adapterAttr + '" expression.\n') + error.message;
	        throw error;
	      }
	
	      angular.extend(adapterOnScope, this.publicContext);
	      this.publicContext = adapterOnScope;
	    }
	  }, {
	    key: 'generatePublicContext',
	    value: function generatePublicContext($attr, $parse) {
	      var _this = this;
	
	      // these methods will be accessible out of ui-scroll via user defined adapter
	      var publicMethods = ['reload', 'applyUpdates', 'append', 'prepend', 'isBOF', 'isEOF', 'isEmpty'];
	      for (var i = publicMethods.length - 1; i >= 0; i--) {
	        this.publicContext[publicMethods[i]] = this[publicMethods[i]].bind(this);
	      }
	
	      // these read-only props will be accessible out of ui-scroll via user defined adapter
	      var publicProps = ['isLoading', 'topVisible', 'topVisibleElement', 'topVisibleScope'];
	
	      var _loop = function _loop(_i) {
	        var property = void 0,
	            attr = $attr[publicProps[_i]];
	        Object.defineProperty(_this, publicProps[_i], {
	          get: function get() {
	            return property;
	          },
	          set: function set(value) {
	            property = value;
	            _this.publicContext[publicProps[_i]] = value;
	            if (attr) {
	              $parse(attr).assign(_this.startScope, value);
	            }
	          }
	        });
	      };
	
	      for (var _i = publicProps.length - 1; _i >= 0; _i--) {
	        _loop(_i);
	      }
	
	      // non-read-only public property
	      Object.defineProperty(this.publicContext, 'disabled', {
	        get: function get() {
	          return _this.disabled;
	        },
	        set: function set(value) {
	          return !(_this.disabled = value) ? _this.adjustBuffer() : null;
	        }
	      });
	    }
	  }, {
	    key: 'loading',
	    value: function loading(value) {
	      this['isLoading'] = value;
	    }
	  }, {
	    key: 'isBOF',
	    value: function isBOF() {
	      return this.buffer.bof;
	    }
	  }, {
	    key: 'isEOF',
	    value: function isEOF() {
	      return this.buffer.eof;
	    }
	  }, {
	    key: 'isEmpty',
	    value: function isEmpty() {
	      return !this.buffer.length;
	    }
	  }, {
	    key: 'applyUpdates',
	    value: function applyUpdates(arg1, arg2) {
	      var _this2 = this;
	
	      if (angular.isFunction(arg1)) {
	        // arg1 is the updater function, arg2 is ignored
	        this.buffer.slice(0).forEach(function (wrapper) {
	          // we need to do it on the buffer clone, because buffer content
	          // may change as we iterate through
	          _this2.applyUpdate(wrapper, arg1(wrapper.item, wrapper.scope, wrapper.element));
	        });
	      } else {
	        // arg1 is item index, arg2 is the newItems array
	        if (arg1 % 1 !== 0) {
	          // checking if it is an integer
	          throw new Error('applyUpdates - ' + arg1 + ' is not a valid index');
	        }
	
	        var index = arg1 - this.buffer.first;
	        if (index >= 0 && index < this.buffer.length) {
	          this.applyUpdate(this.buffer[index], arg2);
	        }
	      }
	
	      this.adjustBuffer();
	    }
	  }, {
	    key: 'append',
	    value: function append(newItems) {
	      this.buffer.append(newItems);
	      this.adjustBuffer();
	    }
	  }, {
	    key: 'prepend',
	    value: function prepend(newItems) {
	      this.buffer.prepend(newItems);
	      this.adjustBuffer();
	    }
	  }, {
	    key: 'calculateProperties',
	    value: function calculateProperties() {
	      var item = void 0,
	          itemHeight = void 0,
	          itemTop = void 0,
	          isNewRow = void 0,
	          rowTop = null;
	      var topHeight = 0;
	      for (var i = 0; i < this.buffer.length; i++) {
	        item = this.buffer[i];
	        itemTop = item.element.offset().top;
	        isNewRow = rowTop !== itemTop;
	        rowTop = itemTop;
	        if (isNewRow) {
	          itemHeight = item.element.outerHeight(true);
	        }
	        if (isNewRow && this.viewport.topDataPos() + topHeight + itemHeight <= this.viewport.topVisiblePos()) {
	          topHeight += itemHeight;
	        } else {
	          if (isNewRow) {
	            this['topVisible'] = item.item;
	            this['topVisibleElement'] = item.element;
	            this['topVisibleScope'] = item.scope;
	          }
	          break;
	        }
	      }
	    }
	  }, {
	    key: 'applyUpdate',
	    value: function applyUpdate(wrapper, newItems) {
	      var _this3 = this;
	
	      if (!angular.isArray(newItems)) {
	        return;
	      }
	
	      var keepIt = void 0;
	      var pos = this.buffer.indexOf(wrapper) + 1;
	
	      newItems.reverse().forEach(function (newItem) {
	        if (newItem === wrapper.item) {
	          keepIt = true;
	          pos--;
	        } else {
	          _this3.buffer.insert(pos, newItem);
	        }
	      });
	
	      if (!keepIt) {
	        wrapper.op = 'remove';
	      }
	    }
	  }]);
	
	  return Adapter;
	}();
	
	exports.default = Adapter;

/***/ }
/******/ ]);
//# sourceMappingURL=ui-scroll.js.map;

  }).apply(root, arguments);
});
}(this));

/*
# templates/tls_status/services/DomainsService.js               Copyright 2017 cPanel, Inc.
#                                                               All rights Reserved.
# copyright@cpanel.net                                             http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false, PAGE: false */
/* eslint-env es6 */
/* eslint camelcase: 0 */
/* jshint -W100 */
/* jshint -W089 */

define(
    'app/services/DomainsService',[
        "angular",
        "lodash",
        "cjt/util/locale",
        "cjt/services/APICatcher",
        "cjt/io/uapi-request",
        "cjt/io/uapi", // IMPORTANT: Load the driver so its ready
    ],
    function(angular, _, LOCALE, api, APIREQUEST) {
        "use strict";

        var AUTOSSL_CAN_WILDCARD = false;

        var app = angular.module("App");

        return app.factory("DomainsService", ["APICatcher", function DomainsService(api) {

            var domains;
            var domain_types;
            var installed_hosts;
            var ssl_domains;
            var auto_ssl_enabled = null;
            var autossl_override_enabled = null;
            var domain_search_options;
            var products = null;
            var autossl_excluded_domains = null;
            var available_product_upgrades = null;
            var upgrades_available = {};
            var validation_ranks = {
                "unsecured": 0,
                "self-signed": 0,
                "dv": 1,
                "autossl": 1,
                "ov": 2,
                "ev": 3
            };

            var validation_type_names = {
                "self-signed": LOCALE.maketext("Self-signed"),
                "unsecured": LOCALE.maketext("Unsecured"),
                "dv": LOCALE.maketext("Domain Validated"),
                "ov": LOCALE.maketext("Organization Validated"),
                "ev": LOCALE.maketext("Extended Validation"),
                "autossl": LOCALE.maketext("[asis,AutoSSL] Domain Validated")
            };

            function get_validation_type_name(validation_type) {
                if (validation_type_names[validation_type]) {
                    return validation_type_names[validation_type];
                }

                return LOCALE.maketext("Unknown Certificate Type");
            }

            /**
             * This is the description
             *
             * @method get_validation_ranks
             *
             * @param  {String} certiface asdflkjasdf
             *
             * return jsdocret maybe?
             *
             */
            function get_validation_ranks() {
                return validation_ranks;
            }


            function make_ssl_type_name(certificate) {
                if (!certificate) {
                    return "";
                }

                return get_validation_type_name(certificate.validation_type, certificate.is_autossl);
            }

            function is_autossl_enabled() {

                if (auto_ssl_enabled !== null) {
                    return auto_ssl_enabled;
                }
                auto_ssl_enabled = PAGE.autossl_enabled.toString() === "1" && PAGE.autossl_provider !== "";

                return is_autossl_enabled();

            }

            function is_autossl_override_enabled() {

                if (autossl_override_enabled !== null) {
                    return autossl_override_enabled;
                }

                autossl_override_enabled = PAGE.autossl_override_enabled.toString() === "1";

                return is_autossl_override_enabled();
            }

            function get_domain_search_options() {
                if (domain_search_options) {
                    return domain_search_options;
                }

                domain_search_options = {
                    domainType: {
                        label: LOCALE.maketext("Domain Types:"),
                        item_key: "type",
                        options: [{
                            "value": "main_domain",
                            "label": LOCALE.maketext("Main"),
                            "description": LOCALE.maketext("Only list Main domains.")
                        }, {
                            "value": "sub_domains",
                            "label": LOCALE.maketext("Subdomain"),
                            "description": LOCALE.maketext("Only list Subdomains.")
                        }, {
                            "value": "addon_domains",
                            "label": LOCALE.maketext("Addon Domains"),
                            "description": LOCALE.maketext("Only list Addon domains.")
                        }, {
                            "value": "parked_domains",
                            "label": LOCALE.maketext("Parked Domains"),
                            "description": LOCALE.maketext("Only list Parked domains.")
                        }, {
                            "value": "www_mail_domains",
                            "label": LOCALE.maketext("[asis,www] and [asis,mail] Domains"),
                            "description": LOCALE.maketext("Only list [asis,www] and [asis,mail] domains.")
                        }, {
                            "value": "proxy_sub_domains",
                            "label": LOCALE.maketext("Proxy Subdomains"),
                            "description": LOCALE.maketext("Only list Proxy Subdomains.")
                        }]
                    },
                    sslType: {
                        label: LOCALE.maketext("[asis,SSL] Types:"),
                        item_key: "certificate_type",
                        options: [{
                            "value": "unsecured",
                            "label": LOCALE.maketext("Unsecured"),
                            "description": LOCALE.maketext("Only list unsecured domains.")
                        }, {
                            "value": "self-signed",
                            "label": LOCALE.maketext("Self-signed"),
                            "description": LOCALE.maketext("Only list self-signed domains.")
                        }, {
                            "value": "autossl",
                            "label": LOCALE.maketext("[asis,AutoSSL DV] Certificate"),
                            "description": LOCALE.maketext("Only list domains with [asis,AutoSSL DV] Certificates.")
                        }, {
                            "value": "dv",
                            "label": LOCALE.maketext("DV Certificate"),
                            "description": LOCALE.maketext("Only list domains with [asis,DV] Certificates.")
                        }, {
                            "value": "ov",
                            "label": LOCALE.maketext("OV Certificate"),
                            "description": LOCALE.maketext("Only list domains with [asis,OV] Certificates.")
                        }, {
                            "value": "ev",
                            "label": LOCALE.maketext("EV Certificate"),
                            "description": LOCALE.maketext("Only list domains with [asis,EV] Certificates.")
                        }]
                    },
                    sslStatus: {
                        label: LOCALE.maketext("[asis,SSL] Statuses:"),
                        item_key: "certificate_status",
                        options: [{
                            "value": "active",
                            "label": LOCALE.maketext("Active"),
                            "description": LOCALE.maketext("Only list the domains with active certificates.")
                        }, {
                            "value": "expired",
                            "label": LOCALE.maketext("Expired"),
                            "description": LOCALE.maketext("Only list domains whose certificate is expiring soon.")
                        }, {
                            "value": "expiring_soon",
                            "label": LOCALE.maketext("Expiring Soon"),
                            "description": LOCALE.maketext("Only list domains whose certificate is expiring soon.")
                        }, {
                            "value": "unsecured",
                            "label": LOCALE.maketext("Unsecured"),
                            "description": LOCALE.maketext("Only list unsecured domains.")
                        }, {
                            "value": "has_autossl_problem",
                            "label": LOCALE.maketext("Has [asis,AutoSSL] Problems"),
                            "description": LOCALE.maketext("Only list the domains with [asis,AutoSSL] problems.")
                        }]
                    }
                };

                // Only want to display this column if autossl is enabled
                if (is_autossl_enabled()) {
                    domain_search_options.autoSSLStatus = {
                        label: LOCALE.maketext("[asis,AutoSSL] Statuses:"),
                        item_key: "domain_autossl_status",
                        options: [{
                            "value": "included",
                            "label": LOCALE.maketext("Included"),
                            "description": LOCALE.maketext("Only list domains that are not explicitly excluded during [asis,AutoSSL].")
                        }, {
                            "value": "excluded",
                            "label": LOCALE.maketext("Excluded"),
                            "description": LOCALE.maketext("Only list domains that will be explicitly excluded from [asis,AutoSSL].")
                        }]
                    };
                }

                return get_domain_search_options();
            }

            function _get_installed_certificate_for_domain_obj(domain_obj) {
                var ssl_domains = get_ssl_domains();
                var certificate = ssl_domains[domain_obj.virtual_host];
                return certificate;
            }

            function get_certificate_status(domain_obj) {
                var certificate_status = "";
                var certificate = _get_installed_certificate_for_domain_obj(domain_obj);

                if (!certificate) {

                    // There is not certificate for the vhost
                    certificate_status = LOCALE.maketext("No certificate available.");

                    if (is_autossl_enabled()) {
                        if (domain_obj.is_wildcard) {
                            certificate_status += " " + LOCALE.maketext("[asis,AutoSSL] does not support explicit wildcard domains.") + " " + LOCALE.maketext("You must purchase a certificate to secure this domain.");
                        } else if (domain_obj.excluded_from_autossl) {
                            certificate_status += " " + LOCALE.maketext("[asis,AutoSSL] will attempt to secure this website, but the domain will be excluded.");
                        } else {
                            if (domain_obj.is_www) {
                                certificate_status += " " + LOCALE.maketext("[asis,AutoSSL] will attempt to secure the domain when the parent domain “[_1]” renews.", domain_obj.www_parent);
                            } else {
                                certificate_status += " " + LOCALE.maketext("[asis,AutoSSL] will attempt to secure the domain the next time it runs.");
                            }
                        }
                    }

                } else {

                    if (!domain_obj.certificate_covers_domain) {
                        certificate_status = LOCALE.maketext("The installed certificate does not cover this domain.");
                    } else if (certificate.is_expired) {
                        certificate_status = LOCALE.maketext("Expired on [datetime,_1].", certificate.not_after);
                    } else {
                        certificate_status = LOCALE.maketext("Expires on [datetime,_1].", certificate.not_after);
                    }

                    if (domain_obj.certificate_will_autossl && domain_obj.excluded_from_autossl) {
                        if (domain_obj.is_www) {
                            certificate_status += " " + LOCALE.maketext("The certificate will renew via [asis,AutoSSL] when the parent domain “[_1]” renews, but this domain will be excluded.", domain_obj.www_parent);
                        } else {
                            certificate_status += " " + LOCALE.maketext("The certificate will renew via [asis,AutoSSL], but this domain will be excluded.");
                        }
                    } else if (domain_obj.certificate_will_autossl) {
                        if (domain_obj.is_www) {
                            certificate_status += " " + LOCALE.maketext("The certificate will renew via [asis,AutoSSL] when the parent domain “[_1]” renews.", domain_obj.www_parent);
                        } else {
                            certificate_status += " " + LOCALE.maketext("The certificate will renew via [asis,AutoSSL].");
                        }
                    } else if (!AUTOSSL_CAN_WILDCARD && domain_obj.is_wildcard) {
                        certificate_status += " " + LOCALE.maketext("This server cannot provision [asis,AutoSSL] certificates that secure wildcard domains.");
                    } else if (!certificate.is_autossl && !is_autossl_override_enabled()) {
                        certificate_status += " " + LOCALE.maketext("The certificate will not renew via [asis,AutoSSL] because it was not issued via [asis,AutoSSL].");
                    }

                }

                return certificate_status;
            }

            function _get_available_upgrades(certificate) {
                var validation_type = certificate ? certificate.validation_type : "unsecured";
                var v_rank = validation_ranks[validation_type] || 0;

                if (upgrades_available[v_rank]) {
                    return upgrades_available[v_rank];
                }

                var products_available = get_available_product_upgrades();
                upgrades_available[v_rank] = products_available.filter(function(upgrade) {
                    if (validation_ranks[upgrade] > v_rank) {
                        return true;
                    }
                    return false;
                });

                return _get_available_upgrades(certificate);
            }

            function _get_upgrade_btn_label(certificate) {

                var buttonLabel = "";

                var upgradesAvailable = _get_available_upgrades();

                if (!certificate || certificate.is_self_signed) {
                    buttonLabel = LOCALE.maketext("Purchase Certificate");
                } else {

                    if (certificate.will_autossl && upgradesAvailable.length) {

                        // Implies DV, Upgrade is possible
                        buttonLabel = LOCALE.maketext("Upgrade Certificate");
                    } else if (certificate.is_expired || certificate.expiring_soon) {

                        // Not auto-ssl, but renewable
                        buttonLabel = LOCALE.maketext("Renew Certificate");
                    } else if (upgradesAvailable.length) {
                        buttonLabel = LOCALE.maketext("Upgrade Certificate");
                    }

                }

                return buttonLabel;
            }

            function get_upgrade_btn_title(domain, certificate) {

                var upgrades_available = get_available_product_upgrades(certificate);

                var btn_label = "";

                if (!certificate || certificate.is_self_signed) {
                    btn_label = LOCALE.maketext("Purchase certificate for “[_1]”.", domain);
                } else {

                    if (certificate.will_autossl && upgrades_available.length) {

                        // Implies DV, Upgrade is possible
                        btn_label = LOCALE.maketext("Upgrade certificate for “[_1]”.", domain);
                    } else if (certificate.is_expired || certificate.expiring_soon) {

                        // Not auto-ssl, but renewable
                        btn_label = LOCALE.maketext("Renew certificate for “[_1]”.", domain);
                    } else if (upgrades_available.length) {
                        btn_label = LOCALE.maketext("Upgrade certificate for “[_1]”.", domain);
                    }

                }

                return btn_label;
            }

            function _check_certificate_autossl(certificate) {

                //If AutoSSL can’t secure wildcards, and if this
                //certificate includes a wildcard, then we won’t
                //replace the certificate.
                if (!AUTOSSL_CAN_WILDCARD) {
                    if (certificate.domains.join().indexOf("*") !== -1) {
                        return false;
                    }
                }

                if (is_autossl_enabled()) {
                    if (certificate.is_autossl) {

                        // If certificate is autossl created Then it's eligible for autossl
                        return true;
                    } else if (validation_ranks[certificate.validation_type] < validation_ranks["dv"]) {

                        // for unsecured and self-signed certificates, they will be renewed
                        return true;
                    } else if (is_autossl_override_enabled()) {

                        // Or the override is set to true
                        return true;
                    }
                }

                return false;

            }

            function autossl_include_domains(domains) {
                var apiCall = new APIREQUEST.Class().initialize(
                    "SSL",
                    "remove_autossl_excluded_domains", {
                        domains: domains.join(",")
                    }
                );

                return api.promise(apiCall);
            }

            function autossl_exclude_domains(domains) {
                var apiCall = new APIREQUEST.Class().initialize(
                    "SSL",
                    "add_autossl_excluded_domains", {
                        domains: domains.join(",")
                    }
                );

                return api.promise(apiCall);
            }

            function get_installed_hosts() {

                if (installed_hosts) {
                    return installed_hosts;
                }

                ssl_domains = {};
                installed_hosts = [];

                var current_date = new Date();

                PAGE.installed_hosts.forEach(function(ihost) {
                    ihost.certificate.is_self_signed = parseInt(ihost.certificate.is_self_signed, 10) === 1;

                    // Ensure this happens before _check_certificate_autossl()
                    ihost.certificate.is_autossl = ihost.certificate.is_autossl.toString() === "1";
                    ihost.certificate.validation_type = ihost.certificate.is_self_signed ? "self-signed" : ihost.certificate.validation_type;
                    ihost.certificate.validation_type = ihost.certificate.validation_type === "dv" && ihost.certificate.is_autossl ? "autossl" : ihost.certificate.validation_type;

                    // Give it a type name (for displaying)
                    ihost.certificate.type_name = make_ssl_type_name(ihost.certificate);

                    // Give it a URL
                    ihost.certificate.view_crt_url = "";
                    ihost.certificate.view_crt_url += "../../ssl/install.html?id=";
                    ihost.certificate.view_crt_url += encodeURIComponent(ihost.certificate.id);

                    ihost.certificate.will_autossl = _check_certificate_autossl(ihost.certificate);
                    ihost.certificate.expiration_date = new Date(ihost.certificate.not_after * 1000);
                    ihost.certificate.is_expired = ihost.certificate.expiration_date < current_date;

                    // Is expiring soon, true but not expired (for sorting).
                    var days_until_expire = (ihost.certificate.expiration_date - current_date) / 1000 / 60 / 60 / 24;
                    ihost.certificate.expiring_soon = days_until_expire < 30 && days_until_expire > 0;

                    // Add to the list
                    installed_hosts.push(ihost);
                    ssl_domains[ihost.servername] = ihost.certificate;
                });

                return get_installed_hosts();

            }

            function get_ssl_domains() {

                if (ssl_domains) {
                    return ssl_domains;
                }

                get_installed_hosts();

                return get_ssl_domains();

            }

            function add_raw_product(raw_product) {
                raw_product.id = raw_product.product_id;
                raw_product.provider = raw_product.provider_name;
                raw_product.provider_display_name = raw_product.provider_display_name || raw_product.provider;
                raw_product.price = Number(raw_product.x_price_per_domain);
                raw_product.wildcard_price = Number(raw_product.x_price_per_wildcard_domain);
                raw_product.wildcard_parent_domain_included = raw_product.x_wildcard_parent_domain_free && raw_product.x_wildcard_parent_domain_free.toString() === "1";
                raw_product.icon_mime_type = raw_product.icon_mime_type ? raw_product.icon_mime_type : "image/png";
                raw_product.is_wildcard = !isNaN(raw_product.wildcard_price) ? true : false;
                raw_product.x_certificate_term = raw_product.x_certificate_term || [1, "year"];
                raw_product.x_certificate_term_key = raw_product.x_certificate_term.join("_");
                raw_product.validity_period = raw_product.x_certificate_term;
                products.push(raw_product);
            }

            function get_available_product_upgrades() {
                if (available_product_upgrades) {
                    return available_product_upgrades;
                }

                available_product_upgrades = [];

                var validation_types = {};
                var products = get_products();
                angular.forEach(products, function(product) {
                    validation_types[product.x_validation_type] = 1;
                });

                angular.forEach(validation_types, function(type, key) {
                    available_product_upgrades.push(key);
                });

                return get_available_product_upgrades();
            }

            function get_products() {
                if (products) {
                    return products;
                }

                products = [];

                if (PAGE.products) {
                    angular.forEach(PAGE.products, function(product) {
                        add_raw_product(product);
                    });
                }

                return get_products();
            }

            function get_domain_types() {
                if (domain_types) {
                    return domain_types;
                }

                domain_types = {};

                angular.forEach(PAGE.domain_types, function(domains, domain_type) {

                    // main domain isn't an array
                    if (domain_type === "main_domain") {
                        domains = [domains];
                    }

                    // domains may be an object this this comes directly from userdata
                    // going to use angular forEach as it will cover object or array equally
                    angular.forEach(domains, function(domain) {
                        domain_types[domain] = domain_type;
                    });
                });

                return get_domain_types();
            }

            function _get_domain_type(domain) {

                var types = get_domain_types();
                var clean_domain = domain.replace(/^www./gi, "");
                return types[clean_domain] ? types[clean_domain] : LOCALE.maketext("Unknown");

            }

            function _make_domain(domain) {

                var domain_obj = {
                    domain: domain.domain,
                    virtual_host: domain.vhost_name,
                    certificate_type: "unsecured",
                    certificate_type_name: LOCALE.maketext("Unsecured"),
                    certificateStatusMessage: "",
                    certificate_is_self_signed: false,
                    certificate_is_autossl: false,
                    certificate_will_autossl: false,
                    certificate_status: "unsecured",
                    can_autossl_include: false,
                    can_autossl_exclude: false,
                    validation_rank: 0,
                    excluded_from_autossl: false,
                    domain_autossl_status: "included",
                    expiring_soon: false,
                    is_autosubdomain: false,
                    is_expired: false,
                    is_proxy: false,
                    is_www: false,
                    type: _get_domain_type(domain.domain)
                };

                var autossl_excludes = get_autossl_excluded_domains();

                if (autossl_excludes[domain_obj.domain]) {
                    domain_obj.excluded_from_autossl = true;
                    domain_obj.domain_autossl_status = "excluded";
                }

                var certificate = _get_installed_certificate_for_domain_obj(domain_obj);

                domain_obj.is_wildcard = domain.domain.indexOf("*.") === 0;
                domain_obj.is_proxy = domain.is_proxy.toString() === "1";
                domain_obj.is_www = domain_obj.domain.match(/^www\./);
                domain_obj.is_mail = domain_obj.domain.match(/^mail\./);
                domain_obj.www_parent = domain_obj.domain.replace(/^www\./, "");

                if (domain_obj.is_www || domain_obj.is_mail) {
                    domain_obj.type = "www_mail_domains";
                } else if (domain_obj.is_proxy) {
                    domain_obj.type = "proxy_sub_domains";
                }

                if (certificate) {

                    // treating unsecured and self-signed the same for sorting
                    domain_obj.certificate = certificate;
                    domain_obj.certificate_type = certificate.validation_type;
                    domain_obj.certificate_is_autossl = certificate.is_autossl;
                    domain_obj.certificate_will_autossl = certificate.will_autossl;
                    domain_obj.certificate_type_name = get_validation_type_name(domain_obj.certificate_type, certificate.is_autossl);
                    domain_obj.certificate_is_self_signed = certificate.is_self_signed;
                    domain_obj.expiring_soon = certificate.expiring_soon;
                    domain_obj.is_expired = certificate.is_expired;
                    domain_obj.view_crt_url = certificate.view_crt_url;
                    domain_obj.validation_rank = validation_ranks[certificate.validation_type];
                    domain_obj.certificate_covers_domain = 0;
                    angular.forEach(certificate.domains, function(domain) {
                        if (domain_obj.domain === domain) {
                            domain_obj.certificate_covers_domain = 1;
                        }

                        var wildcard_domain = domain_obj.domain.replace(/^[^.]+\./, "*.");
                        if (wildcard_domain === domain) {
                            domain_obj.certificate_covers_domain = 1;

                        }
                    });
                    if (!domain_obj.certificate_covers_domain) {
                        domain_obj.certificate_type = "unsecured";
                        domain_obj.certificate_type_name = get_validation_type_name(domain_obj.certificate_type, certificate.is_autossl);
                    }

                    // for sorting purposes does not include expiring_soon
                    domain_obj.is_active = !domain_obj.is_expired && !domain_obj.expiring_soon;
                } else {
                    domain_obj.certificate_will_autossl = is_autossl_enabled() && !domain_obj.is_wildcard;
                }

                domain_obj.can_autossl_exclude = is_autossl_enabled() && domain_obj.certificate_will_autossl && !domain_obj.is_wildcard;

                domain_obj.is_autosubdomain = /^www./.test(domain.domain);

                if (domain_obj.is_active) {
                    domain_obj.certificate_status = "active";
                } else if (domain_obj.is_expired) {
                    domain_obj.certificate_status = "expired";

                    // It's not secured by a valid cert, make the icon reflect that
                    domain_obj.certificate_type = "unsecured";
                    domain_obj.certificate_type_name = get_validation_type_name(domain_obj.certificate_type, certificate.is_autossl);
                } else if (domain_obj.expiring_soon) {
                    domain_obj.certificate_status = "expiring_soon";
                }

                domain_obj.available_upgrades = _get_available_upgrades(certificate);
                domain_obj.certificateStatusMessage = get_certificate_status(domain_obj);
                domain_obj.upgrade_btn_label = _get_upgrade_btn_label(certificate);
                domain_obj.view_certificate_title = LOCALE.maketext("View certificate for the website “[_1]”.", domain_obj.virtual_host, domain_obj.domain);

                domain_obj.exclude_autossl_btn_title = LOCALE.maketext("Exclude “[_1]” from [asis,AutoSSL].", domain_obj.domain);
                domain_obj.include_autossl_btn_title = LOCALE.maketext("Include “[_1]” during [asis,AutoSSL].", domain_obj.domain);

                return domain_obj;
            }

            function get_autossl_excluded_domains() {
                if (autossl_excluded_domains) {
                    return autossl_excluded_domains;
                }

                autossl_excluded_domains = {};

                angular.forEach(PAGE.autossl_excluded_domains, function(domain) {
                    this[domain.excluded_domain] = domain.excluded_domain;
                }, autossl_excluded_domains);

                return get_autossl_excluded_domains();
            }

            function get_domains() {
                if (domains) {
                    return domains;
                }

                var unique_domains = {};
                domains = [];

                PAGE.domains.forEach(function(domain) {

                    var domain_obj = _make_domain(domain);
                    unique_domains[domain_obj.domain] = domain_obj;

                });

                angular.forEach(unique_domains, function(domain) {
                    domains.push(domain);
                });

                return get_domains();
            }

            /**
             * Get a list of AutoSSL Problems
             *
             * @method getAutoSSLStatuses
             *
             * @return {Promise} returns a promise that returns an object with problems and statuses
             *
             * {
             *     problems:
             *         [
             *             {
             *                 "time": "2017-08-31T03:51:18Z",
             *                 "domain": "www.soon.not.on.lock.down",
             *                 "problem": "\u201cwww.soon.not.on.lock.down\u201d does not resolve to any IPv4 addresses on the internet."
             *             }
             *         ],
             *     queue_statuses:
             *         [
             *             {
             *                  "request_time" : "2016-01-01T00:02:03Z",
             *                  "last_poll_time" : "2017-09-01T16:14:09Z",
             *                  "domain" : "addon.lock.down",
             *                  "vhost_name" : "addon.lock.down",
             *                  "order_item_id" : "oiid1"
             *              }
             *         ]
             *  }
             *
             */
            function getAutoSSLStatuses() {
                if ( !is_autossl_enabled() ) {
                    return false;
                }
                var apiCall = new APIREQUEST.Class();

                apiCall.initialize("Batch", "strict");

                apiCall.addArgument("command", [
                    JSON.stringify(["SSL", "get_autossl_problems"]),
                    JSON.stringify(["SSL", "get_autossl_pending_queue"])
                ]);

                return api.promise(apiCall).then(function(result) {
                    var statuses = {};

                    var problems = result.data[0].data;
                    var queue = result.data[1].data;

                    queue.forEach(function(queueItem) {
                        var domain = queueItem.domain;
                        statuses[domain] = {
                            domain: domain,
                            status: LOCALE.maketext("The [asis,AutoSSL] certificate is pending issuance for this domain."),
                            runTime: new Date(queueItem.last_poll_time)
                        };
                    });

                    problems.forEach(function(problem) {
                        var domain = problem.domain;
                        statuses[domain] = {
                            domain: domain,
                            status: LOCALE.maketext("An error occurred during the last [asis,AutoSSL] run for this domain."),
                            runTime: new Date(problem.time),
                            error: problem.problem
                        };
                    });

                    return Object.keys(statuses).map(function(domain) {
                        return statuses[domain];
                    });
                });

            }

            /**
             * Start an AutoSSL check for the current user
             *
             * @method startUserAutoSSL
             *
             * @return {Promise} returns the api call promise
             *
             */
            function startUserAutoSSL() {
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("SSL", "start_autossl_check");

                return api.promise(apiCall);
            }

            /**
             * Check to see if AutoSSL is already in progress
             *
             * @method isAutoSSLCheckInProgress
             *
             * param jsdocparam maybe?
             *
             * @return {Boolean} returns the boolean of whether a check is in progress
             *
             */
            function isAutoSSLCheckInProgress() {
                if ( !is_autossl_enabled() ) {
                    return false;
                }
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("SSL", "is_autossl_check_in_progress");

                return api.promise(apiCall).then(function(result) {
                    return result.data.toString() === "1";
                });
            }

            return {
                get_domains: get_domains,
                get_products: get_products,
                get_upgrade_btn_title: get_upgrade_btn_title,
                autossl_include_domains: autossl_include_domains,
                autossl_exclude_domains: autossl_exclude_domains,
                get_ssl_domains: get_ssl_domains,
                get_installed_hosts: get_installed_hosts,
                get_domain_search_options: get_domain_search_options,
                is_autossl_enabled: is_autossl_enabled,
                make_ssl_type_name: make_ssl_type_name,
                get_validation_type_name: get_validation_type_name,
                get_validation_ranks: get_validation_ranks,
                get_certificate_status: get_certificate_status,
                getAutoSSLStatuses: getAutoSSLStatuses,
                startUserAutoSSL: startUserAutoSSL,
                isAutoSSLCheckInProgress: isAutoSSLCheckInProgress
            };

        }]);
    }
);

/*
 * base/frontend/paper_lantern/security/tls_status/views/ViewDomainsController.js
 *                                                    Copyright 2018 cPanel, Inc.
 *                                                           All rights reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false */
/* jshint -W100, -W104 */
/* eslint-env es6 */
/* eslint camelcase: 0 */

define(
    'app/views/ViewDomainsController',[
        "angular",
        "cjt/core",
        "cjt/util/locale",
        "cjt/util/query",
        "uiBootstrap",
        "cjt/modules",
        "cjt/directives/cpanel/searchSettingsPanel",
        "cjt/models/searchSettingsModel",
        "app/services/DomainsService",
        "cjt/decorators/growlDecorator",
        "cjt/directives/actionButtonDirective"
    ],
    function(angular, CJT, LOCALE, QUERY) {
        "use strict";

        const TLS_WIZ_URL = "security/tls_wizard/#/create";

        var app = angular.module("App");

        app.controller("ViewDomainsController", [
            "$scope",
            "$timeout",
            "$filter",
            "$window",
            "$location",
            "DomainsService",
            "$routeParams",
            "SearchSettingsModel",
            "user_domains",
            "search_filter_settings",
            "growl",
            function ViewDomainsController($scope, $timeout, $filter, $window, $location, $service, $routeParams, SearchSettingsModel, user_domains, search_filter_settings, growl) {

                $scope.domains = user_domains;
                $scope.filteredDomains = $scope.domains;
                $scope.selected_auto_ssl_domains = {
                    excluded: [],
                    included: []
                };
                $scope.unsecuredDomains = [];
                $scope.quickFilterValue = "";
                $scope.showPager = true;
                $scope.autossl_enabled = $service.is_autossl_enabled;
                $scope.autoSSLErrorsExist = false;

                $scope.meta = {
                    filterValue: ""
                };

                var last_descriptor = null;

                $scope.datasource = {
                    get: function(descriptor, success) {

                        var result = $scope.filteredDomains.slice(Math.max(descriptor.index, 0), descriptor.index + descriptor.count);
                        success(result);

                        last_descriptor = descriptor;

                        last_descriptor.position = $window.pageYOffset;

                    }
                };

                // When scrolling up a lot, check number of items we are transitioning and "reload" if necessary
                $scope.check_for_reload = function() {

                    if (!last_descriptor) {
                        return;
                    }

                    var new_first_item = -1;
                    var max_loaded = last_descriptor.index + last_descriptor.count;

                    if ($window.pageYOffset === 0) {

                        // reset to zero
                        new_first_item = 0;
                    } else {

                        var position = $window.pageYOffset;
                        var perc_scrolled = last_descriptor.position / position;

                        new_first_item = max_loaded * perc_scrolled;

                    }

                    // If we are skipping more than "n" items, reload
                    if (max_loaded - new_first_item > 200) {

                        // Gotta Math.max this because: Safari
                        new_first_item = Math.max(new_first_item, 0);
                        $scope.uiScrollAdapter.reload(new_first_item);
                    }


                };

                $scope.autossl_include_domains = function(domains) {
                    var flat_domains = domains.map(function(domain) {
                        domain.updating = true;
                        return domain.domain;
                    });

                    return $service.autossl_include_domains(flat_domains).then(function() {
                        growl.success(LOCALE.maketext("The following domains have had their [asis,AutoSSL] exclusion removed: [list_and_quoted,_1]", flat_domains));
                        domains.forEach(function(domain) {
                            domain.excluded_from_autossl = false;
                            domain.domain_autossl_status = "included";
                            domain.certificate_status_name = $service.get_certificate_status(domain);
                        });
                    }).finally(function() {
                        domains.forEach(function(domain) {
                            domain.updating = false;
                        });
                        $scope.update_auto_ssl_domains();
                    });
                };

                $scope.autossl_exclude_domains = function(domains) {
                    var flat_domains = domains.map(function(domain) {
                        domain.updating = true;
                        return domain.domain;
                    });

                    return $service.autossl_exclude_domains(flat_domains).then(function() {
                        growl.success(LOCALE.maketext("The following domains will now be excluded from the [asis,AutoSSL] process: [list_and_quoted,_1]", flat_domains));
                        domains.forEach(function(domain) {
                            domain.excluded_from_autossl = true;
                            domain.domain_autossl_status = "excluded";
                            domain.certificate_status_name = $service.get_certificate_status(domain);
                        });
                    }).finally(function() {
                        domains.forEach(function(domain) {
                            domain.updating = false;
                        });
                        $scope.update_auto_ssl_domains();
                    });

                };

                $scope.autossl_include_domain = function(domain) {
                    return $scope.autossl_include_domains([domain]);
                };

                $scope.autossl_exclude_domain = function(domain) {
                    return $scope.autossl_exclude_domains([domain]);
                };

                $scope.exclude_autossl_label = function(domains) {
                    if (domains.length === 0) {
                        return LOCALE.maketext("Exclude Domains from AutoSSL", domains.length);
                    } else {
                        return LOCALE.maketext("Exclude [quant,_1,Domain,Domains] from AutoSSL", domains.length);
                    }
                };

                $scope.include_autossl_label = function(domains) {
                    if (domains.length === 0) {
                        return LOCALE.maketext("Include Domains during AutoSSL", domains.length);
                    } else {
                        return LOCALE.maketext("Include [quant,_1,Domain,Domains] during AutoSSL", domains.length);
                    }
                };

                $scope.searchFilterOptions = new SearchSettingsModel(search_filter_settings);

                /**
                 * Clears the search term
                 *
                 * @scope
                 * @method clearSearch
                 */
                $scope.clearSearch = function() {
                    $scope.meta.filterValue = "";
                    $scope.domainSearchFilterChanged();
                };

                $scope.filter_domains = function(domains) {

                    var filtered_domains = domains;

                    if ($scope.meta.filterValue) {
                        filtered_domains = $filter("filter")(filtered_domains, {
                            "domain": $scope.meta.filterValue
                        });
                    }

                    filtered_domains = $scope.searchFilterOptions.filter(filtered_domains);

                    return filtered_domains;
                };

                $scope.update_auto_ssl_domains = function() {
                    $scope.selected_auto_ssl_domains = {
                        excluded: [],
                        included: []
                    };

                    angular.forEach($scope.filteredDomains, function(domain) {
                        if (!domain.can_autossl_exclude) {
                            return;
                        }
                        if (domain.selected) {
                            if (domain.excluded_from_autossl) {
                                $scope.selected_auto_ssl_domains.excluded.push(domain);
                            } else {
                                $scope.selected_auto_ssl_domains.included.push(domain);
                            }
                        }
                    }, $scope.selected_auto_ssl_domains);
                };

                $scope.searchSettingsPanelUpdated = function() {
                    $scope.fetch();
                };

                $scope.fetch = function() {

                    var new_domains = $scope.domains;

                    new_domains = $scope.filter_domains(new_domains);

                    // prevent some unnecessary flickering when it's showing all the domains
                    var domains_changed = $scope.filteredDomains.length !== $scope.domains.length || new_domains.length !== $scope.filteredDomains.length;

                    if (domains_changed) {
                        $scope.filteredDomains = new_domains;
                        if ($scope.uiScrollAdapter && angular.isFunction($scope.uiScrollAdapter.reload)) {
                            $scope.uiScrollAdapter.reload(0);
                        }
                    }

                    $scope.update_auto_ssl_domains();

                    $scope.update_showing_text();

                };

                $scope.no_results_msg = function() {
                    return LOCALE.maketext("No results found…");
                };

                $scope.get_advanced_filter_label = function(filterType) {

                    if (filterType === "displayAutoSubdomains") {
                        return $scope.advancedFilters.displayAutoSubdomains ? LOCALE.maketext("Yes") : LOCALE.maketext("No");
                    }

                    var filterOptions = $scope[filterType + "Options"];

                    if (filterOptions) {
                        for (var i = 0; i < filterOptions.length; i++) {
                            if (filterOptions[i].value === $scope.advancedFilters[filterType]) {
                                return filterOptions[i].label;
                            }
                        }
                    }

                    return "";

                };

                $scope.advanced_filters_set = function() {

                    if ($scope.advancedFilters.domainType !== "all" || $scope.advancedFilters.sslType !== "all" || $scope.advancedFilters.sslStatus !== "all" || !$scope.advancedFilters.displayAutoSubdomains) {
                        return true;
                    }

                    return false;
                };

                $scope.update_showing_text = function() {
                    $scope.showing_text = LOCALE.maketext("[output,strong,Showing] [numf,_1] of [quant,_2,domain,domains]", $scope.filteredDomains.length, $scope.domains.length);
                };

                $scope.get_showing_text = function() {
                    return $scope.showing_text;
                };

                $scope.view_certificate = function(domain) {
                    return $window.open(domain.view_crt_url);
                };

                $scope._get_tls_wizard_url = function(params) {
                    var url = TLS_WIZ_URL;

                    // same logic exists in _assets/MasterController.js
                    // exposing this as a service layer might be useful
                    if (url.search(/^http/i) === -1) {
                        if (url.search(/^\//) !== -1) {
                            url = CJT.getRootPath() + url;
                        } else {
                            url = CJT.buildFullPath(url);
                        }
                    }

                    url += "?" + QUERY.make_query_string(params);

                    return url;
                };

                $scope.get_root_domain = function(domain) {

                    var root_domain = domain;

                    if (domain.domain.match(/^www\./)) {
                        root_domain = $scope.find_domain_by_domain(domain.domain.replace(/^www\./, ""));
                    }

                    return root_domain;

                };

                $scope.upgrade_certificate_url = function(domain) {

                    if (domain) {
                        var params = {
                            domain: $scope.get_root_domain(domain).domain,
                            certificate_type: domain.available_upgrades,
                        };

                        return $scope._get_tls_wizard_url(params);
                    }
                };

                $scope.purchase_certificate = function(domains) {
                    var params = {
                        domain: domains.map(function(domain) {
                            var actual_domain = $scope.get_root_domain(domain);
                            return actual_domain.domain;
                        }),
                        certificate_type: ["dv", "ov", "ev"],
                    };

                    window.open($scope._get_tls_wizard_url(params), "_self");
                    return false;
                };

                $scope.domainSearchFilterChanged = function() {
                    if ($scope.meta.filterValue) {
                        $location.search("domain", $scope.meta.filterValue);
                    } else {
                        $location.search("domain", null);
                    }
                    $scope.fetch();
                };

                $scope.get_unsecured_domains_message = function(domains) {
                    return LOCALE.maketext("You have [numf,_1] unsecured parent [numerate,_1,domain,domains]. Would you like to purchase [numerate,_1,a certificate for that domain, certificates for those domains]?", domains.length);
                };

                $scope.getUnsecuredDomainsMessageNote = function() {
                    return LOCALE.maketext("[output,strong,Note:] The number of “parent” domains excludes the ”www“ domains because the system automatically includes them during purchase if they pass [output,abbr,DCV,Domain Control Validation].");
                };

                $scope.find_domain_by_domain = function(domain) {
                    for (var i = 0; i < $scope.domains.length; i++) {
                        if ($scope.domains[i].domain === domain) {
                            return $scope.domains[i];
                        }
                    }
                };

                $scope.get_domain_lock_tooltip = function(tooltip_type, is_autossl, domain_type) {

                    var validation_ranks = $service.get_validation_ranks();

                    if (validation_ranks[domain_type] > validation_ranks[tooltip_type]) {

                        // Hard coded "is_autossl" for tooltip purposes
                        return $service.get_validation_type_name(tooltip_type, false);
                    } else if (validation_ranks[domain_type] === validation_ranks[tooltip_type]) {
                        return $service.get_validation_type_name(tooltip_type, is_autossl);
                    }

                    // Hard coded "is_autossl" for tooltip purposes
                    if ($service.tls_wizard_can_do_validation_type(tooltip_type)) {
                        return LOCALE.maketext("Upgrade to [_1]", $service.get_validation_type_name(tooltip_type, false));
                    }

                    return "";
                };

                $scope.show_unsecured_domains = function() {
                    $scope.searchFilterOptions.show_only("sslType", "unsecured");
                    $scope.fetch();
                };

                $scope.get_upgrade_btn_title = function(domain) {
                    if (domain.upgrade_btn_title) {
                        return domain.upgrade_btn_title;
                    }
                    var root_domain = $scope.get_root_domain(domain);
                    domain.upgrade_btn_title = $service.get_upgrade_btn_title(root_domain.domain, domain.certificate);
                    return domain.upgrade_btn_title;
                };

                $scope.selectAllItems = function(allRowsSelected) {
                    angular.forEach($scope.filteredDomains, function(row) {
                        row.selected = allRowsSelected;
                    });
                    $scope.update_auto_ssl_domains();
                };

                $scope.getRawLogWarning = function() {
                    return LOCALE.maketext("Because some entries contain raw log data, the system may not translate it into the chosen language or locale.");
                };

                function _buildCheckCycle() {
                    $timeout(function() {

                        // Check the status of the AutoSSL check
                        $service.isAutoSSLCheckInProgress().then(function(inProgress) {

                            // If it's not in progress, notify and reload
                            if (!inProgress) {
                                $scope.autoSSLCheckActive = false;
                                var messageTime = 5;
                                growl.success(LOCALE.maketext("The [asis,AutoSSL] check has completed. The page will refresh in [quant,_1,second,seconds].", messageTime), {
                                    ttl: messageTime * 1000,
                                    disableCountDown: false
                                });
                                $timeout(function() {
                                    $window.location.reload();
                                }, 1000 * messageTime);
                            } else {
                                _buildCheckCycle();
                            }
                        });
                    }, 1000 * 60);
                }

                /**
                 * Get the label for the AutoSSL check button
                 *
                 * @method startUserAutoSSLLabel
                 *
                 * @return {String} returns the label for the current AutoSSL state
                 *
                 */
                $scope.startUserAutoSSLLabel = function() {
                    if ($scope.autoSSLCheckActive) {
                        return LOCALE.maketext("[asis,AutoSSL] is in progress …");
                    } else {
                        return LOCALE.maketext("Run [asis,AutoSSL]");
                    }
                };

                /**
                 * Start the AutoSSL run for this user
                 *
                 * @method startUserAutoSSL
                 *
                 * @return {Promise} returns promise, mostly for cpaction button to run for minutes
                 *
                 */
                $scope.startUserAutoSSL = function() {
                    $scope.autoSSLCheckActive = true;
                    $service.startUserAutoSSL().then(_buildCheckCycle);
                };


                $scope.init = function() {

                    if ($routeParams["domain"]) {
                        $scope.meta.filterValue = $routeParams["domain"];
                    }

                    angular.element($window).bind("scroll", $scope.check_for_reload);

                    var all_unsecured_domains = [];

                    $scope.domains.forEach(function(domain) {
                        domain.upgrade_btn_title = $scope.get_upgrade_btn_title(domain);
                        if (domain.certificate_type === "unsecured") {
                            all_unsecured_domains.push(domain);
                        }
                    });

                    var unsecuredActuals = [];
                    var uniqueDomains = {};

                    angular.forEach(all_unsecured_domains, function(domain) {

                        var actual_domain = $scope.get_root_domain(domain);

                        if (actual_domain.certificate_type !== "unsecured") {
                            return false;
                        }

                        if (actual_domain && !uniqueDomains[actual_domain.domain]) {
                            uniqueDomains[actual_domain.domain] = actual_domain;
                            unsecuredActuals.push(actual_domain);
                        }

                    });

                    $scope.market_products_available = !!$service.get_products().length;

                    $scope.unsecuredDomains = unsecuredActuals;

                    $scope.fetch();

                    if ( $service.is_autossl_enabled() ) {
                        $timeout(function() {

                            // Load AutoSSL Logs
                            $service.getAutoSSLStatuses().then(function(statuses) {

                                statuses.forEach(function(status) {

                                    var domainObj = $scope.find_domain_by_domain(status.domain);

                                    if (!domainObj) {
                                        return;
                                    }

                                    domainObj.autoSSLStatus = status;
                                    if (status.error) {
                                        $scope.autoSSLErrorsExist = true;
                                        domainObj.certificate_status = "has_autossl_problem";
                                        domainObj.autoSSLStatus.lastRunMessage = LOCALE.maketext("An error occurred the last time [asis,AutoSSL] ran, on [datetime,_1]:", domainObj.autoSSLStatus.runTime.getTime() / 1000);
                                    } else {
                                        domainObj.autoSSLStatus.lastRunMessage = LOCALE.maketext("[asis,AutoSSL] last ran on [datetime,_1].", domainObj.autoSSLStatus.runTime.getTime() / 1000);
                                    }

                                });

                                // Necessary because expired >> has_autossl_problem will continue to show if filtered as such until this is refreshed
                                $scope.fetch();
                            });

                            $service.isAutoSSLCheckInProgress().then(function(inProgress) {
                                $scope.initialAutoSSLCheckComplete = true;
                                $scope.autoSSLCheckActive = inProgress;
                                if ($scope.autoSSLCheckActive) {
                                    _buildCheckCycle();
                                }
                            });

                        }, 50);
                    }
                };

                $scope.$on("$destroy", function() {
                    angular.element($window).unbind("scroll", $scope.check_for_reload);
                });

                $scope.init();

            }
        ]);


    });

/* global define: false, require: false */

define(
    'app/index',[
        "angular",
        "cjt/core",
        "cjt/modules",
        "uiBootstrap",
        "ngRoute",
        "ngAnimate",
        "angular-ui-scroll"
    ],
    function(angular, CJT) {
        return function() {
            "use strict";

            angular.module("App", [
                "ui.bootstrap",
                "angular-growl",
                "cjt2.cpanel",
                "ui.scroll",
                "ngAnimate"
            ]);

            var app = require(
                [
                    "cjt/bootstrap",
                    "app/services/DomainsService",
                    "app/views/ViewDomainsController"
                ],
                function(BOOTSTRAP) {

                    var app = angular.module("App");

                    app.value("PAGE", CPANEL.PAGE);

                    // If using views
                    app.controller("BaseController", ["$rootScope", "$scope", "$route", "$location",
                        function($rootScope, $scope, $route, $location) {

                            $scope.loading = false;

                            // Convenience functions so we can track changing views for loading purposes
                            $rootScope.$on("$routeChangeStart", function(event, next, current) {
                                if (!current || next.loadedTemplateURL !== current.loadedTemplateURL) {
                                    $scope.loading = true;
                                }
                            });
                            $rootScope.$on("$routeChangeSuccess", function() {
                                $scope.loading = false;
                            });
                            $rootScope.$on("$routeChangeError", function() {
                                $scope.loading = false;
                            });
                            $scope.current_route_matches = function(key) {
                                return $location.path().match(key);
                            };
                            $scope.go = function(path) {
                                $location.path(path);
                            };
                        }
                    ]);

                    // viewName

                    app.config(["$routeProvider", "growlProvider",
                        function($routeProvider, growlProvider) {

                            // $locationProvider.html5Mode(true);
                            // $locationProvider.hashPrefix("!");

                            growlProvider.globalPosition("top-right");

                            $routeProvider.when("/", {
                                controller: "ViewDomainsController",
                                templateUrl: CJT.buildFullPath("security/tls_status/views/view_domains.html.tt"),
                                resolve: {
                                    "user_domains": ["DomainsService", function($service) {
                                        return $service.get_domains();
                                    }],
                                    "search_filter_settings": ["DomainsService", function($service) {
                                        return $service.get_domain_search_options();
                                    }]
                                }
                            });

                            $routeProvider.otherwise({
                                "redirectTo": "/"
                            });

                        }
                    ]);

                    // end of using views

                    BOOTSTRAP("#content", "App");

                });

            return app;
        };
    }
);

