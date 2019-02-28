/*
# version_control/index.js                        Copyright(c) 2017 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/
/* global require: false, define: false, PAGE: false */

define(
    [
        "angular",
        "cjt/core",
        "cjt/modules",
        "ngRoute",
        "uiBootstrap",
        "cjt/services/alertService",
        "cjt/directives/alert",
        "cjt/directives/alertList",
        "cjt/directives/callout",
        "jquery-chosen",
        "angular-chosen"
    ],
    function(angular) {

        "use strict";

        return function() {

            // First create the application
            angular.module("cpanel.versionControl", [
                "ngRoute",
                "ui.bootstrap",
                "cjt2.cpanel",
                "cpanel.versionControl.service",
                "cpanel.versionControl.sshKeyVerificationService",
                "cpanel.services.directoryLookup",
                "cpanel.versionControl.sseAPIService",
                "localytics.directives",
            ]);

            // Then load the application dependencies
            var app = require(
                [
                    "cjt/bootstrap",
                    "app/views/listRepositoriesController",
                    "app/views/createRepositoriesController",
                    "app/views/manageRepositoriesController",
                ], function(BOOTSTRAP) {

                    var app = angular.module("cpanel.versionControl");
                    app.value("PAGE", PAGE);

                    app.config([
                        "$routeProvider",
                        function($routeProvider) {
                            $routeProvider.when("/list/", {
                                controller: "ListRepositoriesController",
                                controllerAs: "repositories",
                                templateUrl: "views/listRepositoriesView.ptt",
                            });

                            $routeProvider.when("/create/", {
                                controller: "CreateRepositoriesController",
                                controllerAs: "repository",
                                templateUrl: "views/createRepositoriesView.ptt",
                            });

                            $routeProvider.when("/manage/:repoPath/:tabname?", {
                                controller: "ManageRepositoriesController",
                                controllerAs: "repository",
                                templateUrl: "views/manageRepositoriesView.ptt",
                            });

                            $routeProvider.otherwise({
                                "redirectTo": "/list"
                            });
                        }
                    ]);

                    BOOTSTRAP("#content", "cpanel.versionControl");

                });

            return app;
        };
    }
);
