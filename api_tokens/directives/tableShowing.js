/*
# api_tokens/directives/tableShowingDirecitve.js                        Copyright 2019 cPanel, L.L.C.
#                                                                                All rights Reserved.
# copyright@cpanel.net                                                           http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular",
        "cjt/util/locale",
        "cjt/core"
    ],
    function(angular, LOCALE, CJT) {

        "use strict";

        /**
         * Directive to render the "Showing 1 - 4 of 10"
         *
         * @module table-showing
         * @memberof cpanel.apiTokens
         *
         * @param  {Number} start first number in range ([1]-4)
         * @param  {Number} limit second number in range (1-[4])
         * @param  {Number} total total number of items (10)
         *
         * @example
         * <table-showing start="1" limit="4" total="10"></table-showing>
         *
         */

        var TEMPLATE = "directives/tableShowing.ptt";
        var RELATIVE_PATH = "api_tokens/" + TEMPLATE;
        var TEMPLATE_PATH = CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : TEMPLATE;
        var MODULE_NAMESPACE = "cpanel.apiTokens.tableShowing.directive";
        var module = angular.module(MODULE_NAMESPACE, []);

        var CONTROLLER = function($scope) {

            /**
             * Get the rendered string from LOCALE
             *
             * @method getShowingText
             * @public
             *
             * @return {String} localized string
             *
             */

            $scope.getShowingText = function getShowingText() {
                return LOCALE.maketext("[_1] - [_2] of [_3]", $scope.start, $scope.limit, $scope.total);
            };

        };

        module.directive("tableShowing", function tableShowing() {

            return {
                templateUrl: TEMPLATE_PATH,
                restrict: "EA",
                scope: {
                    start: "=",
                    limit: "=",
                    total: "="
                },
                transclude: true,
                controller: ["$scope", CONTROLLER]
            };

        });

        return {
            "class": CONTROLLER,
            "namespace": MODULE_NAMESPACE,
            "template": TEMPLATE
        };
    }
);
