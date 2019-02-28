/*
# base/frontend/paper_lantern/mail/pops/views/configurationOptions.js Copyright(c) 2017 cPanel, Inc.
#                                                                               All rights Reserved.
# copyright@cpanel.net                                                             http://cpanel.net
# This code is subject to the cPanel license.                     Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular",
        "cjt/util/locale"
    ],
    function(angular, LOCALE) {

        var app = angular.module("cpanel.mail.Pops");

        app.controller("configurationOptionsCtrl",
            ["$rootScope", "$scope", "growl", "emailAccountsService",
                function($rootScope, $scope, growl, emailAccountsService) {

                    $scope.sharedAddressBook = {
                        enabled: false,
                        enabling: true,
                        disabling: true
                    };

                    $scope.clearStatus = function() {
                        $scope.status = undefined;
                    };

                    /**
                     * Click handler for the "On" button, calls emailAccountsService.enableSharedAddressBook()
                     */
                    $scope.onClickEnableSharedAddressBook = function() {

                        if ( $scope.sharedAddressBook.enabled ) {
                            return;
                        }

                        $scope.sharedAddressBook.enabling = true;
                        $scope.status = undefined;

                        emailAccountsService.enableSharedAddressBook().then(
                            function(data) {
                                $scope.status = {
                                    message: LOCALE.maketext("Shared address book enabled."),
                                    type: "success",
                                    closeable: true,
                                    ttl: 10000
                                };
                                $scope.sharedAddressBook.enabled = ("" + data.shared) === "1";
                                $scope.sharedAddressBook.enabling = false;
                            },
                            function(error) {
                                $scope.status = {
                                    message: error,
                                    type: "danger"
                                };
                            }
                        );
                    };

                    /**
                     * Click handler for the "Off" button, calls emailAccountsService.disableSharedAddressBook()
                     */
                    $scope.onClickDisableSharedAddressBook = function() {

                        if ( !$scope.sharedAddressBook.enabled ) {
                            return;
                        }

                        $scope.sharedAddressBook.disabling = true;
                        $scope.status = undefined;

                        emailAccountsService.disableSharedAddressBook().then(
                            function(data) {
                                $scope.status = {
                                    message: LOCALE.maketext("Shared address book disabled."),
                                    type: "success",
                                    closeable: true,
                                    ttl: 10000
                                };
                                $scope.sharedAddressBook.enabled = ("" + data.shared) === "1";
                                $scope.sharedAddressBook.disabling = false;
                            },
                            function(error) {
                                $scope.status = {
                                    message: error,
                                    type: "danger"
                                };
                            }
                        );
                    };

                    emailAccountsService.isSharedAddressBookEnabled().then(
                        function(data) {
                            $scope.sharedAddressBook.enabled = ("" + data.shared) === "1";
                            $scope.sharedAddressBook.enabling = false;
                            $scope.sharedAddressBook.disabling = false;
                        },
                        function(error) {
                            $scope.sharedAddressBook.enabling = false;
                            $scope.sharedAddressBook.disabling = false;
                            growl.error(error);
                        }
                    );

                    $rootScope.initialLoad = false;
                }]
        );
    }
);
