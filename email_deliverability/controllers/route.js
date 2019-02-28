/*
# email_deliverability/controllers/main.js           Copyright 2018 cPanel, L.L.C.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

define(
    [
        "angular",
        "app/controllers/ROUTES",
        "cjt/directives/breadcrumbs",
        "cjt/services/alertService"
    ],
    function(angular, ROUTES) {

        "use strict";

        /**
         * Controller for App-level Route Handling
         *
         * @module RouteController
         *
         * @memberof cpanel.emailDeliverability
         *
         * @param {Object} $scope angular scope
         * @param {Object} $rootScope angular rootScope
         * @param {Object} $location angular location Object
         * @param {Object} $alertService cjt2 alertService
         *
         */

        var MODULE_NAMESPACE = "cpanel.emailDeliverability.controllers.route";
        var MODULE_REQUIREMENTS = [];
        var CONTROLLER_NAME = "RouteController";
        var CONTROLLER_INJECTABLES = ["$scope", "$rootScope", "$location", "alertService"];

        var CONTROLLER = function RouteController($scope, $rootScope, $location, $alertService) {

            /**
             * Find a Route by the Path
             *
             * @private
             *
             * @method _getRouteByPath
             * @param  {String} path route to match against the .route property of the existing routes
             *
             * @returns {Object} route that matches the provided path
             *
             */

            function _getRouteByPath(path) {
                var foundRoute;
                $scope.routes.forEach(function(route, key) {
                    if (route.route === path) {
                        foundRoute = key;
                    }
                });
                return foundRoute;
            }

            /**
             * Find a Tab / View by the ID
             *
             * @private
             *
             * @method _getTabByID
             * @param  {String} id id to match against the .route property of the existing routes
             *
             * @returns {Object} route that matches the provided path
             *
             */

            function _getTabByID(id) {
                var parentTab;
                $scope.routes.forEach(function(route) {
                    if (route.id === id) {
                        parentTab = route;
                    }
                });
                return parentTab;
            }

            /**
             * Initiate the $rootScope listeners
             *
             * @private
             *
             * @method _init
             *
             */

            function _init() {
                $rootScope.$on("$routeChangeStart", function() {
                    $scope.loading = true;
                    $alertService.clear("danger");
                });

                $rootScope.$on("$routeChangeSuccess", function(event, current) {
                    $scope.loading = false;
                    $scope.parentTab = null;

                    if (current) {
                        var currentRouteKey = _getRouteByPath(current.$$route.originalPath);
                        $scope.currentTab = $scope.routes[currentRouteKey];
                        $scope.activeTab = currentRouteKey;
                        if ($scope.currentTab) {
                            $scope.parentTab = _getTabByID($scope.currentTab.parentRoute);
                        }
                    }

                });

                $rootScope.$on("$routeChangeError", function() {
                    $scope.loading = false;
                });
            }

            angular.extend($scope, {
                activeTab: 0,
                currentTab: null,
                routes: ROUTES
            });

            _init();

        };

        CONTROLLER_INJECTABLES.push(CONTROLLER);

        var app = angular.module(MODULE_NAMESPACE, MODULE_REQUIREMENTS);
        app.controller(CONTROLLER_NAME, CONTROLLER_INJECTABLES);

        return {
            class: CONTROLLER,
            namespace: MODULE_NAMESPACE
        };
    }
);
