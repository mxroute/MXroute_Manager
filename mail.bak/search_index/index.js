/*
# mail/search_index/index.js                        Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/
/* global require, define, PAGE */

define(
    [
        "angular",
        "cjt/core",
        "cjt/modules",
        "ngRoute",
        "app/services/searchIndex"
    ],
    function(angular) {

        "use strict";

        return function() {

            // First create the application
            angular.module("cpanel.searchIndex", [

                // Use the dynamic CJT2 module name, since this code is shared between Webmail and cPanel
                PAGE.CJT2_ANGULAR_MODULE_NAME,

                "ngRoute",
                "cpanel.searchIndex.searchIndex.service",
            ]);

            // Then load the application dependencies
            var app = require(
                [
                    "cjt/bootstrap",
                    "app/views/main"
                ], function(BOOTSTRAP) {

                    var app = angular.module("cpanel.searchIndex");
                    app.value("PAGE", PAGE);


                    app.config([
                        "$routeProvider",
                        function($routeProvider) {

                            $routeProvider.when("/", {
                                controller: "main",
                                templateUrl: "views/main.ptt"
                            });

                            $routeProvider.otherwise({
                                "redirectTo": "/"
                            });
                        }
                    ]);

                    BOOTSTRAP("#content", "cpanel.searchIndex");

                });

            return app;
        };
    }
);
