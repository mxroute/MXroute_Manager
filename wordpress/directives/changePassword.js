/*
 * wordpress/directives/changePassword.js             Copyright 2017 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false */

define([
    "angular",
    "cjt/core",
    "cjt/util/test",
    "cjt/directives/actionButtonDirective",
    "cjt/directives/passwordFieldDirective",
    "cjt/directives/validationContainerDirective",
    "cjt/directives/validationItemDirective",
    "cjt/directives/validateEqualsDirective",
], function(
    angular,
    CJT,
    TEST
) {
    var BASE_RELATIVE_PATH = "wordpress/directives/changePassword.ptt";

    /**
     * An individual instance in the list of instances on the selction screen.
     */

    angular.module("cpanel.wordpress").directive("changePassword", function() {

        var ChangePassword = function() {
            this.model = "";
            this.confirmModel = "";
            this.isUpdating = false;
        };

        angular.extend(ChangePassword.prototype, {
            /**
             * Wrap the provided submit handler so that we can disable the submission button
             * if we're performing an async action.
             *
             * @method submitUpdate
             * @return Promise
             */
            submitUpdate: function() {
                var result =  this._submitUpdate({ newPass: this.model });

                if( TEST.isQPromise(result) ) {
                    this.isUpdating = true;
                    return result.finally(function() {
                        this.isUpdating = false;
                    }.bind(this));
                }
            }
        });

        return {
            templateUrl: BASE_RELATIVE_PATH, // This template is included in index.html.tt, so no need to build the full path for debug mode
            restrict: "E",
            controllerAs: "password",
            bindToController: true,
            scope: {
                name: "@",
                _submitUpdate: "&onSubmit",
                _cancelUpdate: "&onCancel",
                passwordLabel: "@",
                passwordConfirmLabel: "@",
            },
            controller: ChangePassword,
            link: function(scope, elem) {

                // The main password input won't exist until the post-link
                // phase, so the initial focus action needs to go here.
                var input = elem[0] && elem[0].querySelector(".password-input-container input");
                if(input) {
                    input.focus();
                }
            }
        };
    });
});