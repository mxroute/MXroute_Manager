/*
# templates/mail/calendars_and_contacts/index.js     Copyright 2018 cPanel, Inc.
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
        "uiBootstrap",
    ],
    function(angular, CJT) {
        return function() {

            // First create the application
            angular.module("App", [

                // Use the dynamic CJT2 module name, since this code is shared between Webmail and cPanel
                PAGE.CJT2_ANGULAR_MODULE_NAME,

                "ngRoute",
                "ui.bootstrap",
            ]);

            // Then load the application dependencies
            var app = require(
                [

                    // Application Modules
                    "cjt/bootstrap",
                    "cjt/views/applicationController",
                    "app/views/configController",
                ], function(BOOTSTRAP) {

                    var app = angular.module("App");

                    app.firstLoad = {
                        config: true,
                    };

                    // routing
                    app.config(["$routeProvider",
                        function($routeProvider) {

                            // Setup the routes
                            $routeProvider.when("/config/", {
                                controller: "configController",
                                templateUrl: CJT.buildFullPath("mail/calendars_and_contacts/views/configView.ptt")
                            });

                            $routeProvider.otherwise({
                                "redirectTo": "/config/"
                            });
                        }
                    ]);

                    BOOTSTRAP("#content", "App");

                });

            return app;
        };
    }
);
