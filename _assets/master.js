/*
# _assets/master.js                                  Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false, define: false */

define(
    [
        "angular",
        "uiBootstrap",
        "ngSanitize",
        "cjt/services/cpanel/notificationsService"
    ],
    function(angular) {
        "use strict";

        return function() {

            // First create the application
            angular.module("Master", [
                "ui.bootstrap",
                "ngSanitize",
                "cjt2.services.cpanel.notifications",
            ]);

            // Then load the application dependencies
            var app = require(
                [
                    "master/views/applicationListController",
                    "master/views/sidebarController"

                    // Application Modules
                ], function() {

                    var app = angular.module("Master");

                    /**
                     * Initialize the application
                     * @return {ngModule} Main module.
                     */
                    app.init = function() {

                        angular.element("#masterAppContainer").ready(function() {

                            var masterAppContainer = angular.element("#masterAppContainer");
                            if (masterAppContainer[0] !== null) {

                                // apply the app after requirejs loads everything
                                angular.bootstrap(masterAppContainer[0], ["Master"]);
                            }
                        });

                        var body    = angular.element("body");
                        var sidebar = angular.element("#sidebar");

                        sidebar.ready(function() {

                            if (sidebar[0] !== null) {

                                // apply the app after requirejs loads everything
                                angular.bootstrap(sidebar[0], ["Master"]);

                                // TODO: Move to the controller
                                if (sidebar.css("display") === "none") {
                                    body.addClass("nav-collapsed");
                                } else {
                                    body.removeClass("nav-collapsed");
                                }

                                var windowWidth = window.innerWidth;
                                angular.element(window)
                                    .bind("resize", function() {
                                        if (windowWidth !== window.innerWidth) {
                                            if (sidebar.css("display") === "none") {
                                                body.addClass("nav-collapsed");
                                            } else {
                                                body.removeClass("nav-collapsed");
                                            }

                                            // Update the cache
                                            windowWidth = window.innerWidth;
                                        }
                                    });
                            }
                        });

                        // TODO: Move to the controller
                        // Add functionality to the navbar toggle button
                        angular.element("#btnSideBarToggle").bind("click", function() {
                            sidebar.toggleClass("active");
                            body.toggleClass("nav-collapsed");
                        });

                        // Chaining
                        return app;
                    };

                    // We can now run the bootstrap for the application
                    app.init();

                });

            return app;
        };
    }
);
