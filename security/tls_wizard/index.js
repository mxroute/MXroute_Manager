/*
 * base/frontend/paper_lantern/security/tls_wizard/index.js
 *                                                    Copyright 2018 cPanel, Inc.
 *                                                           All rights reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false, require: false */

define(
    [
        "angular",
        "cjt/core",
        "lodash",
        "cjt/modules",
        "uiBootstrap",
        "ngRoute",
        "ngSanitize",
    ],
    function(angular, CJT, _) {
        "use strict";

        return function() {

            angular.module("App", ["ui.bootstrap", "angular-growl", "cjt2.cpanel"]);

            var app = require(
                [
                    "cjt/bootstrap",
                    "app/services/CertificatesService",
                    "app/services/LocationService",
                    "app/views/VirtualHostsController",
                    "app/views/PurchaseSimpleController",
                    "app/views/CheckoutController",
                    "app/views/PendingCertificatesController",
                    "app/directives/identityVerificationDirective",
                    "cjt/decorators/growlDecorator",
                    "cjt/services/cpanel/componentSettingSaverService"
                ],
                function(BOOTSTRAP) {

                    var app = angular.module("App");

                    app.value("PAGE", CPANEL.PAGE);

                    // If using views
                    app.controller("BaseController", [
                        "componentSettingSaverService",
                        "CertificatesService",
                        "$rootScope",
                        "$scope",
                        "$route",
                        "$location",
                        function(
                            $CSSS,
                            CertificatesService,
                            $rootScope,
                            $scope,
                            $route,
                            $location
                        ) {

                            var INTRODUCTION_BLOCK = "IntroductionBlock";

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

                            $scope.introduction_dismissed = function() {
                                $CSSS.set(INTRODUCTION_BLOCK, {
                                    hidden: true
                                });
                                CertificatesService.dismiss_introduction();
                            };

                            $scope.current_route_matches = function(key) {
                                return $location.path().match(key);
                            };
                            $scope.go = function(path) {
                                $location.path(path);
                            };

                            var registering = $CSSS.register(INTRODUCTION_BLOCK);
                            if (registering) {
                                registering.then(function(result) {
                                    if (result && result.hidden) {
                                        CertificatesService.dismiss_introduction();
                                    }
                                });
                            }

                            $scope.$on("$destroy", function() {
                                $CSSS.unregister(INTRODUCTION_BLOCK);
                            });
                        }
                    ]);

                    // viewName

                    app.config(["$routeProvider", "growlProvider",
                        function($routeProvider, growlProvider) {

                            // $locationProvider.html5Mode(true);
                            // $locationProvider.hashPrefix("!");

                            growlProvider.globalPosition("top-right");

                            // Setup a route - copy this to add additional routes as necessary
                            $routeProvider.when("/create-advanced/:domain?", {
                                controller: "VirtualHostsController",
                                templateUrl: CJT.buildFullPath("security/tls_wizard/views/virtual_hosts.html.tt"),
                                resolve: {
                                    installed_hosts: ["CertificatesService",
                                        function(CertificatesService) {
                                            return CertificatesService.fetch_installed_hosts();
                                        }
                                    ],
                                    products: ["CertificatesService",
                                        function(CertificatesService) {
                                            return CertificatesService.fetch_products();
                                        }
                                    ],
                                    domains: ["CertificatesService",
                                        function(CertificatesService) {
                                            return CertificatesService.fetch_domains();
                                        }
                                    ],
                                    pending_certificates: ["CertificatesService",
                                        function(CertificatesService) {
                                            return CertificatesService.fetch_pending_certificates();
                                        }
                                    ]
                                }
                            });

                            // Setup a route - copy this to add additional routes as necessary
                            $routeProvider.when("/create/:domain?", {
                                controller: "PurchaseSimpleController",
                                templateUrl: CJT.buildFullPath("security/tls_wizard/views/purchase_simple.html.tt"),
                                resolve: {
                                    installed_hosts: ["CertificatesService",
                                        function(CertificatesService) {
                                            return CertificatesService.fetch_installed_hosts();
                                        }
                                    ],
                                    products: ["CertificatesService",
                                        function(CertificatesService) {
                                            return CertificatesService.fetch_products();
                                        }
                                    ],
                                    domains: ["CertificatesService",
                                        function(CertificatesService) {
                                            return CertificatesService.fetch_domains();
                                        }
                                    ],
                                    pending_certificates: ["CertificatesService",
                                        function(CertificatesService) {
                                            return CertificatesService.fetch_pending_certificates();
                                        }
                                    ]
                                }
                            });

                            // Setup a route - copy this to add additional routes as necessary
                            $routeProvider.when("/pending-certificates/:orderitemid?", {
                                controller: "PendingCertificatesController",
                                templateUrl: CJT.buildFullPath("security/tls_wizard/views/pending_certificates.html.tt"),
                                resolve: {
                                    installed_hosts: ["CertificatesService",
                                        function(CertificatesService) {
                                            return CertificatesService.fetch_installed_hosts();
                                        }
                                    ],
                                    pending_certificates: ["CertificatesService", "LocationService", "$location",
                                        function(CertificatesService, LocationService, $location) {
                                            var fetching = CertificatesService.fetch_pending_certificates();
                                            if (_.isFunction(fetching["finally"])) {
                                                return fetching.then(function() {
                                                    if (CertificatesService.get_pending_certificates().length) {
                                                        return true;
                                                    } else {
                                                        LocationService.go_to_last_create_route();
                                                        return false;
                                                    }
                                                });
                                            } else {
                                                if (CertificatesService.get_pending_certificates().length) {
                                                    return true;
                                                } else {
                                                    LocationService.go_to_last_create_route();
                                                    return false;
                                                }
                                            }

                                        }
                                    ],
                                    products: ["CertificatesService",
                                        function(CertificatesService) {
                                            return CertificatesService.fetch_products();
                                        }
                                    ]
                                }
                            });

                            $routeProvider.when("/purchase/:provider?/:step?/:everythingelse?", {
                                controller: "CheckoutController",
                                templateUrl: CJT.buildFullPath("security/tls_wizard/views/checkout.html.tt"),
                                resolve: {
                                    products: ["CertificatesService",
                                        function(CertificatesService) {
                                            return CertificatesService.fetch_products();
                                        }
                                    ]
                                }
                            });


                            // default route
                            $routeProvider.otherwise({
                                "redirectTo": "/pending-certificates"
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
