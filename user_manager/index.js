/*
# user_manager/index.js                           Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false, define: false, PAGE: false */


define(
    [
        "angular",
        "jquery",
        "cjt/core",
        "cjt/modules",
        "ngRoute",
        "uiBootstrap"
    ],
    function(angular, $, CJT) {
        return function() {

            // First create the application
            angular.module("App", [
                "ngRoute",
                "ui.bootstrap",
                "cjt2.cpanel",
                "cpanel.services.directoryLookup"
            ]);

            // Then load the application dependencies
            var app = require(
                [

                    // Application Modules
                    "cjt/bootstrap",
                    "cjt/views/applicationController",
                    "cjt/services/autoTopService",
                    "app/views/listController",
                    "app/views/addController",
                    "app/views/editController",
                    "app/services/serverInfoService"
                ], function(BOOTSTRAP) {

                    var app = angular.module("App");

                    app.firstLoad = {
                        userList: true,
                    };

                    // setup the email server service data for the application
                    app.factory("emailDaemonInfo", function() {
                        return {
                            enabled: PAGE.isEmailRunning,
                            name: "exim",
                            supports: {
                                quota: true
                            }
                        };
                    });

                    // setup the ftp server service data for the application
                    app.factory("ftpDaemonInfo", [
                        "serverInfoService",
                        function(serverInfoService) {
                            return serverInfoService.prepareFtpDaemonInfo(PAGE.ftpDaemonInfo);
                        }
                    ]);

                    // setup the webdisk server service data for the application
                    app.factory("webdiskDaemonInfo", function() {
                        return {
                            enabled: PAGE.isWebdavRunning,
                            name: "cpdavd",
                            supports: {
                                quota: false
                            }
                        };
                    });

                    // setup the ssl data for the server
                    app.factory("sslInfo", [
                        "serverInfoService",
                        function(serverInfoService) {
                            return serverInfoService.prepareSslInfo(PAGE.sslInfo);
                        }
                    ]);

                    // Provide the quota info for the cPanel account
                    app.factory("quotaInfo", [
                        "serverInfoService",
                        function(serverInfoService) {
                            return serverInfoService.prepareQuotaInfo(PAGE.quotaInfo);
                        }
                    ]);

                    // setup the defaults for the various services.
                    app.factory("defaultInfo", [
                        "serverInfoService",
                        function(serverInfoService) {
                            return serverInfoService.prepareDefaultInfo(PAGE.serviceDefaults);
                        }
                    ]);

                    // services this account is allowed to work with
                    // based on cpanel account feature control.
                    app.value("features", PAGE.features);

                    // routing
                    app.config([
                        "$routeProvider",
                        function(
                            $routeProvider
                        ) {

                            $routeProvider.when("/list/cards", {
                                controller: "listController",
                                templateUrl: CJT.buildFullPath("user_manager/views/listCardsView.ptt")
                            });

                            $routeProvider.when("/list/rows", {
                                controller: "listController",
                                templateUrl: "user_manager/views/listRowsView.ptt"
                            });

                            $routeProvider.when("/add", {
                                controller: "addController",
                                templateUrl: "user_manager/views/addEditView.ptt"
                            });

                            $routeProvider.when("/edit/subaccount/:guid", {
                                controller: "editController",
                                templateUrl: "user_manager/views/editView.ptt"
                            });

                            $routeProvider.when("/edit/service/:type/:user", {
                                controller: "editController",
                                templateUrl: "user_manager/views/editView.ptt"
                            });

                            $routeProvider.otherwise({
                                "redirectTo": "/list/rows"
                            });
                        }
                    ]);

                    app.run(["autoTopService", function(autoTopService) {
                        autoTopService.initialize();
                    }]);

                    BOOTSTRAP("#content", "App");

                });

            return app;
        };
    }
);
