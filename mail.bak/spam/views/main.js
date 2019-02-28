/*
# mail/spam/views/main.js      Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

define(
    [
        "angular",
        "lodash",
        "cjt/util/locale",
        "app/views/ROUTES",
        "cjt/decorators/alertAPIReporter",
        "cjt/directives/alertList",
        "app/services/spamAssassin",
        "cjt/directives/toggleSwitchDirective",
        "cjt/services/alertService"
    ],
    function(angular, _, LOCALE, ROUTES) {

        "use strict";

        var app = angular.module("cpanel.apacheSpamAssassin");

        var controller = app.controller(
            "main",
            ["$scope", "$rootScope", "$location", "spamAssassin", "alertService",
                function($scope, $rootScope, $location, $service, alertService) {

                    $rootScope.$on("$routeChangeStart", function(event, next, current) {
                        $scope.loading = true;
                        var nextRouteKey = _getRouteByPath(next.$$route.originalPath);
                        if (_.isUndefined(nextRouteKey)) {
                            event.preventDefault();

                            // bad tab, go to first
                            $scope.goToFirstTab();
                        }
                        var nextTab = $scope.routes[nextRouteKey];
                        if (!nextTab || $service.hasFeature(nextTab.id) === false) {

                            event.preventDefault();

                            // unavailable feature, redirect to home
                            $scope.goToFirstTab();
                        } else {

                            // Clear alerts on tab change
                            alertService.clear();
                        }
                    });


                    $rootScope.$on("$routeChangeSuccess", function(event, current) {
                        $scope.loading = false;
                        $scope.parentTab = null;

                        if (current) {
                            var currentRouteKey = _getRouteByPath(current.$$route.originalPath);
                            $scope.currentTab = $scope.routes[currentRouteKey];
                            $scope.activeTab = currentRouteKey;
                            $scope.parentTab = _getTabByID($scope.currentTab.parentRoute);
                        }

                        updateBreadCrumbs();

                    });

                    $rootScope.$on("$routeChangeError", function() {
                        $scope.loading = false;
                    });

                    function _init() {
                        $service.getSpamAssassinSettings().then(function() {
                            if ($location.path() === "") {
                                $scope.goToFirstTab();
                            } else {
                                if (!$scope.routes.some(function(route) {
                                    return route.route === $location.path();
                                })) {
                                    $scope.goToFirstTab();
                                }
                            }
                        });

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
                            title: LOCALE.maketext("Spam Filters"),
                            route: "/overview"
                        }, true);

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
                        routes: $service.getValidRoutes(ROUTES),
                        breadcrumbs: [],
                        settings: $service.spamAssassinSettings
                    });
                }
            ]
        );

        return controller;
    }
);
