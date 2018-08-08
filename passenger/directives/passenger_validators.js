/*
# passenger/directives/passenger_validators.js            Copyright(c) 2017 cPanel, Inc.
#                                                                   All rights Reserved.
# copyright@cpanel.net                                                 http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* --------------------------*/
/* DEFINE GLOBALS FOR LINT
/*--------------------------*/
/* global define: false     */
/* --------------------------*/

define([
    "angular",
    "cjt/validator/validator-utils",
    "cjt/util/locale",
    "cjt/validator/validateDirectiveFactory",
],
function(angular, validationUtils, LOCALE) {

    var uri_regex = new RegExp("[^0-9A-Za-z\/_-]");

    /**
         * Validate base uri
         *
         * @method  baseuri
         * @param {string} base uri
         * @return {object} validation result
         */
    var validators = {

        baseuri: function(val) {
            var result = validationUtils.initializeValidationResult();
            var isValid = true;

            if (val.length >= 1 && val.substring(0, 1) !== "/") {
                isValid = false;
            } else if (val.length > 1 && val.indexOf("/", val.length - 1) !== -1) {
                isValid = false;
            } else if (uri_regex.test(val)) {
                isValid = false;
            }

            if (!isValid) {
                result.isValid = false;
                result.add("baseuri", LOCALE.maketext("The [asis,Base URI] must begin with a single slash ([asis,/]) and may not contain spaces, special characters or a trailing slash."));
            }

            return result;
        },
        noApacheLiterals: function(val) {
            var result = validationUtils.initializeValidationResult();

            if (val.length > 1 && val.indexOf("${") !== -1) {
                result.isValid = false;
            }

            return result;
        },
    };

    var validatorModule = angular.module("cjt2.validate");

    validatorModule.run(["validatorFactory",
        function(validatorFactory) {
            validatorFactory.generate(validators);
        }
    ]);

    return {
        methods: validators,
        name: "passengerValidators",
        description: "Validation directives for passenger API parameters.",
        version: 11.66
    };
}
);
