/*
# base/frontend/paper_lantern/mail/pops/validators/emailAccountFullLength.js Copyright(c) 2017 cPanel, Inc.
#                                                                                      All rights Reserved.
# copyright@cpanel.net                                                                    http://cpanel.net
# This code is subject to the cPanel license.                            Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular"
    ],
    function(angular) {

        var module;

        /**
         * Directive that checks the full length of two form fields + 1 (for the @) to make sure an email address is a valid length
         * @attribute {Integer} emailFullLength The maximum allowed length for the two fields + 1
         * @attribute {String}  emailOtherValue The other form field to compare against
         *
         * @example
         * <form name="formName">
         *     <input type="text" name="account" email-full-length="254" email-other-value="formName.domain">
         *     <input type="text" name="domain">
         * </form>
         */

        try {
            module = angular.module("cpanel.mail.Pops");
        } catch (e) {
            module = angular.module("cpanel.mail.Pops", []);
        }

        module.directive("emailFulllength", function() {
            return {
                require: "ngModel",
                restrict: "A",
                link: function( scope, element, attrs, ngModel ) { // eslint-disable-line no-unused-vars

                    ngModel.$validators.emailFulllength = function(model, view) { // eslint-disable-line no-unused-vars

                        var ngOtherModel = getNgOtherModel();
                        if (!ngOtherModel) {
                            var value = view || "";
                            return (value.length + 1) <= attrs.emailFulllength;
                        }

                        var thisIsEmpty = ngModel.$isEmpty(view);
                        var otherIsEmpty = ngOtherModel.$isEmpty(ngOtherModel.$viewValue);
                        if (thisIsEmpty && otherIsEmpty) {

                            // Don't validate this condition if both values are empty
                            return true;
                        } else {

                            var thisValue = view || "";
                            var otherValue = (ngOtherModel.$pending || ngOtherModel.$invalid) ? ngOtherModel.$viewValue : ngOtherModel.$modelValue;

                            return (thisValue.length + otherValue.length + 1) <= attrs.emailFulllength;
                        }

                    };

                    scope.$watchGroup([
                        function() {
                            var ngOtherModel = getNgOtherModel();
                            return ngOtherModel && ngOtherModel.$viewValue;
                        },
                        function() {
                            var ngOtherModel = getNgOtherModel();
                            return ngOtherModel && ngOtherModel.$modelValue;
                        }
                    ], function() {
                        ngModel.$validate();
                    });

                    var _ngOtherModel;
                    function getNgOtherModel() {
                        if (!_ngOtherModel) {
                            _ngOtherModel = scope.$eval(attrs.emailOtherValue);
                        }
                        return _ngOtherModel;
                    }
                }
            };
        });
    }
);
