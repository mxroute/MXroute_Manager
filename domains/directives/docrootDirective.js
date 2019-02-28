/*
# domains/directives/docrootDirective.js.                              Copyright(c) 2018 cPanel, Inc.
#                                                                                All rights Reserved.
# copyright@cpanel.net                                                           http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

/** @namespace cpanel.domains.directive.docroot */

define(
    [
        "angular",
        "lodash",
        "cjt/core",
    ],
    function(angular, _, CJT) {

        "use strict";

        var module = angular.module("cpanel.domains.docroot.directive", []);
        module.value("PAGE", PAGE);


        module.directive("docroot", function itemListerItem() {

            /**
             * Generates a docroot link automatically shortening the home dir to
             * to an icon and addint title text
             *
             * @module docroot
             * @restrict E
             *
             * @param  {String} docroot full path of the docroot
             * @param  {String} homedir path of the homedir (will be first part of docroot)
             *
             * @example
             * <docroot homedir="/home/baldr" docroot="/home/baldr/a/docroot" />
             *
             */

            var TEMPLATE_PATH = "directives/docrootDirective.ptt";
            var RELATIVE_PATH = "domains/" + TEMPLATE_PATH;

            return {
                templateUrl: CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : TEMPLATE_PATH,

                restrict: "E",
                scope: {
                    parentID: "@id",
                    rawDocroot: "@docroot",
                    homedir: "@"
                },
                controller: ["$scope", "PAGE", function($scope, PAGE) {

                    /**
                     * Converts a full document root into a shortened one and updates $scope.docroot
                     *
                     * @method updateDocroot
                     *
                     * @param  {String} newFullDocroot full document root, including the homedir to parse
                     *
                     * @return {String} returns the parsed document root
                     *
                     */
                    function updateDocroot(newFullDocroot) {
                        $scope.fullDocroot = encodeURIComponent(newFullDocroot);
                        var regexp = new RegExp("^" + _.escapeRegExp($scope.homedir) + "/?");
                        $scope.docroot = newFullDocroot.replace(regexp, "");
                        $scope.docroot = $scope.docroot === "/" ? "" : $scope.docroot;
                        return $scope.docroot;
                    }

                    // Filemananger only works in cPanel
                    var appIscPanel = PAGE.APP_NAME === "cpanel";

                    // Expects PAGE.fileManagerAppObj to be an object with at least a url and possibly a target
                    $scope.fileManager = false;
                    if (appIscPanel && PAGE.fileManagerAppObj) {
                        $scope.fileManager = {
                            url: PAGE.fileManagerAppObj.url,
                            target: PAGE.fileManagerAppObj.target || "_blank"
                        };
                    }

                    $scope.$watch("rawDocroot", updateDocroot);
                    updateDocroot($scope.rawDocroot);

                }]

            };

        });
    }
);
