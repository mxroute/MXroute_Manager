/*
# passenger/index.js                              Copyright(c) 2017 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/
/* global require: false, define: false, PAGE: false */

define(
    [
        "angular",
        "jquery",
        "lodash",
        "cjt/core",
        "cjt/modules",
        "ngRoute",
        "uiBootstrap",
        "jquery-chosen",
        "angular-chosen"
    ],
    function(angular, $, _, CJT) {
        return function() {

            // First create the application
            angular.module("cpanel.applicationManager", ["ngRoute", "ui.bootstrap", "cjt2.cpanel", "localytics.directives"]);

            // Then load the application dependencies
            var app = require(
                [
                    "cjt/bootstrap",
                    "cjt/services/autoTopService",
                    "cjt/services/alertService",
                    "cjt/directives/alertList",
                    "app/services/apps",
                    "app/services/domains",
                    "app/views/manage",
                    "app/views/details",
                    "app/directives/table_row_form"
                ], function(BOOTSTRAP) {

                    var app = angular.module("cpanel.applicationManager");

                    app.value("defaultInfo", PAGE);

                    app.config([
                        "$routeProvider",
                        function($routeProvider) {

                            $routeProvider.when("/manage", {
                                controller: "ManageApplicationsController",
                                controllerAs: "manage",
                                templateUrl: "passenger/views/manage.ptt"
                            });

                            $routeProvider.when("/details/:applname?", {
                                controller: "ConfigurationDetailsController",
                                controllerAs: "details",
                                templateUrl: "passenger/views/details.ptt"
                            });

                            $routeProvider.otherwise({
                                "redirectTo": "/manage"
                            });
                        }
                    ]);

                    app.run(["autoTopService", function(autoTopService) {
                        autoTopService.initialize();
                    }]);

                    BOOTSTRAP("#content", "cpanel.applicationManager");

                });

            return app;
        };
    }
);
