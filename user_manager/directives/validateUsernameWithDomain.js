/*
# base/frontend/paper_lantern/user_manager/directives/validateUsernameWithDomain.js
#                                                 Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular",
        "cjt/util/locale",
        "cjt/validator/validator-utils",
        "cjt/validator/validateDirectiveFactory",
        "app/services/userService"
    ],
    function(angular, LOCALE, validatorUtils, validatorFactory, userService) {

        var module = angular.module("App");

        /**
         * This set of directives is intended to help with the problem of length
         * validation for username@domain entry across two fields. In the product we
         * often have one field for username and another for the domain selection. As
         * of 11.54, we are imposing character limitations for the combined result of
         * these two fields, including the @ character. This directive automates that
         * validation.
         *
         * @example
         *
         * <form username-with-domain-wrapper>
         *     <input name="username" ng-model="username" username-with-domain="username">
         *     <input name="domain"   ng-model="domain"   username-with-domain="domain">
         *     <ul validation-container field-name="username"></ul>
         * </form>
         *
         * Note: Both the wrapper and child directives are restricted to attributes.
         */


        /**
         * The wrapper directive just serves as a communication point between the two
         * child directives.
         */
        module.directive("usernameWithDomainWrapper", [function() {

            var ParentController = function($attrs) {
                this.username = this.domain = "";
                this.$attrs = $attrs;
            };

            angular.extend(ParentController.prototype, {
                setDomain: function(domain) {
                    if (typeof domain !== "undefined") {
                        this.domain = domain;
                    }

                    return this.getTotalLength();
                },

                setUsername: function(username) {
                    if (typeof username !== "undefined") {
                        this.username = username;
                    }

                    return this.getTotalLength();
                },

                getUsernameAndDomain: function() {
                    return this.username + "@" + this.domain;
                },

                getTotalLength: function() {
                    return this.getUsernameAndDomain().length;
                }
            });

            return {
                restrict: "A",
                scope: false,
                controller: ["$attrs", ParentController]
            };

        }]);

        /**
         * This directive will need two instances to function as intended, and they
         * should both be descendants of the wrapper directive. One should have the
         * attribute value of "username" and the other value should be "domain".
         */
        module.directive("usernameWithDomain", ["userService", "$q", function(userService, $q) {

            return {
                restrict: "A",
                scope: false,
                require: ["^^usernameWithDomainWrapper", "ngModel"],
                link: function( scope, elem, attrs, ctrls ) {
                    var parentCtrl = ctrls[0]; // The controller from the wrapper directive
                    var ngModel    = ctrls[1]; // The ngModel controller from the current element

                    // Grab the type
                    var type = attrs.usernameWithDomain;

                    if (type === "username") {

                        // Save a reference to the $validate function on the wrapper so that the partner "domain"
                        // version of this directive can trigger validation for this "username" instance.
                        parentCtrl.validateUsername = ngModel.$validate;

                        // Set up the extended validation object the same way the validateDirectiveFactory does.
                        var formCtrl = elem.controller("form");
                        validatorUtils.initializeExtendedReporting(ngModel, formCtrl);

                        // This is the main validation function that checks the total length of the username@domain.
                        var validateUsernameWithDoamin = function(totalLength) {
                            var TOTAL_MAX_LENGTH = 254;
                            var result = validatorUtils.initializeValidationResult();

                            if (totalLength > TOTAL_MAX_LENGTH) {
                                result.addError("maxLength", LOCALE.maketext("The combined length of the username, [asis,@] character, and domain cannot exceed [numf,_1] characters.", TOTAL_MAX_LENGTH));
                            }

                            return result;
                        };

                        // Add the validator to the list. The validator goes through the validateDirectiveFactory
                        // "run" method to hopefully help compatibility going forward.
                        ngModel.$validators.usernameWithDomain = function(newUsername) {
                            var totalLength = parentCtrl.setUsername(newUsername);
                            return validatorFactory.run("usernameWithDomain", ngModel, formCtrl, validateUsernameWithDoamin, totalLength);
                        };

                        var validateUsernameIsAvailableAsync = function(value) {
                            return userService.checkAccountConflicts(value).then(function(responseData) {
                                scope.$eval(parentCtrl.$attrs.lookupCallback, { responseData: responseData });
                                return responseData;
                            }).then(
                                function() {
                                    return validatorUtils.initializeValidationResult();
                                },
                                function(error) {
                                    var result = validatorUtils.initializeValidationResult(true);
                                    result.addError("usernameIsAvailable", error);
                                    return result;
                                });
                        };

                        ngModel.$asyncValidators.usernameIsAvailable = function(modelValue, viewValue) {
                            var value = parentCtrl.getUsernameAndDomain();
                            return validatorFactory.runAsync($q, "usernameIsAvailable", ngModel, formCtrl, validateUsernameIsAvailableAsync, value);
                        };

                    } else if (type === "domain") {

                        // Unfortunately the viewChangeListeners array doesn't get triggered when you first set
                        // the model value (for whatever reason), so we'll need to set the domain to cover the
                        // case when the user doesn't change the default. $formatters don't get called for select
                        // controls when their value changes so this only fires on the initial render.
                        ngModel.$formatters.push(function(val) {
                            parentCtrl.setDomain( ngModel.$modelValue );
                            return val;
                        });

                        // When the domain model changes, we need to run the length check again, but the username
                        // is where people have the most flexibility to make changes, so we'll run the validation
                        // there to create the validation error messages near that field.
                        ngModel.$viewChangeListeners.push(function() {
                            parentCtrl.setDomain( ngModel.$modelValue );
                            parentCtrl.validateUsername();
                        });
                    } else {
                        throw new Error("The value for the username-with-domain directive needs to be set to 'username' or 'domain'.");
                    }

                }
            };

        }]);

    }
);
