/*
# file_and_directory_restoration/index.js
#                                                    Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false, define: false */

define(
    [
        "angular",
        "cjt/core",
        "cjt/modules",
        "ngRoute",
        "uiBootstrap"
    ],
    function(angular, CJT) {
        "use strict";
        return function() {

            // First create the application
            angular.module("App", [
                "ngRoute",
                "ui.bootstrap",
                "cjt2.cpanel"
            ]);

            // Then load the application dependencies
            var app = require(
                [

                    // Application Modules
                    "cjt/bootstrap",
                    "cjt/views/applicationController",
                    "app/services/backupAPI",
                    "app/filters/fileSizeFilter",
                    "app/views/list"
                ],
                function(BOOTSTRAP) {
                    var app = angular.module("App");

                    // routing
                    app.config(["$routeProvider",
                        function($routeProvider) {

                            // Setup the routes
                            $routeProvider.when("/list/", {
                                controller: "listController",
                                templateUrl: CJT.buildFullPath("file_and_directory_restoration/views/list.ptt")
                            });

                            $routeProvider.otherwise({
                                "redirectTo": "/list/"
                            });
                        }
                    ]);

                    BOOTSTRAP();
                });

            return app;
        };
    }
);
