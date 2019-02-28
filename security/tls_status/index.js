/* global define: false, require: false */

define(
    [
        "angular",
        "cjt/core",
        "cjt/modules",
        "uiBootstrap",
        "ngRoute",
        "ngAnimate",
        "angular-ui-scroll"
    ],
    function(angular, CJT) {
        return function() {
            "use strict";

            angular.module("App", [
                "ui.bootstrap",
                "cjt2.cpanel",
                "ui.scroll",
                "ngAnimate"
            ]);

            var app = require(
                [
                    "cjt/bootstrap",
                    "cjt/services/alertService",
                    "cjt/directives/alertList",
                    "app/services/DomainsService",
                    "app/views/ViewDomainsController"
                ],
                function(BOOTSTRAP) {

                    var app = angular.module("App");

                    app.value("PAGE", CPANEL.PAGE);

                    // If using views
                    app.controller("BaseController", ["$rootScope", "$scope", "$route", "$location",
                        function($rootScope, $scope, $route, $location) {

                            $scope.loading = false;

                            // Convenience functions so we can track changing views for loading purposes
                            $rootScope.$on("$routeChangeStart", function(event, next, current) {
                                if (!current || next.loadedTemplateURL !== current.loadedTemplateURL) {
                                    $scope.loading = true;
                                }
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
                        }
                    ]);

                    // viewName

                    app.config(["$routeProvider",
                        function($routeProvider) {

                            $routeProvider.when("/", {
                                controller: "ViewDomainsController",
                                templateUrl: CJT.buildFullPath("security/tls_status/views/view_domains.html.tt"),
                                resolve: {
                                    "user_domains": ["DomainsService", function($service) {
                                        return $service.get_domains();
                                    }],
                                    "search_filter_settings": ["DomainsService", function($service) {
                                        return $service.get_domain_search_options();
                                    }]
                                }
                            });

                            $routeProvider.otherwise({
                                "redirectTo": "/"
                            });

                        }
                    ]);

                    // end of using views

                    BOOTSTRAP("#content", "App");

                });

            return app;
        };
    }
);
