/*
# mail/spam/index.js                        Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/
/* global require, define, PAGE */

define(
    [
        "angular",
        "cjt/core",
        "app/views/ROUTES",
        "cjt/modules",
        "ngRoute",
        "app/services/spamAssassin",
        "app/directives/multiFieldEditorItem",
        "app/directives/multiFieldEditor",
        "app/directives/scoreField",
        "cjt/directives/callout",
        "ngAnimate"
    ],
    function(angular, CJT, ROUTES) {

        "use strict";

        return function() {

            // First create the application
            angular.module("cpanel.apacheSpamAssassin", [
                "ngRoute",
                "angular-growl",
                "cjt2.cpanel",
                "cpanel.apacheSpamAssassin.spamAssassin.service",
                "cjt2.directives.toggleSwitch",
                "cjt2.directives.callout",
                "cpanel.apacheSpamAssassin.directives.scoreField",
                "cpanel.apacheSpamAssassin.directives.multiFieldEditor",
                "cpanel.apacheSpamAssassin.directives.multiFieldEditorItem"
            ]);

            var requires = [
                "app/views/main"
            ];

            ROUTES.forEach(function(route) {
                requires.push("app/views/" + route.controller);
            });

            // Then load the application dependencies
            var app = require(requires, function() {

                var app = angular.module("cpanel.apacheSpamAssassin");
                app.value("PAGE", PAGE);

                app.config([
                    "$routeProvider",
                    "$compileProvider",
                    "$animateProvider",
                    function($routeProvider, $compileProvider, $animateProvider) {

                        $animateProvider.classNameFilter(/^((?!no-animate).)*$/);

                        if (!CJT.config.debug) {
                            $compileProvider.debugInfoEnabled(false);
                        }

                        ROUTES.forEach(function(route) {
                            $routeProvider.when(route.route, {
                                controller: route.controller,
                                templateUrl: route.templateUrl,
                                resolve: route.resolve
                            });
                        });

                    }
                ]);

                /**
                     * Initialize the application
                     * @return {ngModule} Main module.
                     */
                app.init = function() {

                    var appContent = angular.element("#content");

                    if (appContent[0] !== null) {

                        // apply the app after requirejs loads everything
                        angular.bootstrap(appContent[0], ["cpanel.apacheSpamAssassin"]);
                    }

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
