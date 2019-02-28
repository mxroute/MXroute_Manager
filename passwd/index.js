/*
# passwd/index.js                                    Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false, define: false */
/* jshint -W098 */

define(
    [
        "angular",
        "cjt/core",
        "cjt/modules",
        "uiBootstrap"
    ],
    function(angular, CJT) {
        "use strict";

        return function() {

            // First create the application
            angular.module("App", ["ui.bootstrap", "angular-growl", "cjt2.cpanel"]);

            // Then load the application dependencies
            var app = require(
                [
                    "cjt/bootstrap",
                    "app/views/ExternalAuthController",
                    "app/services/ExternalAuthService",
                ], function(BOOTSTRAP) {

                    angular.module("App");

                    BOOTSTRAP("#content", "App");

                });

            return app;
        };
    }
);
