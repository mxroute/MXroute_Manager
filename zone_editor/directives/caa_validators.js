/*
# paper_lantern/zone_editor/directives/caa_validators.js    Copyright(c) 2017 cPanel, Inc.
#                                                                     All rights Reserved.
# copyright@cpanel.net                                                   http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define([
    "angular",
    "cjt/util/locale",
    "cjt/validator/validator-utils",
    "cjt/validator/domain-validators",
    "cjt/validator/email-validator",
    "cjt/validator/validateDirectiveFactory"
],
function(angular, LOCALE, validationUtils, DOMAIN_VALIDATORS, EMAIL_VALIDATORS) {
    var mailToRegex = /^mailto:/;

    /**
     * Validate caa record iodef variant of value field
     *
     * @method  validate_iodef
     * @param {string} iodef value
     * @return {object} validation result
     */

    var validate_iodef = function(val) {
        var result = validationUtils.initializeValidationResult();
        var otherResult;

        // can be a mailto URL or a standard URL (possibly for some sort of web service)

        result.isValid = false;

        if (mailToRegex.test(val)) {
            val = val.replace(mailToRegex, "");
            otherResult = EMAIL_VALIDATORS.methods.email(val);
        } else {
            otherResult = DOMAIN_VALIDATORS.methods.url(val);
        }

        result.isValid = otherResult.isValid;

        if (!result.isValid) {
            result.add("caaIodef", LOCALE.maketext("You must enter a valid [asis,mailto] or standard [asis,URL]."));
        }

        return result;
    };

    /**
     * Validate caa record issue or issuewild variant of value field
     *
     * @method  validate_issue
     * @param {string} issue/issuewild value
     * @return {object} validation result
     */

    var validate_issue = function(val) {
        var result = validationUtils.initializeValidationResult();

        // should be a valid zone name without optional parameters specified by the issuer.
        // the dns servers we support do not allow additional parameters after the semicolon.

        result.isValid = false;

        if (val === ";") {

            // ";" is a valid issue/issuewild value which disallows any
            // certificates

            result.isValid = true;
        } else {

            var zoneNameResult = DOMAIN_VALIDATORS.methods.zoneFqdn(val);
            result.isValid = zoneNameResult.isValid;
        }

        if (!result.isValid) {
            result.add("caaIssue", LOCALE.maketext("You must enter a valid zone name or a single semicolon."));
        }

        return result;
    };

    var validators = {

        caaValue: function(val, type) {
            if (type === "iodef") {
                return validate_iodef(val);
            } else {
                return validate_issue(val);
            }
        }
    };

    var validatorModule = angular.module("cjt2.validate");
    validatorModule.run(["validatorFactory",
        function(validatorFactory) {
            validatorFactory.generate(validators);
        }
    ]);

    return {
        methods: validators,
        name: "caaValidators",
        description: "Validation library for CAA records.",
        version: 1.0
    };
});
