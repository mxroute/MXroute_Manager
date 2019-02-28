/*
# account_preferences/index.js               Copyright(c) 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/
/* global require: false, define: false, PAGE: false */

define(
    'app/index',[
        "angular",
        "cjt/core",
        "cjt/modules",
        "ngRoute",
        "uiBootstrap",
        "cjt/services/alertService",
        "cjt/directives/alert",
        "cjt/directives/alertList"
    ],
    function(angular) {
        "use strict";

        return function() {

            // First create the application
            angular.module("cpanel.accountPreferences", [
                "ngRoute",
                "ui.bootstrap",
                "cjt2.cpanel"
            ]);

            // Then load the application dependencies
            var app = require([
                "cjt/bootstrap",
                "cjt/util/locale",
                "cjt/directives/actionButtonDirective",
                "cjt/directives/toggleSwitchDirective",
                "cjt/services/cpanel/nvDataService",
                "cjt/config/componentConfiguration"
            ], function(BOOTSTRAP, LOCALE) {
                var app = angular.module("cpanel.accountPreferences");
                app.value("PAGE", PAGE);

                app.config(["$routeProvider", function($routeProvider) {}]);
                app.controller("ManageController", [
                    "$scope",
                    "$location",
                    "PAGE",
                    "alertService",
                    "nvDataService",
                    "componentConfiguration",
                    "$timeout",
                    function(
                        $scope,
                        $location,
                        PAGE,
                        alertService,
                        nvDataService,
                        componentConfiguration,
                        $timeout
                    ) {
                        var preferences = this;
                        preferences.isLoading = true;

                        preferences.alertList = {};

                        // TODO: wait for component configuration service to return the correct configuration
                        // var alertListConfiguration = componentConfiguration.getComponent("alertList");

                        function init() {
                            var nvDataItems = [
                                "common-alertList"
                            ];

                            return nvDataService.getObject(nvDataItems).then(
                                function(response) {
                                    if (response) {
                                        var alertSettings;
                                        try {
                                            alertSettings =
                                                JSON.parse(response["common-alertList"]);
                                        } catch (e) {
                                            alertSettings = componentConfiguration.getDefaults()["alertList"];
                                        }
                                        if (alertSettings) {
                                            preferences.alertList.position =
                                                alertSettings.position;
                                        }

                                        preferences.isLoading = false;
                                    }
                                },
                                function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        replace: false,
                                        group: "account_preferences"
                                    });

                                    preferences.isLoading = false;
                                }
                            );
                        }

                        init();

                        function setAlertListPosition(value) {
                            componentConfiguration.setComponent("alertList", {
                                position: preferences.alertList.position
                            });
                        }

                        preferences.setAlertListPosition = function() {
                            var strPos = JSON.stringify({
                                position: preferences.alertList.position
                            });

                            nvDataService
                                .setObject({
                                    "common-alertList": strPos
                                })
                                .then(
                                    function() {
                                        setAlertListPosition({
                                            position:
                                                preferences.alertList.position
                                        });
                                        alertService.clear(
                                            null,
                                            "account_preferences"
                                        );
                                        alertService.add({
                                            type: "success",
                                            message: LOCALE.maketext(
                                                "You changed the position for system notifications."
                                            ),
                                            closeable: false,
                                            replace: false,
                                            group: "account_preferences"
                                        });
                                    },
                                    function(error) {
                                        alertService.add({
                                            type: "danger",
                                            message: error,
                                            closeable: true,
                                            replace: false,
                                            group: "account_preferences"
                                        });
                                    }
                                );
                        };
                    }
                ]);

                BOOTSTRAP("#content", "cpanel.accountPreferences");
            });

            return app;
        };
    }
);

