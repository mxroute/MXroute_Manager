/*
/*
# base/frontend/paper_lantern/domains/validators/subdomain.js                  Copyright(c) 2018 cPanel, Inc.
#                                                                                        All rights Reserved.
# copyright@cpanel.net                                                                      http://cpanel.net
# This code is subject to the cPanel license.                              Unauthorized copying is prohibited
*/

/* global define: false */

/** @namespace cpanel.domains.validators.subdomain */

define(
    [
        "angular",
        "cjt/util/locale",
        "cjt/validator/validator-utils",
        "cjt/io/api2-request",
        "cjt/io/api2",
        "cjt/modules",
        "cjt/services/APIService",
        "cjt/validator/validateDirectiveFactory",
        "app/services/domains",
    ],
    function(angular, LOCALE, validationUtils, API2Request) {

        "use strict";

        var _pattern = null;
        var _reservedSubdomains = null;

        function _handleError(error) {
            console.error(error); // eslint-disable-line no-console
        }

        // For Mocking
        var factoryMethods = {
            _pattern: function() {
                return _pattern;
            },

            _reservedSubdomains: function() {
                return _reservedSubdomains;
            },

            _processReservedSubdomains: function(result) {
                _reservedSubdomains = null;
                if (result && result.data) {
                    _reservedSubdomains = [];
                    _reservedSubdomains = result.data.map(function(subdomain) {
                        return subdomain;
                    });
                }
            },

            _processSubdomainRegex: function(result) {
                _pattern = null;
                if (result && result.data) {
                    var regexString = result.data.pop();
                    _pattern = new RegExp(regexString);
                }
            }
        };

        /**
         * Validator to check that the domain is a not a reserved subdomain and follows the valid format
         *
         * @module validSubdomain
         *
         * @example
         * <input valid-subdomain ng-model="myModel" />
         *
         */

        var subdomainValidator = {

            /**
             * Is the domain valid according to the back end regex
             *
             * @method validSubdomain
             *
             * @param  {String} domainPart value to check against the validator
             *
             * @return {Boolean} returns a boolean value determined by the validity of the view
             *
             */

            validSubdomain: function(domainPart) {

                var result = validationUtils.initializeValidationResult();

                var pattern = factoryMethods._pattern();

                if (domainPart && ( !pattern || !pattern.test(domainPart) ) ) {
                    result.isValid = false;
                    result.add("validSubdomain", LOCALE.maketext("You must enter a valid subdomain."));
                }

                return result;

            },


            /**
             * Is the domain invalid because it's a reserved subdomain part
             *
             * @method notReservedSubdomain
             *
             * @param  {String} domainPart value to check against the validator
             *
             * @return {Boolean} returns a boolean value determined by the validity of the view
             *
             */

            notReservedSubdomain: function(domainPart) {

                var result = validationUtils.initializeValidationResult();
                var reservedSubs = factoryMethods._reservedSubdomains();

                if (domainPart && ( !reservedSubs || reservedSubs.indexOf(domainPart) !== -1 ) ) {
                    result.isValid = false;
                    result.add("notReservedSubdomain", LOCALE.maketext("The server reserves this subdomain for system use only. Enter a different subdomain."));
                }

                return result;

            },


        };

        var validatorModule = angular.module("cjt2.validate");

        validatorModule.run(["validatorFactory", "APIService",
            function(validatorFactory, APIService) {
                var regexAPICall = new API2Request.Class();
                regexAPICall.initialize("SubDomain", "validregex");

                APIService.promise(regexAPICall).then(factoryMethods._processSubdomainRegex, _handleError);

                var reservedAPICall = new API2Request.Class();
                reservedAPICall.initialize("SubDomain", "getreservedsubdomains");

                APIService.promise(reservedAPICall).then(factoryMethods._processReservedSubdomains, _handleError);

                validatorFactory.generate(subdomainValidator);
            }
        ]);

        return {
            methods: subdomainValidator,
            factoryMethods: factoryMethods,
            name: "valid-subdomain",
            description: "Validation to subdomain is not reserved and matches the proper format.",
            version: 1.0
        };


    }
);
