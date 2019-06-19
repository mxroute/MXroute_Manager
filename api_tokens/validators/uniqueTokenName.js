/*
#  cpanel - api_tokens/validators/uniqueTokenName.js   Copyright 2019 cPanel, L.L.C.
#                                                               All rights Reserved.
# copyright@cpanel.net                                             http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

/** @namespace cpanel.domains.validators.tokenNameIsUnique */

define(
    [
        "angular",
        "cjt/util/locale",
        "cjt/validator/validator-utils",
        "app/services/apiTokens",
        "cjt/validator/validateDirectiveFactory"
    ],
    function(angular, LOCALE, validationUtils, APITokensService) {

        "use strict";

        var _apiTokens;

        var factoryMethods = {


            /** For mocking */

            _lastFetch: 0,

            _processLoadedTokens: function(tokens) {
                _apiTokens = null;
                if (tokens) {
                    _apiTokens = {};
                    tokens.forEach(function(token) {
                        _apiTokens[token.id] = token;
                    });
                }
                return _apiTokens;
            },

            _fetchTokens: function() {
                return _apiTokens;
            },
        };

        /**
         * Validator to check that the token name is unique compared to the apiTokens.fetchTokens() tokens
         *
         * @module tokenIsUniqueValidator
         *
         * @example
         * <input token-name-is-unique ng-model="myModel" />
         *
         */

        var tokenIsUniqueValidator = {

            /**
             * Check if the domain is unique
             *
             * @method tokenNameIsUnique
             *
             * @param  {String} tokenName value to check against the validator
             *
             * @return {Boolean} returns a boolean value determined by the validity of the view
             *
             */


            tokenNameIsUnique: function(tokenName, validatorArgument) {

                var result = validationUtils.initializeValidationResult();
                var _apiTokens = factoryMethods._fetchTokens();

                // Allows passing in of base value for instances where it would be valid if it stayed the same
                if (validatorArgument && tokenName === validatorArgument) {
                    return result;
                }

                if (!_apiTokens || (tokenName && _apiTokens[tokenName])) {
                    result.isValid = false;
                    result.add("tokenNameIsUnique", LOCALE.maketext("This [asis,API] token name already exists on this account. Enter a different name."), "tokenNameIsUnique");
                }

                return result;
            },

            validate: function($service, $q, value, argument, scope) {

                // debounce the reload
                // If tokens exist, and it's not been more than 1000ms, don't re-fetch
                var curDate = new Date().getTime();
                if (factoryMethods._fetchTokens() && curDate - factoryMethods._lastFetch < 1000) {
                    var result = tokenIsUniqueValidator.tokenNameIsUnique(value, argument, scope);
                    return $q.resolve(result);
                }

                // It's been more thatn 1000ms or no tokens exist
                factoryMethods._lastFetch = curDate;
                return $service.fetchTokens().then(function(tokens) {
                    factoryMethods._processLoadedTokens(tokens);
                    var result = tokenIsUniqueValidator.tokenNameIsUnique(value, argument, scope);
                    return $q.resolve(result);
                });
            }
        };

        var validatorModule = angular.module("cjt2.validate");
        validatorModule.run(["validatorFactory", "$q", APITokensService.serviceName,
            function(validatorFactory, $q, $service) {
                var validators = {
                    tokenNameIsUnique: tokenIsUniqueValidator.validate.bind(tokenIsUniqueValidator, $service, $q)
                };
                validators.tokenNameIsUnique.async = true;
                validatorFactory.generate(validators, $q);
            }
        ]);

        return {
            methods: tokenIsUniqueValidator,
            factoryMethods: factoryMethods,
            name: "token-name-is-unique",
            description: "Validation to ensure the api Token is unique for this account.",
            version: 1.0
        };


    }
);
