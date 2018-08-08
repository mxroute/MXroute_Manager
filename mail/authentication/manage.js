/*
# mail/authentication/manage.js                   Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false, define: false */
/* jshint -W098 */

define(
    [
        "angular",
        "cjt/core",
        "cjt/modules",
        "uiBootstrap",
        "ngRoute",
    ],
    function(angular, CJT) {
        return function() {
            angular.module("App", ["ui.bootstrap", "angular-growl", "cjt2.cpanel"]);

            var app = require(
                [
                    "uiBootstrap",
                    "app/services/manageService",
                    "app/views/manageController",
                ], function() {

                    var app = angular.module("App");

                    // If using views
                    app.controller("BaseController", ["$rootScope", "$scope", "$route", "$location", "manageService", "growl",
                        function($rootScope, $scope, $route, $location, manageService, growl) {

                            $scope.loading = false;

                            // Convenience functions so we can track changing views for loading purposes
                            $rootScope.$on("$routeChangeStart", function() {
                                $scope.loading = true;
                            });
                            $rootScope.$on("$routeChangeSuccess", function() {
                                $scope.loading = false;
                            });
                            $rootScope.$on("$routeChangeError", function() {
                                $scope.loading = false;
                            });
                            $scope.current_route_matches = function(key) {
                                return $location.path().match(key);
                            };
                            $scope.go = function(path) {
                                $location.path(path);
                            };

                            window.service = manageService;
                        }
                    ]);

                    // viewName

                    app.config(["$routeProvider", "$locationProvider",
                        function($routeProvider, $locationProvider) {
                            function _fetch_links(IndexService, $route, growl) {
                                return IndexService.fetch_links($route.current.params.username).then(function(result) {

                                    // providers Loaded
                                }, function(error) {
                                    growl.error(LOCALE.maketext("The system encountered an error while it tried to retrieve results, please refresh the interface: [_1]", error));
                                });
                            }

                            // Setup a route where we just use the username
                            $routeProvider.when("/:username", {
                                controller: "manageController",
                                templateUrl: CJT.buildFullPath("mail/authentication/views/manageView.ptt"),
                                resolve: {
                                    providers: ["manageService", "$route", "growl", _fetch_links]
                                }
                            });

                            // default route
                            $routeProvider.otherwise({
                                "redirectTo": "/:username"
                            });

                        }
                    ]);

                    // end of using views

                    app.init = function() {
                        var appContent = angular.element("#content");

                        if (appContent[0] !== null) {
                            angular.bootstrap(appContent[0], ["App"]);
                        }
                        return app;
                    };

                    app.init();

                });

            return app;
        };
    }
);
