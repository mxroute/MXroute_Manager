/*
 * wordpress/index.js                                 Copyright 2017 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global require: false, define: false, PAGE: false */


define(
    [
        "angular",
        "jquery",
        "cjt/core",
        "cjt/modules",
        "ngRoute",
        "uiBootstrap",
        "angular-chosen",
    ],
    function(angular, $, CJT) {
        return function() {
            // First create the application
            angular.module("cpanel.wordpress", [
                "ngRoute",
                "ui.bootstrap",
                "cjt2.cpanel",
                "angular-growl",
                "localytics.directives", // angular-chosen
            ]);

            // Then load the application dependencies
            var app = require(
                [
                    "cjt/bootstrap",
                    "cjt/decorators/growlDecorator",
                    "cjt/views/applicationController",
                    "app/views/listController",
                    "app/views/manageSiteController",
                ], function(BOOTSTRAP) {

                    var app = angular.module("cpanel.wordpress");

                    app.value("pageState", PAGE);

                    app.config([
                        "$routeProvider",
                        "$compileProvider",
                        "growlProvider",
                        function(
                            $routeProvider,
                            $compileProvider,
                            growlProvider
                        ) {

                            $routeProvider.when("/list", {
                                controller:     "listController",
                                templateUrl:    "wordpress/views/listView.ptt",
                                reloadOnSearch: false,
                            });

                            $routeProvider.when("/manage/:id", {
                                controller: "manageSiteController",
                                templateUrl: "wordpress/views/manageSiteView.ptt"
                            });

                            $routeProvider.otherwise({
                                "redirectTo": "/list"
                            });

                            growlProvider.globalTimeToLive({success: 5000, warning: 10000, info: 5000, error: -1});
                            growlProvider.globalDisableCountDown(true);
                            growlProvider.onlyUniqueMessages(false);

                            if(!CJT.config.debug) {
                                $compileProvider.debugInfoEnabled(false);
                            }
                        }
                    ]);

                    BOOTSTRAP("#content", "cpanel.wordpress");

                });

            return app;
        };
    }
);
