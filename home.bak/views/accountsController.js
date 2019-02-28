/*
 * home/views/accountsController.js                Copyright(c) 2015 cPanel, Inc.
 *                                                                 All rights Reserved.
 * copyright@cpanel.net                                               http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false, PAGE: true */

define(
    [
        "angular",
        "lodash",
        "jquery",
        "app/services/accountsService",
        "cjt/decorators/growlDecorator",
        "jquery-chosen",
        "angular-chosen"
    ],
    function(angular, _) {

        // Retrieve the current application
        var app = angular.module("App");

        var controller = app.controller(
            "accountsController", [
                "$scope",
                "$window",
                "accountsService",
                "growl",
                "$timeout",
                function(
                    $scope,
                    $window,
                    accountsService,
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
                        accountsService.getAvailableAccounts($scope.isRTL).then(function(response) {
                            if (response && response.length >= 1) {
                                $scope.accounts = response;

                                // helps select current user
                                if (PAGE.userName) {
                                    $scope.selectedAccount = _.find(response, ["user", PAGE.userName]);
                                }
                            }
                        }, function(error) {
                            growl.error(error);
                        }).finally(function() {
                            $scope.updated = true;
                        });
                    });

                    /**
                     * Switches Account
                     * Note: Transfers the page
                     */
                    $scope.accountChanged = function() {
                        if ($scope.selectedAccount && PAGE && PAGE.securityToken) {
                            $window.location.href = PAGE.securityToken + "/xfercpanel/" + $scope.selectedAccount.user;
                        }
                    };
                }
            ]);

        return controller;
    }
);
