/*
# user_manager/directives/limit.js                Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular",
        "lodash",
        "cjt/core",
        "cjt/util/locale",
        "cjt/directives/bytesInput",
        "app/directives/selectOnFocus"
    ],
    function(angular, _, CJT, LOCALE) {

        var module = angular.module("App");
        module.directive("appLimit", [
            "$timeout",
            "$templateCache",
            "$document",
            function($timeout, $templateCache, $document) {
                var _counter = 1;
                var TEMPLATE_PATH = "directives/limit.ptt";
                var RELATIVE_PATH = "user_manager/" + TEMPLATE_PATH;

                var SCOPE_DECLARATION = {
                    id: "@?id",
                    unitsLabel: "@?unitsLabel",
                    unlimitedLabel: "@?unlimitedLabel",
                    unlimitedValue: "=unlimitedValue",
                    minimumValue: "=minimumValue",
                    maximumValue: "=maximumValue",
                    isDisabled: "=ngDisabled",
                    defaultValue: "=defaultValue",
                    maximumLength: "=maximumLength",
                    selectedUnit: "="
                };

                var UNLIMITED_DEFAULT_LABEL = "Unlimited";
                var UNLIMITED_DEFAULT_VALUE = 0;

                var _focusElement = function(el, wait) {
                    if (!el) {
                        return;
                    }

                    // https://developer.mozilla.org/en-US/docs/Web/API/Document/activeElement
                    var elFocus = $document.activeElement ? $document.activeElement : null;
                    if (elFocus !== el) {
                        if (angular.isUndefined(wait)) {
                            el.focus();
                        } else {
                            $timeout(function() {
                                el.focus();
                            }, wait);
                        }
                    }
                };

                return {
                    restrict: "E",
                    templateUrl: CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : TEMPLATE_PATH,
                    replace: true,
                    require: "ngModel",
                    scope: SCOPE_DECLARATION,
                    compile: function(element, attrs) {
                        return {
                            pre: function(scope, element, attrs) {
                                if (angular.isUndefined(attrs.unlimitedLabel)) {
                                    attrs.unlimitedLabel = UNLIMITED_DEFAULT_LABEL;
                                }

                                if (!attrs.id) {
                                    attrs.id = "ctrlLimit_" + _counter++;
                                }
                            },
                            post: function(scope, element, attrs, ngModel) {
                                if (angular.isUndefined(scope.unlimitedValue)) {
                                    scope.unlimitedValue = UNLIMITED_DEFAULT_VALUE;
                                }

                                if (angular.isUndefined(scope.minimumValue)) {
                                    scope.minimumValue = 1;
                                }

                                scope.maximumLength = _parseIntOrDefault(scope.maximumLength, null);
                                scope.unlimitedValue = _parseIntOrDefault(scope.unlimitedValue, 0);
                                scope.minimumValue = _parseIntOrDefault(scope.minimumValue, 1);
                                scope.maximumValue = _parseIntOrDefault(scope.maximumValue, null);
                                scope.defaultValue = _parseIntOrDefault(scope.defaultValue, null);
                                scope.selectedUnit = scope.selectedUnit || "MB";

                                var elNumber = element.find(".textbox");

                                // Define how to transform the model into the parts needed for the view
                                ngModel.$formatters.push(function(modelValue) {
                                    var unlimitedChecked = modelValue === scope.unlimitedValue;
                                    return {
                                        unlimitedChecked: unlimitedChecked,
                                        value: unlimitedChecked ? "" : modelValue
                                    };
                                });

                                // Define how to draw the output when the model changes
                                ngModel.$render = function() {
                                    scope.unlimitedChecked = ngModel.$viewValue.unlimitedChecked;
                                    scope.value = ngModel.$viewValue.value;
                                };

                                // Define how to transform the view into the model
                                ngModel.$parsers.push(function(viewValue) {
                                    if (viewValue.unlimitedChecked) {
                                        return scope.unlimitedValue;
                                    } else {
                                        return viewValue.value;
                                    }
                                });

                                // Define how to set the view value when the view changes
                                scope.$watch("unlimitedChecked + value", function(newValue, oldValue) {
                                    if (newValue === oldValue) {
                                        return;
                                    }

                                    ngModel.$setViewValue({
                                        unlimitedChecked: scope.unlimitedChecked,
                                        value: scope.unlimitedChecked ? "" : scope.value
                                    });
                                });

                                // input[type=number] do not natively respect the maxlength attribute
                                // the way a input[type=text] does. This even handler adds the missing
                                // behavior.
                                if (scope.maximumLength && scope.maximumLength > 0) {
                                    elNumber.on("input", function(e) {
                                        if (this.value.length > scope.maximumLength) {
                                            this.value = this.value.slice(0, scope.maximumLength);
                                        }
                                    });
                                }

                                /**
                                 * Handler for when the unlimited/unrestricted radio button is clicked or selected
                                 */
                                scope.makeUnlimited = function() {
                                    if (scope.value !== "") {
                                        scope.lastValue = scope.value;
                                    } else if (scope.defaultValue) {
                                        scope.lastValue = scope.defaultValue;
                                    } else {
                                        scope.lastValue = scope.minimumValue;
                                    }
                                    scope.unlimitedChecked = true;
                                    scope.value = "";
                                };

                                /**
                                 * Handler for when the limited/restricted radio button or the click shield for the
                                 * input field is clicked or selected.
                                 */
                                scope.enableLimit = function() {
                                    if (!scope.isDisabled) {
                                        if (scope.unlimitedChecked) {
                                            if (scope.value === "") {

                                                // changing from unlimited to limits
                                                if (scope.lastValue !== "") {
                                                    scope.value = scope.lastValue;
                                                } else if (scope.defaultValue) {
                                                    scope.value = scope.defaultValue;
                                                } else {
                                                    scope.value = scope.minimumValue;
                                                }
                                            }
                                            scope.unlimitedChecked = false;
                                        }

                                        if ( elNumber.length === 0 ) {
                                            elNumber = element.find(".textbox");
                                        }

                                        _focusElement(elNumber, 0);
                                    }
                                };

                                // Setup the defaults for things not part of the ngModel handlers above.
                                if (scope.defaultValue) {
                                    scope.lastValue = scope.defaultValue;
                                } else {
                                    scope.lastValue = scope.minimumValue;
                                }
                            }
                        };
                    }
                };
            }
        ]);

        function _parseIntOrDefault(value, defaultValue) {
            if (angular.isString(value)) {
                value = parseInt(value, 10); // parseInt returns NaN with undefined, null, or empty strings
            }
            return isNaN(value) ? defaultValue : value;
        }
    }
);
