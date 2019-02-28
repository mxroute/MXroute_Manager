/*
# email_accounts/views/mnageDefault.js               Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define, PAGE */

define(
    [
        "angular",
        "lodash",
        "cjt/util/locale",
        "cjt/util/parse",
        "uiBootstrap",
        "app/services/emailAccountsService",
        "app/filters/encodeURIComponent",
        "cjt/services/alertService",
        "cjt/directives/alert",
        "cjt/directives/alertList",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/toggleSwitchDirective",
        "cjt/directives/toggleLabelInfoDirective",
        "cjt/directives/validationContainerDirective",
        "cjt/directives/validationItemDirective"
    ],
    function(angular, _, LOCALE, parse) {
        "use strict";

        var app = angular.module("cpanel.emailAccounts");
        app.value("PAGE", PAGE);

        /**
         * Manage default account controller for Email
         *
         * @module ManageController
         */
        var controller = app.controller(
            "ManageDefaultController",
            ["$scope", "$location", "emailAccountsService", "PAGE", "alertService", "$q",
                function($scope, $location, emailAccountsService, PAGE, alertService, $q) {

                    var emailAccount = this;
                    emailAccount.isLoading = true;
                    emailAccount.isRTL = PAGE.isRTL;

                    $scope.showAllHelp = false;

                    emailAccount.email = PAGE.mainEmailAccount;
                    emailAccount.webmailEnabled = parse.parseBoolean(PAGE.webmailEnabled);
                    emailAccount.emailDiskUsageEnabled = PAGE.emailDiskUsageEnabled;
                    emailAccount.defaultAddressEnabled = PAGE.defaultAddressEnabled;
                    emailAccount.dprefix = PAGE.dprefix;

                    /**
                     * Initialize
                     * @method initialize
                     */
                    function initialize() {

                        var getDefaultAccountusage = emailAccountsService.getDefaultAccountUsage()
                            .then(function(data) {
                                emailAccount.diskUsage = data;
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    replace: false,
                                    group: "emailAccounts"
                                });
                                emailAccount.backToListView();
                            });

                        var isSharedAddressBookEnabled = emailAccountsService.isSharedAddressBookEnabled()
                            .then(function(data) {
                                emailAccount.shareAddressBook = parse.parsePerlBoolean(data.shared);
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    replace: false,
                                    group: "emailAccounts"
                                });
                                emailAccount.backToListView();
                            });

                        var isUTF8MailboxNamesEnabled = emailAccountsService.isUTF8MailboxNamesEnabled()
                            .then(function(data) {
                                emailAccount.UTF8Mailbox = parse.parsePerlBoolean(data.enabled);
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    replace: false,
                                    group: "emailAccounts"
                                });
                                emailAccount.backToListView();
                            });

                        $q.all([getDefaultAccountusage, isSharedAddressBookEnabled, isUTF8MailboxNamesEnabled]).then(function() {
                            emailAccount.isLoading = false;
                        });
                    }

                    /**
                     * Show/hide help text
                     * @method toggleHelp
                     */
                    emailAccount.toggleHelp = function() {
                        $scope.showAllHelp = !$scope.showAllHelp;
                        $scope.$broadcast("showHideAllChange", $scope.showAllHelp);
                    };

                    /**
                     * Toggle shared address book state
                     * @method toggleSharedAddressBookStatus
                     */
                    emailAccount.toggleSharedAddressBookStatus = function() {
                        emailAccount.shareAddressBook = !emailAccount.shareAddressBook;

                        if (emailAccount.shareAddressBook) {
                            return emailAccountsService.enableSharedAddressBook()
                                .then(function(response) {
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("All of your email accounts can access the system-managed [output,em,Shared Address Book]."),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "emailAccounts"
                                    });
                                }, function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        replace: false,
                                        group: "emailAccounts"
                                    });
                                    emailAccount.backToListView();
                                });
                        } else {
                            return emailAccountsService.disableSharedAddressBook()
                                .then(function(response) {
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("Only your default email address can access the system-managed [output,em,Shared Address Book]."),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "emailAccounts"
                                    });
                                }, function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        replace: false,
                                        group: "emailAccounts"
                                    });
                                    emailAccount.backToListView();
                                });
                        }

                    };

                    /*
                     * Toggle UTF-8 mailbox support
                     * @method toggleUTF8MailboxNames
                     */
                    emailAccount.toggleUTF8MailboxNames = function() {
                        emailAccount.UTF8Mailbox = !emailAccount.UTF8Mailbox;

                        if (emailAccount.UTF8Mailbox) {
                            return emailAccountsService.enableUTF8MailboxNames()
                                .then(function(response) {
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("Mailbox names will now save as [asis,UTF-8]."),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "emailAccounts"
                                    });
                                }, function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        replace: false,
                                        group: "emailAccounts"
                                    });
                                    emailAccount.backToListView();
                                });
                        } else {
                            return emailAccountsService.disableUTF8MailboxNames()
                                .then(function(response) {
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("Mailbox names will no longer save as [asis,UTF-8]."),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "emailAccounts"
                                    });
                                }, function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        replace: false,
                                        group: "emailAccounts"
                                    });
                                    emailAccount.backToListView();
                                });
                        }

                    };

                    /**
                     * Back to List View
                     * @method backToListView
                     */
                    emailAccount.backToListView = function() {
                        $location.path("/list");
                    };

                    initialize();

                }
            ]
        );

        return controller;
    }
);
