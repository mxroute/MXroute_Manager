/*
# email_accounts/views/create.js                     Copyright 2018 cPanel, Inc.
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
        "cjt/validator/email-validator",
        "app/services/emailAccountsService",
        "app/validators/emailAccountFullLength",
        "cjt/directives/statsDirective",
        "cjt/directives/passwordFieldDirective",
        "cjt/services/alertService",
        "cjt/directives/alert",
        "cjt/directives/alertList",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/toggleLabelInfoDirective",
        "cjt/directives/labelSuffixDirective",
        "cjt/directives/validationContainerDirective",
        "cjt/directives/validationItemDirective",
        "cjt/directives/bytesInput",
        "cjt/services/cpanel/componentSettingSaverService"
    ],
    function(angular, _, LOCALE, PARSE) {
        "use strict";

        var app;

        try {
            app = angular.module("cpanel.emailAccounts");
        } catch (e) {
            app = angular.module("cpanel.emailAccounts", []);
        }

        app.value("PAGE", PAGE);

        /**
         * Create Controller for Email
         *
         * @module CreateController
         */
        var controller = app.controller(
            "CreateController",
            [
                "$scope",
                "$location",
                "$anchorScroll",
                "$timeout",
                "emailAccountsService",
                "PAGE",
                "alertService",
                "$routeParams",
                "componentSettingSaverService",
                "$q",
                function(
                    $scope,
                    $location,
                    $anchorScroll,
                    $timeout,
                    emailAccountsService,
                    PAGE,
                    alertService,
                    $routeParams,
                    componentSettingSaverService,
                    $q
                ) {

                    var emailAccount = this;
                    var redirectTimer;
                    var COMPONENT_NAME = "EmailAccountsCreate";
                    var domain = decodeURIComponent($routeParams.domain);
                    var storageKeys = {
                        stayOnPage: "EmailAccountsCreateStayOnPage",
                    };

                    $anchorScroll.yOffset = 70;

                    emailAccount.isRTL = PAGE.isRTL;
                    emailAccount.isLoading = true;
                    emailAccount.statsCssClass = "hide-stats";
                    emailAccount.details = {};
                    $scope.showAllHelp = false;
                    $scope.upgradeURL = emailAccountsService.getUpgradeUrl();
                    $scope.requiredPasswordStrength = PAGE.requiredPasswordStrength;
                    $scope.isInviteSubEnabled = !!PAGE.isInviteSubEnabled;
                    $scope.defaultQuota = PAGE.userDefinedQuotaDefaultValue ? PAGE.userDefinedQuotaDefaultValue : undefined;
                    $scope.maxQuota = PAGE.maxEmailQuota;
                    $scope.canSetUnlimited = PAGE.canSetUnlimited;
                    $scope.maxQuotaHelpText = LOCALE.maketext("Quotas cannot exceed [format_bytes,_1].", PAGE.maxEmailQuota * 1024 * 1024);
                    $scope.maxEmailQuotaText = PAGE.canSetUnlimited ? LOCALE.maketext("Unlimited") : LOCALE.maketext("[format_bytes,_1]", PAGE.maxEmailQuota * 1024 * 1024);
                    $scope.mailDomains = [];

                    /**
                     * Called on first load
                     *
                     * @method firstLoad
                     */
                    function firstLoad() {
                        return $q.all([
                            componentSettingSaverService.register(COMPONENT_NAME),
                            emailAccountsService.getMailDomains(),
                            emailAccountsService.getEmailStats()
                        ]).then(
                            function(responses) {
                                $scope.mailDomains = responses[1];
                                $scope.accountStats = responses[2];
                                emailAccount.statsCssClass = "animate-stats";
                                return initialize()
                                    .then(function(result) {
                                        emailAccount.details = result;
                                    });
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    replace: false,
                                    group: "emailAccounts"
                                });
                            }
                        ).finally(function() {
                            emailAccount.isLoading = false;
                        });
                    }

                    /**
                     * Initialization
                     *
                     * @method initialize
                     * @param {Boolean} keepDomain
                     */
                    function initialize(keepDomain) {
                        return componentSettingSaverService.get(COMPONENT_NAME)
                            .then(function(response) {
                                if (typeof response !== "undefined" && response) {
                                    $scope.showAllHelp = response.showAllHelp;
                                }

                                if ($scope.accountStats.available) {
                                    var accountDetails = {};
                                    accountDetails.userName = null;
                                    accountDetails.domain = null;

                                    if (keepDomain) {
                                        accountDetails.domain = emailAccount.details.domain;
                                    } else if ($scope.mailDomains.length > 0) {
                                        if (typeof domain !== "undefined" && domain) {
                                            if ($scope.mailDomains.indexOf(domain) !== -1) {
                                                accountDetails.domain = domain;
                                            } else {
                                                accountDetails.domain = PAGE.primaryDomain;
                                            }
                                        } else {
                                            accountDetails.domain = PAGE.primaryDomain;
                                        }
                                    }

                                    accountDetails.quota = $scope.defaultQuota;
                                    accountDetails.password = null;
                                    accountDetails.quotaType = PAGE.defaultQuotaSelected;
                                    accountDetails.sendWelcomeEmail = true;
                                    accountDetails.setPassword = true;
                                    accountDetails.recoveryEmail = null;
                                    accountDetails.assignMaxDiskspace = false;
                                    accountDetails.quotaUnit = "MB";
                                    accountDetails.stayOnView = PARSE.parseBoolean(emailAccountsService.getStoredValue(storageKeys.stayOnPage));

                                    return accountDetails;
                                } else {

                                    // 10 seconds delay
                                    redirectTimer = $timeout( function() {
                                        $location.path("/list");
                                    }, 10000 );
                                }

                            });
                    }

                    firstLoad();

                    /**
                     * Stores the current values in the component settings
                     * @method saveToComponentSettings
                     */
                    emailAccount.saveToComponentSettings = function() {
                        return componentSettingSaverService.set(COMPONENT_NAME, {
                            showAllHelp: $scope.showAllHelp
                        });
                    };

                    /**
                     * Called when stayOnPage checkbox is changed
                     *
                     * @method stayOnPageChanged
                     */
                    emailAccount.stayOnPageChanged = function() {

                        if (emailAccount.details.stayOnView) {
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
                     * Scrolls to missing domains section
                     *
                     * @method scrollToMissingDomains
                     */
                    emailAccount.scrollToMissingDomains = function() {
                        $anchorScroll("missingDomainSection");
                        var missingDomainsSec = angular.element( document.querySelector( "#missingDomainSection" ) );

                        missingDomainsSec.addClass("section-highlight");
                        $timeout(function() {
                            missingDomainsSec.removeClass("section-highlight");
                        }, 11000);
                    };

                    /**
                     * Called when create button is clicked
                     *
                     * @method create
                     * @param {Object} details
                     */
                    emailAccount.create = function(details) {
                        emailAccount.frmCreateEmail.$submitted = true;

                        if (!emailAccount.frmCreateEmail.$valid || emailAccount.frmCreateEmail.$pending) {
                            return;
                        }

                        if (typeof details !== "undefined" && details) {

                            if (details.quotaType === "unlimited") {
                                if (!$scope.canSetUnlimited) {
                                    details.quota = $scope.maxQuota;
                                } else {
                                    details.quota = 0;
                                }
                            }

                            return emailAccountsService.createEmail(details)
                                .then(function(response) {

                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("You created “[_1]” ([output,url,_2,View]).",
                                            details.userName + "@" + details.domain,
                                            "#/list/" + details.userName + "@" + details.domain
                                        ),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "emailAccounts"
                                    });

                                    // we use the data from this call to possibly redirect the
                                    // user to the list, so we need to wait until this finishes
                                    // before proceeding
                                    return emailAccountsService.getEmailStats()
                                        .then(function(response) {
                                            $scope.accountStats = response;
                                            if (!emailAccount.details.stayOnView) {
                                                emailAccount.backToListView();
                                            } else {
                                                return initialize(true)
                                                    .then(function(result) {
                                                        emailAccount.details = result;
                                                        emailAccount.frmCreateEmail.$setPristine();
                                                    });
                                            }
                                        });

                                }, function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        replace: false,
                                        group: "emailAccounts"
                                    });
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

                    /**
                     * Toggles help
                     *
                     * @method toggleHelp
                     */
                    emailAccount.toggleHelp = function() {
                        $scope.showAllHelp = !$scope.showAllHelp;
                        emailAccount.saveToComponentSettings();
                        $scope.$broadcast("showHideAllChange", $scope.showAllHelp);
                    };

                    $scope.$on("$destroy", function() {
                        localStorage.removeItem(storageKeys.stayOnPage);
                        componentSettingSaverService.unregister(COMPONENT_NAME);
                        $timeout.cancel( redirectTimer );
                    });
                }
            ]
        );

        return controller;
    }
);
