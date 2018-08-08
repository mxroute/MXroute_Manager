/*
# mail/greylisting/index.js                       Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false, define: false */

define(
    [
        "angular",
        "jquery",
        "lodash",
        "cjt/core",
        "cjt/modules",
        "ngRoute",
        "uiBootstrap"
    ],
    function(angular, $, _, CJT) {
        return function() {

            // First create the application
            angular.module("App", ["ngRoute", "ui.bootstrap", "angular-growl", "cjt2.cpanel"]);

            // Then load the application dependencies
            var app = require(
                [

                    // Application Modules
                    "cjt/bootstrap",
                    "cjt/views/applicationController",
                    "app/views/domains",
                ], function(BOOTSTRAP) {

                    var app = angular.module("App");

                    app.firstLoad = {
                        domainList: true,
                    };

                    // routing
                    app.config(["$routeProvider", "growlProvider",
                        function($routeProvider, growlProvider) {

                            // Setup the routes
                            $routeProvider.when("/domains/", {
                                controller: "domainListController",
                                templateUrl: CJT.buildFullPath("mail/greylisting/views/domains.ptt")
                            });

                            $routeProvider.otherwise({
                                "redirectTo": "/domains/"
                            });
                        }
                    ]);

                    BOOTSTRAP("#content", "App");
                });

            return app;
        };
    }
);
