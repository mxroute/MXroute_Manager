/*
# domains/directives/tableShowingDirecitve.js                                    Copyright(c) 2018 cPanel, Inc.
#                                                                                All rights Reserved.
# copyright@cpanel.net                                                           http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

/** @namespace cpanel.domains.directive.tableShowing */

define(
    [
        "angular",
        "cjt/util/locale",
        "cjt/core"
    ],
    function(angular, LOCALE, CJT) {

        "use strict";

        var module = angular.module("cpanel.domains.tableShowing.directive", []);

        module.directive("tableShowing", function tableShowing() {

            /**
             * Directive to render the "Showing 1 - 4 of 10"
             *
             * @module table-showing
             *
             * @param  {Number} start first number in range ([1]-4)
             * @param  {Number} limit second number in range (1-[4])
             * @param  {Number} total total number of items (10)
             *
             * @example
             * <table-showing start="1" limit="4" total="10"></table-showing>
             *
             */

            var TEMPLATE_PATH = "directives/tableShowingDirective.ptt";
            var RELATIVE_PATH = "domains/" + TEMPLATE_PATH;

            return {
                templateUrl: CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : TEMPLATE_PATH,
                restrict: "EA",
                scope: {
                    start: "=",
                    limit: "=",
                    total: "="
                },
                transclude: true,
                controller: ["$scope", function($scope) {

                    /**
                     * Get the rendered string from LOCALE
                     *
                     * @method getShowingText
                     *
                     * @return {String} localized string
                     *
                     */

                    $scope.getShowingText = function getShowingText() {
                        return LOCALE.maketext("Displaying [numf,_1] through [numf,_2] out of [quant,_3,item,items]", $scope.start, $scope.limit, $scope.total);
                    };

                }]
            };

        });
    }
);
