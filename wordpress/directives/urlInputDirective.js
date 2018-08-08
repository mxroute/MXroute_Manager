/*
 * wordpress/directives/urlInputDirective.js          Copyright 2017 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false */

define([
    "angular",
    "cjt/core",
], function(
    angular,
    CJT
) {
    var APP_RELATIVE_PATH = "directives/urlInputDirective.ptt";
    var BASE_RELATIVE_PATH = "wordpress/" + APP_RELATIVE_PATH;

    /**
     * An individual instance in the list of instances on the selction screen.
     */

    angular.module("cpanel.wordpress").directive("urlInput", function() {

        return {
            restrict: "E",
            scope: {
                readonly: "=",
                disabled: "=",
                name:     "=",
                id:       "=",
                domains:  "=",
            },
            require: "ngModel",
            templateUrl: CJT.config.debug ? CJT.buildFullPath(BASE_RELATIVE_PATH) : BASE_RELATIVE_PATH,
            link: function(scope, element, attrs, ngModelCtrl) {

                // Handle conversion of "true" | "false" into booleans
                attrs.$observe("readonly", function() {
                    scope.readonly = scope.$eval(attrs.readonly);
                    if (scope.readonly === undefined) {
                        delete scope.readonly;
                    }
                });

                // Handle conversion of "true" | "false" into booleans
                attrs.$observe("disabled", function() {
                    scope.disabled = scope.$eval(attrs.disabled);
                    if (scope.disabled === undefined) {
                        delete scope.disabled;
                    }
                });

                // Setup the ngModel for the url to url parts conversion
                // Note:
                //  1) protocol is optional. if provided it will render in
                //     a leading fixed decoration.
                //  2) path is optional. if not provided, it will just be
                //     an empty input in the directive output.
                ngModelCtrl.$formatters.push(function(url) {
                    var parts;
                    if(url) {
                        parts = url.split("/");
                    }

                    if (!parts || !parts.length) {
                        return {
                            protocol: "",
                            domain:   "",
                            path:     "",
                        };
                    }
                    else if (parts[0].match(/:\/$/)) {
                        return {
                            protocol: parts && parts.length ? parts.shift() + "/" : "",
                            domain:   parts && parts.length ? parts.shift() : "",
                            path:     parts && parts.length ? parts.join("/") : "",
                        };
                    } else {
                        return {
                            protocol: "",
                            domain:   parts && parts.length ? parts.shift() : "",
                            path:     parts && parts.length ? parts.join("/") : "",
                        };
                    }
                });

                ngModelCtrl.$parsers.push(function(val){
                    return val.protocol + val.domain + "/" + val.path;
                });

                ngModelCtrl.$render = function() {
                    scope.protocol = ngModelCtrl.$viewValue.protocol;
                    scope.domain   = ngModelCtrl.$viewValue.domain;
                    scope.path     = ngModelCtrl.$viewValue.path;
                };

                scope.$watch("scope.protocol + scope.domain + scope.path", function() {
                    ngModelCtrl.$setViewValue({
                        protocol: scope.protocol,
                        domain:   scope.domain,
                        path:     scope.path,
                    });
                });
            }
        };
    });
});