/*
# paper_lantern/zone_editor/directives/dmarc_validators.js  Copyright(c) 2016 cPanel, Inc.
#                                                                     All rights Reserved.
# copyright@cpanel.net                                                   http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* --------------------------*/
/* DEFINE GLOBALS FOR LINT
/*--------------------------*/
/* global define: false     */
/* --------------------------*/

define([
    "angular",
    "cjt/util/locale",
    "cjt/validator/validator-utils",
    "app/models/dmarc_record",
    "cjt/validator/validateDirectiveFactory"
],
function(angular, LOCALE, validationUtils, DMARCRecord) {

    var dmarc_record = new DMARCRecord();

    /**
         * Validate dmarc record mailto list
         *
         * @method  dmarcMailtoList
         * @param {string} mailto uri list
         * @param {string} list to validate (rua | ruf)
         * @return {object} validation result
         */
    var validators = {
        dmarcMailtoList: function(val, prop) {
            var result = validationUtils.initializeValidationResult();

            result.isValid = dmarc_record.isValid(prop, val);
            if (!result.isValid) {
                result.add("dmarcMailtoList", LOCALE.maketext("The [asis,URI] list is invalid."));
            }
            return result;
        }
    };

        // Generate a directive for each validation function
    var validatorModule = angular.module("cjt2.validate");
    validatorModule.run(["validatorFactory",
        function(validatorFactory) {
            validatorFactory.generate(validators);
        }
    ]);

    return {
        methods: validators,
        name: "dmarcValidators",
        description: "Validation library for DMARC records.",
        version: 2.0,
    };
});
