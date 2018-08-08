/*
 * home/index.js                 Copyright(c) 2015 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global require: false, define: false */

define(
    [
        "angular",
        "cjt/core",
        "ngSanitize",
        "cjt/modules",
        "uiBootstrap",
        "angular-chosen",
    ],
    function(angular, CJT) {
        return function() {

            // First create the application
            angular.module("App", ["ngSanitize", "ui.bootstrap", "cjt2.cpanel", "angular-growl", "localytics.directives"]);

            // Then load the application dependencies
            var app = require(
                [

                    // Application Modules
                    "cjt/bootstrap",
                    "app/views/applicationListController",
                    "app/views/statisticsController",
                    "app/views/themesController",
                    "app/views/accountsController"
                ], function(BOOTSTRAP) {
                    var app = angular.module("App");

                    app.config(["$httpProvider", function($httpProvider) {
                        $httpProvider.useApplyAsync(true);
                    }]);

                    BOOTSTRAP("#content", "App");
                });

            return app;
        };
    }
);
