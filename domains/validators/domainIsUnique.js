/*
/*
# base/frontend/paper_lantern/domains/validators/domainIsUnique.js             Copyright(c) 2018 cPanel, Inc.
#                                                                                        All rights Reserved.
# copyright@cpanel.net                                                                      http://cpanel.net
# This code is subject to the cPanel license.                              Unauthorized copying is prohibited
*/

/* global define: false */

/** @namespace cpanel.domains.validators.domainIsUnique */

define(
    [
        "angular",
        "cjt/util/locale",
        "cjt/validator/validator-utils",
        "cjt/validator/validateDirectiveFactory",
        "app/services/domains",
    ],
    function(angular, LOCALE, validationUtils) {

        "use strict";

        var _domains;

        var factoryMethods = {

            /** For mocking */

            _processLoadedDomains: function(domains) {
                _domains = null;
                if (domains) {
                    _domains = {};
                    domains.forEach(function(domain) {
                        _domains[domain.domain] = domain;
                    });
                }
                return _domains;
            },

            _getDomains: function() {
                return _domains;
            },
        };

        /**
         * Validator to check that the domain is unique compared to the domains.get() domains
         *
         * @module domainIsUniqueValidator
         *
         * @example
         * <input domain-is-unique ng-model="myModel" />
         *
         */

        var domainIsUniqueValidator = {

            /**
             * Check if the domain is unique
             *
             * @method domainIsUnique
             *
             * @param  {String} domain value to check against the validator
             *
             * @return {Boolean} returns a boolean value determined by the validity of the view
             *
             */


            domainIsUnique: function(domain) {

                var result = validationUtils.initializeValidationResult();
                var _domains = factoryMethods._getDomains();

                if (!_domains || (domain && _domains[domain])) {
                    result.isValid = false;
                    result.add("domainIsUnique", LOCALE.maketext("This domain already exists on this account."), "domainIsUnique");
                }

                return result;
            }
        };

        var validatorModule = angular.module("cjt2.validate");
        validatorModule.run(["validatorFactory", "$q", "domains",
            function(validatorFactory, $q, $domainsService) {
                var validators = {
                    domainIsUnique: function(value) {
                        return $domainsService.get().then(function(domains) {
                            factoryMethods._processLoadedDomains(domains);
                            var result = domainIsUniqueValidator.domainIsUnique(value);
                            return $q.resolve(result);
                        });
                    }
                };
                validators.domainIsUnique.async = true;
                validatorFactory.generate(validators, $q);
            }
        ]);

        return {
            methods: domainIsUniqueValidator,
            factoryMethods: factoryMethods,
            name: "domain-is-unique",
            description: "Validation to ensure domain is unique for this account.",
            version: 1.0
        };


    }
);
