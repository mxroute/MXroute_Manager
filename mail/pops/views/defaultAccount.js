/*
# base/frontend/paper_lantern/mail/pops/views/defaultAccount.js Copyright(c) 2017 cPanel, Inc.
#                                                                         All rights Reserved.
# copyright@cpanel.net                                                       http://cpanel.net
# This code is subject to the cPanel license.               Unauthorized copying is prohibited
*/

/* global define: false, PAGE: false */

define(
    [
        "angular",
    ],
    function(angular) {

        var app = angular.module("cpanel.mail.Pops");

        app.controller("defaultAccountCtrl",
            ["$rootScope", "$scope", "growl", "emailAccountsService",
                function($rootScope, $scope, growl, emailAccountsService) {

                    $scope.emailDiskUsageEnabled = PAGE.emailDiskUsageEnabled;

                    emailAccountsService.getDefaultAccountUsage().then(
                        function(data) {
                            $scope.defaultAccountDiskUsed = data;
                        },
                        function(error) {
                            growl.error(error);
                        }
                    );
                    $rootScope.initialLoad = false;
                }]
        );

    }
);
