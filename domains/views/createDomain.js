/*
# domains/views/createDomain.js                      Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

/** @namespace cpanel.domains.views.createDomain */

define(
    [
        "angular",
        "cjt/util/locale",
        "app/services/fuzzy",
        "cjt/modules",
        "cjt/directives/callout",
        "cjt/validator/domain-validators",
        "cjt/validator/username-validators",
        "cjt/directives/actionButtonDirective",
        "app/services/domains",
        "cjt/directives/validationContainerDirective",
        "cjt/directives/validationItemDirective",
        "cjt/directives/toggleSwitchDirective",
    ],
    function(angular, LOCALE, Fuzzy) {

        "use strict";

        var fuzzyService = new Fuzzy();

        var app = angular.module("cpanel.domains");

        /**
         * Create Controller for Domains
         *
         * @module createDomain
         *
         * @param  {Object} $scope angular scope
         *
         */

        var controller = app.controller(
            "createDomain",
            ["$scope", "$location", "$routeParams", "$timeout", "domains", "alertService", "domainTypes", "DOMAIN_TYPE_CONSTANTS", "PAGE",
                function($scope, $location, $routeParams, $timeout, $domainsService, $alertService, domainTypes, DOMAIN_TYPE_CONSTANTS, PAGE) {

                    var _domainTypesMap = {};
                    var _featureMap = {};

                    function init() {

                        domainTypes.forEach(function(domainType) {
                            _domainTypesMap[domainType.value] = domainType;
                            _featureMap[domainType.value] = PAGE.features[domainType.value];
                        });

                        $scope.resetForm();

                        if ($routeParams["domain"]) {
                            $scope.newDomain.newDomainName = $routeParams["domain"];
                            updateDomainType();
                            generateDocumentRoot();
                            generateSubdomain($scope.newDomain.newDomainName);
                        }

                        _updateFuzzyService();

                    }

                    function _updateFuzzyService() {

                        $domainsService.get().then(function(domains) {
                            var flattenedDomains = domains.filter(function(domain) {
                                if (domain.canBeSuggested) {
                                    return true;
                                }
                                return false;
                            }).map(function(domain) {
                                return domain.domain;
                            });

                            fuzzyService.loadSet(flattenedDomains);
                        });

                        if (!PAGE.hasWebServerRole) {
                            $scope.mustInheritDocumentRoot = true;
                        }

                    }

                    function _showCreationDelayedMessage() {
                        $scope.creationDelayed = true;
                    }

                    function _getDomain(domain) {
                        return $domainsService.findDomainByName(domain);
                    }

                    function _getDomainType(domainType) {
                        return _domainTypesMap[domainType];
                    }

                    function _generateSuggestions(domainParts) {
                        var suffix = domainParts.slice(domainParts.length - 2).join(".");

                        // Remove the last part
                        domainParts.pop();
                        domainParts.pop();

                        var subdomainsOnly = !$scope.canCreateDomainType(DOMAIN_TYPE_CONSTANTS.ALIAS) && !$scope.canCreateDomainType(DOMAIN_TYPE_CONSTANTS.ADDON);
                        var domainsThreshold = !subdomainsOnly ? 4 : 10;

                        var fuzzyResults = fuzzyService.search(suffix);

                        var topResults = fuzzyResults.filter(function(fuzzyResult) {
                            return fuzzyResult.distance < domainsThreshold;
                        });


                        if (topResults.length) {
                            var topMatchDomain = domainParts.join(".") + "." + fuzzyResults[0].match;

                            $scope.newDomain.domain = $domainsService.getMainDomain().domain;
                            $scope.clearSuggestedDomains();

                            if (topMatchDomain !== $scope.newDomain.newDomainName) {

                                // Looks like a subdomain.
                                // List the top 5 domains only.
                                $scope.suggestedDomains = topResults.slice(0, 5).map(function(fuzzyResult) {
                                    var suggestedDomain = domainParts.join(".") + "." + fuzzyResult.match;
                                    return {
                                        domain: suggestedDomain,
                                        closeable: !subdomainsOnly,
                                        use: function() {
                                            useSuggestedDomain(suggestedDomain);
                                        },
                                        cancel: clearSuggestedDomains
                                    };
                                });

                            }
                        }
                    }

                    function onUpdateNewDomainName() {

                        // Clear these on each update, so previous filled suggestions invalidate
                        $scope.subdomain = "";
                        $scope.domain = "";
                        $scope.documentRoot = "";
                        $scope.newDomain.isWildcard = false;

                        if (!$scope.newDomain.newDomainName) {
                            return;
                        }

                        if ($scope.newDomain.newDomainName.substr(0, 1) === "*") {

                            // looks like a wildcard
                            $scope.newDomain.inheritDocumentRoot = false;
                            $scope.newDomain.isWildcard = true;
                        }

                        var domainParts = $scope.newDomain.newDomainName.split(".");
                        if (domainParts.length >= 3) {
                            _generateSuggestions(domainParts);
                        }

                        updateDomainType();
                        generateDocumentRoot();
                        generateSubdomain($scope.newDomain.newDomainName);
                    }


                    function generateDocumentRoot() {

                        if (!$scope.newDomain.newDomainName) {
                            return;
                        }

                        if ($scope.newDomain.domainType === DOMAIN_TYPE_CONSTANTS.ALIAS) {

                            // alias domain uses the main domain
                            $scope.newDomain.documentRoot = $scope.mainDomain.documentRoot.replace($scope.mainDomain.homedir + "/", "");
                            $scope.newDomain.fullDocumentRoot = $scope.mainDomain.documentRoot;
                        } else {
                            var newDocRoot = $scope.newDomain.newDomainName.replace("*", "_wildcard_");
                            $scope.newDomain.documentRoot = newDocRoot;
                            $scope.newDomain.fullDocumentRoot = $domainsService.generateFullDocumentRoot(newDocRoot);
                        }

                    }

                    function generateSubdomain(from) {

                        // Instead of one part, use the whole thing
                        $scope.newDomain.subdomain = from;
                    }

                    function getFormFieldClasses(form) {
                        return form && !form.$pristine && form.$invalid ? "col-xs-12 col-md-6" : "col-xs-12";
                    }

                    function resetForm() {

                        $scope.newDomain.newDomainName = "";
                        $scope.newDomain.documentRoot =  "";
                        $scope.newDomain.inheritDocumentRoot = $scope.canCreateDomainType(DOMAIN_TYPE_CONSTANTS.ALIAS);
                        updateDomainType();
                        generateDocumentRoot();
                        generateSubdomain($scope.newDomain.newDomainName);

                    }

                    function createDomain(form, domainObject, createAnotherOnCompletion) {

                        $scope.submittingForm = true;

                        // If this takes too long, let them know why.
                        var $timer = $timeout(_showCreationDelayedMessage, 1000);

                        // Copying here to allow editing for creatino of another domain without affecting this one
                        var submittingDomainObj = angular.copy(domainObject);

                        return $domainsService.add(submittingDomainObj).then(function() {
                            var homeDir = $scope.mainDomain.homedir;

                            $alertService.add({
                                type: "success",
                                message: LOCALE.maketext("You have successfully created the new “[_1]” domain with the document root of “[_2]”.", submittingDomainObj.newDomainName, homeDir + "/" + submittingDomainObj.documentRoot)
                            });

                            if (!createAnotherOnCompletion) {
                                $location.path("/");
                            } else {
                                _updateFuzzyService();
                                $scope.resetForm();
                                _refocus();
                                form.$setPristine();
                            }
                        }).finally(function() {
                            $scope.creationDelayed = false;
                            $timeout.cancel($timer);
                            $scope.submittingForm = false;
                        });
                    }

                    function _refocus() {
                        angular.element(document).find("input[autofocus]").focus();
                    }

                    function updateDomainType() {

                        var domain = $scope.newDomain.newDomainName = $scope.newDomain.newDomainName.toLocaleLowerCase();

                        $scope.newDomain.domainType = "";

                        if (!$scope.newDomain.newDomainName) {
                            return;
                        }

                        if ($scope.newDomain.inheritDocumentRoot) {

                            // By default, it's a parked domain if it doesn't need its own document root.
                            $scope.newDomain.domainType = DOMAIN_TYPE_CONSTANTS.ALIAS;
                        } else {
                            var domainParts = domain.split(".");
                            if (domainParts.length > 2) {

                                // Possible Subdomain
                                // Excluding the very first part, do the combination of any
                                // other parts match an existing domain
                                var suffix;
                                for (var i = 1; i < domainParts.length; i++) {
                                    suffix = domainParts.slice(i).join(".");
                                    var matchingDomain = _getDomain(suffix);
                                    if (matchingDomain) {

                                        // Matches a domain, we should do this as a subdomain
                                        // to avoid creation of the additiona subdomain
                                        $scope.newDomain.domainType = DOMAIN_TYPE_CONSTANTS.SUBDOMAIN;
                                        $scope.newDomain.domain = suffix;
                                        $scope.newDomain.subdomain = domainParts.slice(0, i).join(".");
                                        break; // We want to attach to the longest domain
                                    }
                                }
                            }
                        }

                        if (!$scope.newDomain.domainType) {

                            // Must be an addon domain bar.com or foo.com
                            // if it made it this far without being set
                            $scope.newDomain.domainType = DOMAIN_TYPE_CONSTANTS.ADDON;
                            $scope.newDomain.domain = $scope.mainDomain.domain;
                        }

                    }

                    function useSuggestedDomain(suggestedDomain) {
                        $scope.newDomain.newDomainName = suggestedDomain;
                        updateDomainType();
                        generateDocumentRoot();
                        $scope.clearSuggestedDomains();
                    }

                    function clearSuggestedDomains() {
                        $scope.suggestedDomains = [];
                    }

                    function onToggleInheritDocumentRoot() {
                        updateDomainType();
                        generateDocumentRoot();
                    }

                    function canCreateDomainType(domainType) {

                        // Don't bother checking anything else if the feature isn't enabled
                        if ( !_featureMap[domainType] ) {
                            return false;
                        }

                        var domainTypeObject = _getDomainType(domainType);

                        var domainName = $scope.newDomain.newDomainName || "";
                        if (domainName.substr(0, 2) === "*.") {

                            // parked and addon domains can't be wildcards
                            if (domainType === DOMAIN_TYPE_CONSTANTS.ADDON || domainType === DOMAIN_TYPE_CONSTANTS.ALIAS) {
                                return false;
                            }
                        }
                        return !domainTypeObject.overLimit;

                    }

                    function canCreateDomains() {
                        return $scope.canCreateDomainType(DOMAIN_TYPE_CONSTANTS.ALIAS) || $scope.canCreateDomainType(DOMAIN_TYPE_CONSTANTS.ADDON) || $scope.canCreateDomainType(DOMAIN_TYPE_CONSTANTS.SUBDOMAIN);
                    }

                    function inheritDocRootSelectionDisabled() {
                        return !$scope.canCreateDomainType(DOMAIN_TYPE_CONSTANTS.ALIAS) || (!$scope.canCreateDomainType(DOMAIN_TYPE_CONSTANTS.SUBDOMAIN) && !$scope.canCreateDomainType(DOMAIN_TYPE_CONSTANTS.ADDON));
                    }

                    function onDocumentRootUpdated() {
                        $scope.newDomain.fullDocumentRoot = $domainsService.generateFullDocumentRoot($scope.newDomain.documentRoot);
                    }

                    angular.extend($scope, {
                        DOMAIN_TYPE_CONSTANTS: DOMAIN_TYPE_CONSTANTS,
                        submittingForm: false,
                        creationDelayed: false,
                        upgradeUrl: PAGE.upgradeUrl,
                        documentRootPattern: $domainsService.getDocumentRootPattern(),
                        suggestedDomains: [],
                        domainTypes: domainTypes,
                        requirePublicHTMLSubs: PAGE.requirePublicHTMLSubs.toString() === "1",
                        mainDomain: $domainsService.getMainDomain(),
                        newDomain: {},
                        getFormFieldClasses: getFormFieldClasses,
                        resetForm: resetForm,
                        createDomain: createDomain,
                        onUpdateNewDomainName: onUpdateNewDomainName,
                        useSuggestedDomain: useSuggestedDomain,
                        clearSuggestedDomains: clearSuggestedDomains,
                        onToggleInheritDocumentRoot: onToggleInheritDocumentRoot,
                        onDocumentRootUpdated: onDocumentRootUpdated,
                        canCreateDomainType: canCreateDomainType,
                        canCreateDomains: canCreateDomains,
                        inheritDocRootSelectionDisabled: inheritDocRootSelectionDisabled
                    });

                    init();

                }
            ]
        );

        return controller;
    }
);
