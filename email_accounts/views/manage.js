/*
# email_accounts/views/manage.js                     Copyright 2018 cPanel, Inc.
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
        "cjt/directives/validationItemDirective",
        "cjt/services/cpanel/componentSettingSaverService"
    ],
    function(angular, _, LOCALE, parse) {
        "use strict";

        var app = angular.module("cpanel.emailAccounts");
        app.value("PAGE", PAGE);

        /**
         * Manage Controller for Email
         *
         * @module ManageController
         */
        var controller = app.controller(
            "ManageController",
            ["$scope", "$location", "$anchorScroll", "$timeout", "emailAccountsService", "PAGE", "alertService", "$routeParams", "componentSettingSaverService",
                function($scope, $location, $anchorScroll, $timeout, emailAccountsService, PAGE, alertService, $routeParams, componentSettingSaverService) {

                    var emailAccount = this;
                    emailAccount.isLoading = true;
                    emailAccount.isRTL = PAGE.isRTL;

                    $anchorScroll.yOffset = 70;

                    var storageKeys = {
                        stayOnPage: "EmailAccountsManageStayOnPage",
                    };

                    $scope.showAllHelp = false;
                    var COMPONENT_NAME = "EmailAccountsManage";
                    componentSettingSaverService.register(COMPONENT_NAME);

                    emailAccount.dprefix = PAGE.dprefix;

                    emailAccount.webmailEnabled = parse.parseBoolean(PAGE.webmailEnabled);
                    emailAccount.requiredPasswordStrength = PAGE.requiredPasswordStrength;
                    emailAccount.externalAuthConfig = PAGE.externalAuthModulesConfigured;
                    emailAccount.showCalAndContacts = PAGE.showCalendarAndContactItems;
                    emailAccount.emailDiskUsageEnabled = PAGE.emailDiskUsageEnabled;
                    emailAccount.emailFiltersEnabled = PAGE.emailFiltersEnabled;
                    emailAccount.autoResponderEnabled = PAGE.autoResponderEnabled;

                    $scope.defaultQuota = PAGE.userDefinedQuotaDefaultValue ? PAGE.userDefinedQuotaDefaultValue : undefined;
                    $scope.maxQuota = PAGE.maxEmailQuota;
                    $scope.canSetUnlimited = PAGE.canSetUnlimited;
                    $scope.maxQuotaHelpText = LOCALE.maketext("Quotas cannot exceed [format_bytes,_1].", PAGE.maxEmailQuota * 1024 * 1024);
                    $scope.maxEmailQuotaText = PAGE.canSetUnlimited ? LOCALE.maketext("Unlimited") : LOCALE.maketext("[format_bytes,_1]", PAGE.maxEmailQuota * 1024 * 1024);

                    emailAccount.stayOnView = parse.parseBoolean(emailAccountsService.getStoredValue(storageKeys.stayOnPage));

                    $scope.showAllHelp = false;

                    // Get the variables from the URL
                    var email = decodeURIComponent($routeParams.emailAccount);

                    var scrollTo = $routeParams.scrollTo;

                    var currentAccountState = {};
                    emailAccount.currentSuspendedState = {};
                    emailAccount.suspendOptions = {};

                    /**
                     * Resets manage view
                     * @method resetData
                     */
                    function resetData() {
                        currentAccountState = {};
                        emailAccount.currentSuspendedState = {};
                        emailAccount.suspendOptions = {};
                        emailAccount.details = {};
                    }

                    /**
                     * Stores the current values in the component settings
                     * @method saveToComponentSettings
                     */
                    emailAccount.saveToComponentSettings = function() {
                        componentSettingSaverService.set(COMPONENT_NAME, {
                            showAllHelp: $scope.showAllHelp
                        });
                    };

                    /**
                     * scrolls to specified area
                     * @method _scrollToArea
                     */
                    function _scrollToArea() {
                        return $timeout( function() {
                            if (typeof scrollTo !== "undefined" && scrollTo) {
                                $anchorScroll(scrollTo);
                                var section = angular.element( document.querySelector("#" + scrollTo) );

                                section.addClass("restriction-section-highlight");
                                return $timeout(function() {
                                    section.removeClass("restriction-section-highlight");
                                }, 11000);
                            }

                        }, 1000 );
                    }

                    /**
                     * Initialize
                     * @method initialize
                     */
                    function initialize() {

                        componentSettingSaverService.get(COMPONENT_NAME).then(function(response) {
                            if (typeof response !== "undefined" && response) {
                                $scope.showAllHelp = response.showAllHelp;
                            }
                        });

                        return emailAccountsService.getEmailAccountDetails(email)
                            .then(function(response) {
                                currentAccountState = response;
                                emailAccount.details = response;

                                emailAccount.suspendOptions.login = emailAccount.currentSuspendedState.login = response.suspended_login;
                                emailAccount.suspendOptions.incoming = emailAccount.currentSuspendedState.incoming = response.suspended_incoming;
                                emailAccount.suspendOptions.suspended_outgoing = response.suspended_outgoing;
                                emailAccount.suspendOptions.hold_outgoing = response.hold_outgoing;
                                emailAccount.suspendOptions.has_suspended = response.has_suspended;
                                emailAccount.suspendOptions.outgoing = emailAccount.currentSuspendedState.outgoing = emailAccount.suspendOptions.suspended_outgoing === true ? "suspend" : emailAccount.suspendOptions.hold_outgoing === true ? "hold" : "allow";

                                if (emailAccount.suspendOptions.outgoing === "hold") {
                                    return emailAccountsService.getHeldMessageCount(email)
                                        .then(function(messageCount) {
                                            emailAccount.suspendOptions.currentlyHeld = messageCount;
                                            emailAccount.isLoading = false;
                                            return _scrollToArea();
                                        }, function(error) {
                                            alertService.add({
                                                type: "danger",
                                                message: error,
                                                closeable: true,
                                                replace: false,
                                                group: "emailAccounts"
                                            });
                                            emailAccount.isLoading = false;
                                        });
                                } else {
                                    emailAccount.isLoading = false;
                                    return _scrollToArea();
                                }
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    replace: false,
                                    group: "emailAccounts"
                                });
                                emailAccount.isLoading = false;
                                emailAccount.backToListView();
                            });

                    }

                    /**
                     * Called when stay on page checkbox changed
                     * @method stayOnPageChanged
                     */
                    emailAccount.stayOnPageChanged = function() {

                        if (emailAccount.stayOnView) {
                            localStorage.setItem(
                                storageKeys.stayOnPage,
                                PAGE.securityToken + ":" + "true"
                            );
                        } else {

                            // clear local storage
                            localStorage.removeItem(storageKeys.stayOnPage);
                        }
                    };

                    /**
                     * Toggles help text on view
                     * @method toggleHelp
                     */
                    emailAccount.toggleHelp = function() {
                        $scope.showAllHelp = !$scope.showAllHelp;
                        emailAccount.saveToComponentSettings();
                        $scope.$broadcast("showHideAllChange", $scope.showAllHelp);
                    };

                    /**
                     * Returns the correct text for how many messages are held.
                     * This is done here so that the JS logic for quant will work properly. If
                     * this was done in the template, the template toolkit logic only works on initial load
                     * and would not change if the value passed in changes.
                     *
                     * @param {number} number - the number of messages that are being held
                     * @return {string} a localized string
                     *
                     */
                    emailAccount.currentlyHeldMessageText = function(number) {
                        return LOCALE.maketext("Delete [quant,_1,message,messages] from the mail queue.", number);
                    };

                    /**
                     * Called when update is clicked
                     * @method update
                     * @param {Object} emailDetails email account details
                     */
                    emailAccount.update = function(emailDetails) {

                        emailAccount.frmManageAccount.$submitted = true;

                        if (!emailAccount.frmManageAccount.$valid || emailAccount.frmManageAccount.$pending) {
                            return;
                        }
                        if ( emailDetails.quotaType === "unlimited" && !$scope.canSetUnlimited ) {
                            emailDetails.quota = $scope.maxQuota;
                        } else if (emailDetails.quotaType === "unlimited") {
                            emailDetails.quota = 0;
                        }

                        return emailAccountsService.updateEmail(currentAccountState, emailDetails, emailAccount.currentSuspendedState, emailAccount.suspendOptions)
                            .then(function(data) {
                                var successCount = 0;
                                var successObj = [];

                                _.forEach(data, function(obj) {
                                    if (obj.type === "danger") {
                                        alertService.add({
                                            type: obj.type,
                                            message: obj.message,
                                            closeable: true,
                                            replace: false,
                                            autoClose: obj.autoClose,
                                            group: "emailAccounts"
                                        });
                                    } else if (obj.type === "success") {
                                        successObj.push(obj);
                                        successCount = successCount + 1;
                                    }
                                });

                                if (successCount) {
                                    if (successCount > 1) {
                                        alertService.add({
                                            type: "success",
                                            message: LOCALE.maketext("All of your changes to “[_1]” are saved.", emailDetails.email),
                                            closeable: true,
                                            replace: false,
                                            autoClose: 10000,
                                            group: "emailAccounts"
                                        });
                                    } else {
                                        alertService.add({
                                            type: "success",
                                            message: successObj[0].message,
                                            closeable: true,
                                            replace: false,
                                            autoClose: 10000,
                                            group: "emailAccounts"
                                        });
                                    }


                                    if (emailAccount.stayOnView) {
                                        emailAccount.isLoading = true;
                                        emailAccount.frmManageAccount.$setPristine();
                                        resetData();
                                        initialize();
                                    } else {
                                        emailAccount.backToListView();
                                    }

                                }
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error.message,
                                    closeable: true,
                                    replace: false,
                                    group: "emailAccounts"
                                });
                            });
                    };

                    /**
                     * Delete email account
                     * @method delete
                     * @param {string} email
                     */
                    emailAccount.delete = function(email) {
                        return emailAccountsService.deleteEmail(email)
                            .then(function() {
                                alertService.add({
                                    type: "success",
                                    message: LOCALE.maketext("You deleted “[_1]”.", email),
                                    closeable: true,
                                    replace: false,
                                    autoClose: 10000,
                                    group: "emailAccounts"
                                });

                                emailAccount.backToListView();

                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    replace: false,
                                    group: "emailAccounts"
                                });
                            });
                    };

                    /**
                     * Back to List View
                     * @method backToListView
                     */
                    emailAccount.backToListView = function() {
                        $location.path("/list");
                    };

                    $scope.$on("$destroy", function() {
                        componentSettingSaverService.unregister(COMPONENT_NAME);
                        localStorage.removeItem(storageKeys.stayOnPage);
                    });

                    initialize();

                }
            ]
        );

        return controller;
    }
);
