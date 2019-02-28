/*
# domains/views/main.js                              Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

/** @namespace cpanel.domains.views.main */

define(
    [
        "angular",
        "lodash",
        "cjt/util/locale",
        "app/views/ROUTES",
        "cjt/decorators/alertAPIReporter",
        "cjt/directives/alertList",
        "cjt/directives/toggleSwitchDirective",
        "cjt/services/alertService"
    ],
    function(angular, _, LOCALE, ROUTES) {

        "use strict";

        var app = angular.module("cpanel.domains");

        var controller = app.controller(
            "main",
            ["$scope", "$rootScope", "$location", "alertService",
                function($scope, $rootScope, $location, $alertService) {

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

                        updateBreadCrumbs();

                    });

                    $rootScope.$on("$routeChangeError", function() {
                        $scope.loading = false;
                    });

                    function _init() {
                        updateBreadCrumbs();
                    }

                    /* Exposed Functions */

                    function _getRouteByPath(path) {
                        var foundRoute;
                        $scope.routes.forEach(function(route, key) {
                            if (route.route === path) {
                                foundRoute = key;
                            }
                        });
                        return foundRoute;
                    }

                    function addBreadCrumb(tab, setActive) {
                        $scope.breadcrumbs.push({
                            label: tab.title,
                            active: setActive,
                            href: "#" + tab.route
                        });
                    }

                    function _getTabChain(tabChain, tab) {
                        if (!tab.parentRoute || tab.parentRoute === "atAGlance") {
                            return tabChain;
                        }

                        var parentTab = _getTabByID(tab.parentRoute);
                        tabChain.unshift(parentTab);

                        return _getTabChain(tabChain, parentTab);
                    }

                    function updateBreadCrumbs() {
                        $scope.breadcrumbs = [];
                        addBreadCrumb({
                            title: LOCALE.maketext("Domains"),
                            route: "/"
                        }, $scope.activeTab && $scope.activeTab !== "listDomains");

                        if ($scope.currentTab) {
                            var tabChain = _getTabChain([$scope.currentTab], $scope.currentTab);

                            tabChain.forEach(function(tab, index) {
                                addBreadCrumb(tab, index !== tabChain.length - 1);
                            });
                        }

                        return $scope.breadcrumbs;
                    }

                    function _getTabByID(id) {
                        var parentTab;
                        $scope.routes.forEach(function(route) {
                            if (route.id === id) {
                                parentTab = route;
                            }
                        });
                        return parentTab;
                    }

                    function go(routeID) {
                        var routePath = "";

                        $scope.routes.forEach(function(route, key) {
                            if (route.id === routeID) {
                                routePath = route.route;
                            }
                        });

                        if (routePath !== "") {
                            $location.path(routePath);
                        }
                    }

                    function goToFirstTab() {
                        var firstValidRoute = $scope.routes[0];
                        if (firstValidRoute) {
                            $scope.go(firstValidRoute.id);
                        }
                    }

                    _init();

                    angular.extend($scope, {
                        go: go,
                        goToFirstTab: goToFirstTab,
                        activeTab: 0,
                        currentTab: null,
                        routes: ROUTES,
                        breadcrumbs: []
                    });
                }
            ]
        );

        return controller;
    }
);
