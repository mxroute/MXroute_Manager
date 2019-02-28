/*
# email_accounts/index.js                            Copyright 2018 cPanel, Inc.
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
        "cjt/util/locale",
        "ngRoute",
        "uiBootstrap",
        "cjt/services/alertService",
        "cjt/directives/alert",
        "cjt/directives/alertList",
        "cjt/directives/callout",
        "app/services/emailAccountsService",
        "jquery-chosen",
        "angular-chosen"
    ],
    function(angular, LOCALE) {

        "use strict";

        return function() {

            // First create the application
            angular.module("cpanel.emailAccounts", [
                "ngRoute",
                "ui.bootstrap",
                "cjt2.cpanel",
                "cjt2.services.api",
                "cpanel.emailAccounts.service",
                "localytics.directives",
                "cjt2.directives.bytesInput"
            ]);

            // Then load the application dependencies
            var app = require(
                [
                    "cjt/bootstrap",
                    "cjt/util/locale",
                    "cjt/directives/breadcrumbs",
                    "app/services/emailAccountsService",
                    "app/filters/encodeURIComponent",
                    "app/views/list",
                    "app/views/create",
                    "app/views/manage",
                    "app/views/manageDefault"
                ], function(BOOTSTRAP, LOCALE) {

                    var app = angular.module("cpanel.emailAccounts");
                    app.value("PAGE", PAGE);
                    app.constant("ONE_MEBIBYTE", 1048576);

                    app.firstLoad = true;

                    app.config([
                        "$routeProvider",
                        function($routeProvider) {
                            $routeProvider.when("/list/:account?", {
                                controller: "ListController",
                                controllerAs: "emailAccounts",
                                templateUrl: "views/list.ptt",
                                breadcrumb: {
                                    id: "list",
                                    name: LOCALE.maketext("List Email Accounts"),
                                    path: "/list"
                                }
                            });

                            $routeProvider.when("/create/:domain?", {
                                controller: "CreateController",
                                controllerAs: "emailAccount",
                                templateUrl: "views/create.ptt",
                                breadcrumb: {
                                    id: "create",
                                    name: LOCALE.maketext("Create an Email Account"),
                                    path: "/create/",
                                    parentID: "list"
                                }
                            });

                            $routeProvider.when("/manage/:emailAccount/:scrollTo?", {
                                controller: "ManageController",
                                controllerAs: "emailAccount",
                                templateUrl: "views/manage.ptt",
                                breadcrumb: {
                                    id: "manage",
                                    name: LOCALE.maketext("Manage an Email Account"),
                                    path: "/manage/",
                                    parentID: "list"
                                }
                            });

                            $routeProvider.when("/manageDefault/", {
                                controller: "ManageDefaultController",
                                controllerAs: "emailAccount",
                                templateUrl: "views/manageDefault.ptt",
                                breadcrumb: {
                                    id: "manageDefault",
                                    name: LOCALE.maketext("Manage Default Email Account"),
                                    path: "/manageDefault/",
                                    parentID: "list"
                                }
                            });

                            $routeProvider.otherwise({
                                "redirectTo": "/list"
                            });
                        }
                    ]);

                    BOOTSTRAP("#content", "cpanel.emailAccounts");

                });

            return app;
        };
    }
);
