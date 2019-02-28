/*
# base/frontend/paper_lantern/mail/pops/views/addEmailAccount.js Copyright(c) 2017 cPanel, Inc.
#                                                                          All rights Reserved.
# copyright@cpanel.net                                                        http://cpanel.net
# This code is subject to the cPanel license.                Unauthorized copying is prohibited
*/

/* global define: false, PAGE: false */

define(
    [
        "lodash",
        "angular",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/bytesInput",
        "cjt/directives/passwordFieldDirective",
        "cjt/directives/validateEqualsDirective",
        "cjt/directives/validationContainerDirective",
        "cjt/directives/validationItemDirective",
        "app/validators/emailAccountAllowedChars",
        "app/validators/emailAccountFullLength",
        "app/validators/emailAccountSafePeriods"
    ],
    function(_, angular, LOCALE) {

        var app = angular.module("cpanel.mail.Pops");

        app.controller("addEmailAccountCtrl",
            ["$rootScope", "$scope", "emailAccountsService", "ONE_MEBIBYTE",
                function($rootScope, $scope, emailAccountsService, ONE_MEBIBYTE) {

                    $scope.requiredPasswordStrength = PAGE.requiredPasswordStrength;
                    $scope.userDefinedDefaultQuota = PAGE.userDefinedQuotaDefaultValue;
                    $scope.mailDomains = _.map(PAGE.mailDomains, _.property("domain"));
                    $scope.creatingAccount = false;
                    $scope.isRTL = PAGE.isRTL;
                    $scope.selectedQuotaUnit = "MB";
                    $scope.canSetUnlimited = PAGE.canSetUnlimited !== undefined ? PAGE.canSetUnlimited : true;

                    // Quota values come in as megabytes, translate back to bytes
                    $scope.defaultQuota = PAGE.userDefinedQuotaDefaultValue ? PAGE.userDefinedQuotaDefaultValue : undefined;
                    $scope.maxQuota = PAGE.maxEmailQuota;

                    $scope.emailAccount = {
                        account: undefined,
                        domain: $scope.mailDomains.length > 0 ? $scope.mailDomains[0] : undefined,
                        password: undefined,
                        password2: undefined,
                        quota: $scope.defaultQuota,
                        quotaType: PAGE.defaultQuotaSelected,
                        sendWelcome: true
                    };

                    $scope.clearStatus = function() {
                        $scope.status = undefined;
                    };

                    /**
                     * Click handler for the Create Account button, pulls account, password, domain, quota, and sendWelcome
                     * out of the scope and submits them to the addEmailAccount method on the emailAccountsService.
                     */
                    $scope.addEmailAccount = function() {

                        // We need to wait until all the validators are complete before submitting
                        // the form.
                        if ( $scope.addEmailAccountForm.$pending ) {
                            return false;
                        }

                        var formOrder = ["add_email_account", "add_email_domain", "add_email_password1", "add_email_password2", "quota"];

                        if ( $scope.addEmailAccountForm.$invalid ) {
                            $scope.addEmailAccountForm.$setSubmitted();
                            var focused = false;

                            angular.forEach(formOrder, function(name) {
                                if ( $scope.addEmailAccountForm[name] && $scope.addEmailAccountForm[name].$invalid ) {
                                    $scope.addEmailAccountForm[name].$setDirty();
                                    if ( !focused ) {
                                        angular.element("[name='addEmailAccountForm'] [name='" + name + "']").focus();
                                        focused = true;
                                    }
                                }
                            });

                            return;
                        }


                        var newAccount = {
                            email: $scope.emailAccount.account,
                            password: $scope.emailAccount.password,
                            domain: $scope.emailAccount.domain,
                            send_welcome_email: $scope.emailAccount.sendWelcome ? 1 : 0, // eslint-disable-line camelcase
                            quota: 0
                        };

                        if ( $scope.emailAccount.quotaType === "userdefined" ) {
                            newAccount.quota = $scope.emailAccount.quota;
                        } else if ( !$scope.canSetUnlimited ) {
                            newAccount.quota = $scope.maxQuota;
                        }

                        $scope.creatingAccount = true;
                        $scope.status = undefined;

                        return emailAccountsService.addEmailAccount(newAccount).then(
                            function(data) {
                                $scope.creatingAccount = false;

                                var created = data.replace("+", "@");
                                $scope.status = {
                                    type: "success",
                                    message: LOCALE.maketext("Account “[_1]” created ([output,url,_2,View]).", created, "#/listEmailAccounts/" + created),
                                    closeable: true,
                                    autoClose: 10000
                                };

                                $scope.emailAccount = {
                                    account: undefined,
                                    domain: $scope.mailDomains.length > 0 ? $scope.mailDomains[0] : undefined,
                                    quota: $scope.defaultQuota,
                                    quotaType: PAGE.defaultQuotaSelected,
                                    quotaUnit: "MB",
                                    sendWelcome: true
                                };

                                $scope.addEmailAccountForm.$setUntouched();
                                $scope.addEmailAccountForm.$setPristine();

                                $rootScope.$broadcast("emailAccountAdded");

                                if ( $rootScope.meta && $rootScope.meta.accounts ) {
                                    $rootScope.meta.accounts = undefined;
                                }

                            },
                            function(error) {
                                $scope.status = {
                                    type: "danger",
                                    message: error
                                };
                                $scope.creatingAccount = false;
                            }
                        );

                    };

                    $rootScope.initialLoad = false;
                }]
        );

    }
);
