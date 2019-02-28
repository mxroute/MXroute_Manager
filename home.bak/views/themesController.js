/*
 * home/views/themesController.js                Copyright(c) 2015 cPanel, Inc.
 *                                                                 All rights Reserved.
 * copyright@cpanel.net                                               http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false, PAGE: true */

define(
    [
        "angular",
        "jquery",
        "app/services/themesService",
        "cjt/decorators/growlDecorator",
        "jquery-chosen",
        "angular-chosen"
    ],
    function(angular) {

        // Retrieve the current application
        var app = angular.module("App");

        var controller = app.controller(
            "themesController", [
                "$scope",
                "$window",
                "themesService",
                "growl",
                "$timeout",
                function(
                    $scope,
                    $window,
                    themesService,
                    growl,
                    $timeout) {

                    $scope.isRTL = PAGE.isRTL || false;
                    $scope.updated = true;

                    /** We are running into browser limits on the number of
                     *  concurrent HTTP connections. We want these AJAX
                     *  calls to be low priority so that CSS/sprites/etc.
                     *  will load first; otherwise, the UI takes longer to
                     *  be usable.
                     *
                     *  We need to reduce the number of concurrent
                     *  HTTP calls, but for now this stop-gap will
                     *  ensure that AJAX post-back calls don’t delay the
                     *  loading of critical UI resources.
                     */
                    $timeout(function() {
                        themesService.getAvailableThemes().then(function(response) {
                            if (response && response.length > 0) {

                                $scope.themes = response;

                                // selects current theme
                                if (PAGE.currentTheme) {
                                    $scope.selectedTheme = PAGE.currentTheme;
                                }
                            }
                        }, function(error) {
                            growl.error(error);
                        }).finally(function() {
                            $scope.updated = true;
                        });
                    });

                    /**
                     * Set theme of the account
                     * Note: Transfers the page
                     */
                    $scope.themeChanged = function() {
                        if ($scope.selectedTheme !== "") {
                            themesService.setTheme($scope.selectedTheme);

                            if (PAGE && PAGE.securityToken && PAGE.userName) {
                                $window.location.href = PAGE.securityToken + "/xfercpanel/" + PAGE.userName + "?theme=" + $scope.selectedTheme;
                            }
                        }
                    };
                }
            ]);

        return controller;
    }
);
