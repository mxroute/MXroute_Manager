/*
# domains/views/ROUTES.js                          Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

/** @namespace cpanel.domains.views.ROUTES */

define(
    'app/views/ROUTES',[
        "cjt/util/locale"
    ],
    function(LOCALE) {

        "use strict";

        var ROUTES = [
            {
                "id": "listDomains",
                "route": "/",
                "hideTitle": false,
                "controller": "listDomains",
                "templateUrl": "views/listDomains.ptt",
                "title": LOCALE.maketext("List Domains"),
                "resolve": {
                    "currentDomains": ["domains", function($service) {
                        return $service.get();
                    }]
                }
            },
            {
                "id": "createDomain",
                "route": "/create",
                "controller": "createDomain",
                "templateUrl": "views/createDomain.ptt",
                "title": LOCALE.maketext("Create a New Domain"),
                "resolve": {
                    "domainTypes": ["domains", function($service) {
                        return $service.getTypes();
                    }],
                    "currentDomains": ["domains", function($service) {
                        return $service.get();
                    }]
                }
            },
            {
                "id": "manageDomain",
                "route": "/manage",
                "controller": "manageDomain",
                "templateUrl": "views/manageDomain.ptt",
                "hideTitle": true,
                "title": LOCALE.maketext("Manage the Domain"),
                "resolve": {
                    "domainTypes": ["domains", function($service) {
                        return $service.getTypes();
                    }],
                    "currentDomains": ["domains", function($service) {
                        return $service.get();
                    }]
                }
            }

        ];

        return ROUTES;
    }
);

/*
 * domains/services/domains.js                           Copyright 2018 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define, PAGE */

/** @namespace cpanel.domains.services.domains */

define(
    'app/services/domains',[
        "angular",
        "lodash",
        "cjt/util/locale",
        "cjt/io/uapi-request",
        "cjt/io/api2-request",
        "cjt/io/uapi",
        "cjt/io/api2",
        "cjt/modules",
        "cjt/services/APICatcher"
    ],
    function(angular, _, LOCALE, UAPIRequest, API2Request) {

        "use strict";

        var app = angular.module("cpanel.domains.domains.service", []);
        app.value("PAGE", PAGE);

        app.value("DOMAIN_TYPE_CONSTANTS", {
            SUBDOMAIN: "subdomain",
            ADDON: "addon",
            ALIAS: "alias",
            MAIN: "main_domain"
        });

        app.factory("domains", ["$q", "APICatcher", "DOMAIN_TYPE_CONSTANTS", "PAGE", function($q, APICatcher, DOMAIN_TYPE_CONSTANTS, PAGE) {

            /**
             * service wrapper for domain related functions
             *
             * @module domains
             *
             * @param  {Object} $q angular $q object
             * @param  {Object} APICatcher cjt2 APICatcher service
             * @param  {Object} DOMIAIN_TYPE_CONSTANTS constants objects for use on domain types
             * @param  {Object} PAGE window.PAGE object
             *
             * @example
             * $domainsService.get()
             *
             */

            var _flattenedDomains;
            var _mainDomain;
            var _domainLookupMap = {};
            var _parkDomains;
            var _addOnDomains;
            var _subDomains;
            var _usageStats;
            var _domainSSLMap;

            var Domain = function Domain(domainObject) {

                var self = this;

                Object.keys(domainObject).forEach(function(key) {
                    self[key] = domainObject[key];
                });

                self.protocol = "http";
                self.isWildcard = self["domain"] && self["domain"].substr(0, 1) === "*";
                self.canBeSuggested = !self.isWildcard;

            };

            var _domainTypes = [
                {
                    label: LOCALE.maketext("Subdomain"),
                    value: DOMAIN_TYPE_CONSTANTS.SUBDOMAIN,
                    requiresCustomDocumentRoot: true,
                    stat: "subdomains"
                },
                {
                    label: LOCALE.maketext("Addon"),
                    value: DOMAIN_TYPE_CONSTANTS.ADDON,
                    requiresCustomDocumentRoot: true,
                    dependantStat: "subdomains",
                    stat: "addon_domains"
                },
                { label: LOCALE.maketext("Alias"), value: DOMAIN_TYPE_CONSTANTS.ALIAS, stat: "aliases" }
            ];

            var Domains = function() {};

            Domains.prototype = APICatcher;

            // -------- UTILS -------------

            Domains.prototype._cacheDomain = function _cacheDomain(domainObject) {

                if (!_flattenedDomains) {
                    _flattenedDomains = [];
                }

                var domain = new Domain(domainObject);

                _domainLookupMap[domain.domain] = domain;
                _flattenedDomains.push(domain);

                return domainObject;
            };

            Domains.prototype._uncacheDomain = function _uncacheDomain(domain) {
                var self = this;

                if (!_flattenedDomains) {
                    return false;
                }

                var domainObject = self._getDomainObject(domain);

                for (var i = _flattenedDomains.length - 1; i >= 0; i--) {
                    if (_flattenedDomains[i].domain === domainObject.domain) {
                        _flattenedDomains.splice(i, 1);
                    }
                }
            };

            function _findStatById(_stats, id) {
                for (var statI in _stats) {
                    if (_stats.hasOwnProperty(statI) && _stats[statI].id === id) {
                        return _stats[statI];
                    }
                }
                return;
            }

            function _findDomainTypeByValue(value) {
                for (var domainTypeI in _domainTypes) {
                    if (_domainTypes.hasOwnProperty(domainTypeI) && _domainTypes[domainTypeI].value === value) {
                        return _domainTypes[domainTypeI];
                    }
                }
                return;
            }

            function _canCustomizeDocumentRoots() {
                return PAGE.hasWebServerRole === "1";
            }

            function _checkStatOverLimit(stat) {

                if (!stat) {
                    return;
                }

                var max = stat.maximum === null ? undefined : Number(stat.maximum);
                var usage = Number(stat.usage);

                if (!isNaN(max)) {

                    var per = usage / max;
                    if (max === 0 || per >= 1) {
                        return true;
                    }

                }

                return false;

            }

            Domains.prototype._getDomainObject = function _getDomainObject(domain) {
                var self = this;
                if (typeof domain === "string") {
                    return self.findDomainByName(domain);
                }

                return domain;
            };

            Domains.prototype._getSubDomainObject = function _getDomainObject(subdomain) {
                var self = this;
                if (typeof subdomain === "string") {
                    return self.findDomainByName(subdomain + "." + self.getMainDomain().domain);
                }

                return subdomain;
            };

            Domains.prototype._associateAddonDomains = function _associateAddonDomains() {
                var self = this;

                angular.forEach(_addOnDomains, function(addonDomain) {
                    var subdomainObject = self._getSubDomainObject(addonDomain.subdomain);
                    if (subdomainObject) {
                        subdomainObject.associatedAddonDomain = addonDomain.domain;
                    }
                });

            };

            // -------- \ UTILS -------------

            // -------- CREATE -------------

            /**
             * API Wrapper for adding a subdomain
             *
             * @method addSubdomain
             *
             * @param  {Object} domainObject object representing all the aspects of the domains
             *
             * @return {Promise<Object>} returns the api promise and then the newly added domain
             *
             */

            Domains.prototype.addSubdomain = function addSubdomain(domainObject) {
                var self = this;

                var apiCall = new API2Request.Class();
                apiCall.initialize("SubDomain", "addsubdomain");
                apiCall.addArgument("domain", domainObject.subdomain);
                apiCall.addArgument("rootdomain", domainObject.domain);
                apiCall.addArgument("canoff", "1");
                apiCall.addArgument("disallowdot", "0");
                apiCall.addArgument("dir", domainObject.documentRoot);

                return self.promise(apiCall).then(function(result) {
                    var domain = domainObject.subdomain;
                    return self.fetchSingleDomainData(domain).then(function(updatedDomain) {
                        updatedDomain = angular.extend(updatedDomain, {
                            subdomain: domainObject.subdomain,
                            rootDomain: domainObject.domain,
                            type: DOMAIN_TYPE_CONSTANTS.SUBDOMAIN,
                            canEdit: {
                                documentRoot: true
                            },
                            canRemove: true
                        });
                        return self._cacheDomain(updatedDomain);
                    });
                });
            };

            /**
             * API Wrapper for adding an addon domain
             *
             * @method addAddonDomain
             *
             * @param  {Object} domainObject object representing all the aspects of the domains
             *
             * @return {Promise<Object>} returns the api promise and then the newly added domain
             *
             */

            Domains.prototype.addAddonDomain = function addAddonDomain(domainObject) {

                var self = this;

                var apiCall = new API2Request.Class();
                apiCall.initialize("AddonDomain", "addaddondomain");
                apiCall.addArgument("subdomain", domainObject.subdomain);
                apiCall.addArgument("newdomain", domainObject.newDomainName);
                apiCall.addArgument("ftp_is_optional", "1");
                apiCall.addArgument("dir", domainObject.documentRoot);

                return self.promise(apiCall).then(function() {
                    return self.fetchSingleDomainData(domainObject.newDomainName).then(function(updatedDomain) {
                        var addonDomain = angular.extend(angular.copy(updatedDomain), {
                            type: DOMAIN_TYPE_CONSTANTS.ADDON,
                            subdomain: domainObject.subdomain,
                            canEdit: {
                                documentRoot: true
                            },
                            canRemove: true
                        });
                        self._cacheDomain(angular.extend(angular.copy(updatedDomain), {
                            domain: domainObject.subdomain + "." + domainObject.domain,
                            subdomain: domainObject.subdomain,
                            type: DOMAIN_TYPE_CONSTANTS.SUBDOMAIN,
                            associatedAddonDomain: addonDomain,
                            canEdit: {
                                documentRoot: true
                            },
                            canRemove: true
                        }));
                        return self._cacheDomain(addonDomain);
                    });

                });
            };

            /**
             * API Wrapper for adding an alias domain
             *
             * @method addAliasDomain
             *
             * @param  {Object} domainObject object representing all the aspects of the domains
             *
             * @return {Promise<Object>} returns the api promise and then the newly added domain
             *
             */

            Domains.prototype.addAliasDomain = function addAliasDomain(domainObject) {

                var self = this;

                var apiCall = new API2Request.Class();
                apiCall.initialize("Park", "park");
                apiCall.addArgument("domain", domainObject.newDomainName);

                return self.promise(apiCall).then(function() {
                    var parkedDomain = angular.copy(self.getMainDomain());
                    parkedDomain.domain = domainObject.newDomainName;
                    parkedDomain.type = DOMAIN_TYPE_CONSTANTS.ALIAS;
                    parkedDomain.canRemove = true;
                    return self._cacheDomain(parkedDomain);
                });
            };

            /**
             * Add a domain, automatically selecting APIs based on which domainType is set
             *
             * @method add
             *
             * @param  {Object} domainObject object representing all the aspects of the domains
             *
             * @return {Promise<Object>} returns the api promise and then the newly added domain
             *
             */

            Domains.prototype.add = function _addNewDomain(domainObject) {

                var self = this;

                var addNewPromise;

                if (domainObject.domainType === DOMAIN_TYPE_CONSTANTS.SUBDOMAIN) {
                    addNewPromise = self.addSubdomain(domainObject);
                } else if (domainObject.domainType === DOMAIN_TYPE_CONSTANTS.ADDON ) {
                    addNewPromise = self.addAddonDomain(domainObject);
                } else if (domainObject.domainType === DOMAIN_TYPE_CONSTANTS.ALIAS ) {
                    addNewPromise = self.addAliasDomain(domainObject);
                }

                addNewPromise.then(function(result) {

                    var domainType = _findDomainTypeByValue(domainObject.domainType);
                    var stat = _findStatById(self.getUsageStats(), domainType.stat);
                    if (stat) {
                        stat.usage++;
                    }
                    self.updateDomainTypeLimits();
                    self.updateSSLCoverage();
                    return result;

                });

                return addNewPromise;

            };

            // -------- \ CREATE -------------

            /**
             * Convert a relative document root to a full document root based on the homedir and the PAGE.requirePublicHTMLSubs
             *
             * @method generateFullDocumentRoot
             *
             * @param  {String} relativeDocumentRoot document root relative to the homedir
             *
             * @return {String} returns the parsed document root
             *
             */

            Domains.prototype.generateFullDocumentRoot = function generateFullDocumentRoot(relativeDocumentRoot) {
                var self = this;

                var requirePublicHTMLSubs = PAGE.requirePublicHTMLSubs.toString() === "1";
                var fullDocumentRoot = self.getMainDomain().homedir + "/";
                if (requirePublicHTMLSubs) {
                    fullDocumentRoot += "public_html/";
                }
                fullDocumentRoot += relativeDocumentRoot ? relativeDocumentRoot.replace(/^\//, "") : "";
                return fullDocumentRoot;
            };

            // -------- READ -------------

            /**
             * Get the currently stored main domain
             *
             * @method getMainDomain
             *
             * @return {Object} returns the current main domain object
             *
             */

            Domains.prototype.getMainDomain = function _getMainDomain() {
                return _mainDomain;
            };

            /**
             * Find a domain object by the domain name
             *
             * @method findDomainByName
             *
             * @param  {String} domainName domain name (bob.com)
             *
             * @return {Object} returns the domain object if found
             *
             */
            Domains.prototype.findDomainByName = function _findDomainByName(domainName) {
                return _domainLookupMap[domainName];
            };

            /**
             * API Wrapper to fetch the current list of addon domains
             *
             * @method fetchAddonDomains
             *
             * @return {Promise<Array>} returns a promise, then an array of domain objects
             *
             */

            Domains.prototype.fetchAddonDomains = function fetchAddonDomains() {
                if (_addOnDomains) {
                    return $q.resolve(_addOnDomains);
                }

                _addOnDomains = [];

                var self = this;
                var apiCall = new API2Request.Class();
                apiCall.initialize("Park", "listaddondomains");

                return self.promise(apiCall).then(function(result) {
                    var domains = result.data || [];
                    domains.forEach(function(rawDomain) {
                        var parsedDomain = {
                            domain: rawDomain.domain,
                            type: DOMAIN_TYPE_CONSTANTS.ADDON,
                            documentRoot: rawDomain.dir,
                            homedir: self.getMainDomain().homedir,
                            subdomain: rawDomain.subdomain,
                            rootDomain: rawDomain.rootdomain,
                            redirectsTo: rawDomain.status === "not redirected" ? null : rawDomain.status,
                            canEdit: {
                                documentRoot: true
                            },
                            canRemove: true
                        };
                        this.push(parsedDomain);
                        self._cacheDomain(parsedDomain);
                    }, _addOnDomains);

                    return _addOnDomains;
                });
            };


            /**
             * API Wrapper to fetch the current list of parked domains
             *
             * @method fetchParkedDomains
             *
             * @return {Promise<Array>} returns a promise, then an array of domain objects
             *
             */

            Domains.prototype.fetchParkedDomains = function fetchParkedDomains() {

                if (_parkDomains) {
                    return $q.resolve(_parkDomains);
                }

                _parkDomains = [];

                var self = this;
                var apiCall = new API2Request.Class();
                apiCall.initialize("Park", "listparkeddomains");

                return self.promise(apiCall).then(function(result) {
                    var domains = result.data || [];
                    domains.forEach(function(rawDomain) {
                        var parsedDomain = {
                            domain: rawDomain.domain,
                            type: DOMAIN_TYPE_CONSTANTS.ALIAS,
                            documentRoot: rawDomain.dir,
                            homedir: self.getMainDomain().homedir,
                            subdomain: rawDomain.subdomain,
                            redirectsTo: rawDomain.status === "not redirected" ? null : rawDomain.status,
                            rootDomain: PAGE.mainDomain,
                            canRemove: true
                        };
                        this.push(parsedDomain);
                        self._cacheDomain(parsedDomain);
                    }, _parkDomains);

                    return _parkDomains;
                });
            };

            /**
             * API Wrapper to fetch the current list of subdomains
             *
             * @method fetchSubdomains
             *
             * @return {Promise<Array>} returns a promise, then an array of domain objects
             *
             */

            Domains.prototype.fetchSubdomains = function fetchSubdomains() {

                if (_subDomains) {
                    return $q.resolve(_subDomains);
                }

                _subDomains = [];

                var self = this;
                var apiCall = new API2Request.Class();
                apiCall.initialize("SubDomain", "listsubdomains");

                return self.promise(apiCall).then(function(result) {
                    var domains = result.data || [];
                    domains.forEach(function(rawDomain) {
                        var parsedDomain = {
                            domain: rawDomain.domain,
                            type: DOMAIN_TYPE_CONSTANTS.SUBDOMAIN,
                            documentRoot: rawDomain.dir,
                            homedir: self.getMainDomain().homedir,
                            subdomain: rawDomain.subdomain,
                            rootDomain: rawDomain.rootdomain,
                            redirectsTo: rawDomain.status === "not redirected" ? null : rawDomain.status,
                            canEdit: {
                                documentRoot: true
                            },
                            canRemove: true
                        };
                        this.push(parsedDomain);
                        self._cacheDomain(parsedDomain);
                    }, _subDomains);
                    return _subDomains;
                });
            };

            /**
             * API Wrapper to fetch the main domain based on PAGE.mainDomain
             *
             * @method fetchSingleDomainData
             *
             * @return {Promise<Object>} returns a promise, then the single domain object
             *
             */

            Domains.prototype.fetchSingleDomainData = function fetchSingleDomainData(domain) {

                var self = this;
                var apiCall = new UAPIRequest.Class();
                apiCall.initialize("DomainInfo", "single_domain_data");
                apiCall.addArgument("domain", domain);

                return self.promise(apiCall).then(function(result) {
                    var rawDomain = result.data;
                    var singleDomain = {
                        domain: rawDomain.domain,
                        homedir: rawDomain.homedir,
                        documentRoot: rawDomain.documentroot,
                        rootDomain: rawDomain.servername
                    };
                    return singleDomain;
                });
            };

            /**
             * API Wrapper to fetch the main domain based on PAGE.mainDomain
             *
             * @method fetchMainDomain
             *
             * @return {Promise<Object>} returns a promise, then the main domain object
             *
             */

            Domains.prototype.fetchMainDomain = function fetchMainDomain() {

                if (_mainDomain) {
                    return $q.resolve(_mainDomain);
                }

                var self = this;

                return self.fetchSingleDomainData(PAGE.mainDomain).then(function(mainDomain) {
                    mainDomain.type =  DOMAIN_TYPE_CONSTANTS.MAIN;
                    mainDomain.canRemove = false;
                    self._cacheDomain(mainDomain);
                    _mainDomain = mainDomain;
                    return _mainDomain;
                });
            };

            /**
             * API Wrapper to fetch the all domains (main, addon, subdomain, alias) and cache them
             *
             * @method get
             *
             * @return {Promise<Object>} returns a promise, then the array of all domain objects
             *
             */

            var domainsLoadingQ;

            Domains.prototype.get = function getDomains() {

                var self = this;

                if (domainsLoadingQ) {
                    return domainsLoadingQ;
                }

                if (_flattenedDomains) {
                    return $q.resolve(_flattenedDomains);
                }

                _flattenedDomains = [];

                return domainsLoadingQ = self.fetchMainDomain().then(function() {

                    // This weird chaining is to ensure the main domain is loaded before processing
                    return $q.all([
                        self.fetchSubdomains(),
                        self.fetchAddonDomains(),
                        self.fetchParkedDomains()
                    ]);
                }).then(function() {
                    self._associateAddonDomains();
                    if (PAGE.hasSSLInstall) {
                        self.fetchInstalledHosts().then(self.updateSSLCoverage.bind(self));
                    }
                    return _flattenedDomains;
                }).finally(function() {
                    domainsLoadingQ = null;
                });

            };

            Domains.prototype.fetchInstalledHosts = function fetchInstalledHosts() {

                var self = this;
                var apiCall = new UAPIRequest.Class();
                apiCall.initialize("SSL", "installed_hosts");

                if (_domainSSLMap) {
                    return $q.resolve(_domainSSLMap);
                }

                _domainSSLMap = {};

                return self.promise(apiCall).then(function(result) {
                    var data = result.data || [];

                    data.forEach(function(installedHost) {

                        var cert = installedHost.certificate;
                        if (cert && cert.is_self_signed.toString() !== "1") {
                            var domains = cert.domains || [];
                            domains.forEach(function(domain) {
                                _domainSSLMap[domain] = cert;
                            });
                        }

                    });

                    return _domainSSLMap;
                });

            };

            Domains.prototype.updateSSLCoverage = function updateSSLCoverage() {
                var self = this;

                _flattenedDomains.forEach(self.updateDomainSSLCoverage.bind(self));
            };

            Domains.prototype.updateDomainSSLCoverage = function updateDomainSSLCoverage(domain) {

                var self = this;

                if (!_domainSSLMap) {
                    return;
                }

                var domainObject = self._getDomainObject(domain);
                var sslDomains = Object.keys(_domainSSLMap);

                domainObject.isCoveredBySSL = false;
                domainObject.protocol = "http";

                for (var i = 0; i < sslDomains.length; i++) {
                    var sslDomain = sslDomains[i];

                    if (domainObject.domain === sslDomain) {
                        domainObject.isCoveredBySSL = _domainSSLMap[sslDomain];
                        break;
                    }

                    var wildcardDomain = domainObject.domain.replace(/^[^.]+\./, "*.");
                    if (wildcardDomain === sslDomain) {
                        domainObject.isCoveredBySSL = _domainSSLMap[sslDomain];
                        break;
                    }
                }

                if (domainObject.isCoveredBySSL) {
                    domainObject.protocol = "https";
                }

            };

            /**
             * API Wrapper to get the resource usage statistics
             *
             * @method getResourceUsageStats
             *
             * @return {Promise<Array>} returns a promise and then the array of usages statistics
             *
             */

            Domains.prototype.getResourceUsageStats = function _getResourceUsageStats() {

                var self = this;
                var apiCall = new UAPIRequest.Class();
                apiCall.initialize("ResourceUsage", "get_usages");

                return self.promise(apiCall).then(function(result) {
                    return result.data;
                });

            };

            /**
             * Get the currently stored domain types
             *
             * @method getDomainTypes
             *
             * @return {Array} array of domain type objects
             *
             */
            Domains.prototype.getDomainTypes = function _getBaseDomainTypes() {
                return _domainTypes;
            };

            /**
             * Get the currently stored usage statistics
             *
             * @method getUsageStats
             *
             * @return {Array} returns an array of usage stat objects
             *
             */
            Domains.prototype.getUsageStats = function _getUsageStats() {
                return _usageStats;
            };

            /**
             * Uses the current getUsageStats() and updates the overLimit on the domainTypes
             *
             * @method updateDomainTypeLimits
             *
             * @return {Array} returns the updated array of domain type objects
             *
             */
            Domains.prototype.updateDomainTypeLimits = function _updateDomainTypeLimits() {
                var self = this;

                var stats = self.getUsageStats();

                self.getDomainTypes().forEach(function(domainType) {
                    var domainTypeStat = _findStatById(stats, domainType.stat);
                    domainType.overLimit = _checkStatOverLimit(domainTypeStat);
                    if (!_canCustomizeDocumentRoots() && domainType.requiresCustomDocumentRoot ) {
                        domainType.overLimit = true;
                    } else if (!domainType.overLimit && domainType.dependantStat) {
                        domainType.overLimit = domainType.overLimit || _checkStatOverLimit(_findStatById(stats, domainType.dependantStat));
                    }
                });

                return self.getDomainTypes();

            };


            /**
             * Get the domain types and update their overlimit by quering the usage stats APIs
             *
             * @method getTypes
             *
             * param jsdocparam maybe?
             *
             * @return {Promise<Array>} returns a promise and then an array of domain types with the updated overLimit values
             *
             */
            Domains.prototype.getTypes = function _getDomainTypes() {
                var self = this;

                if (self.getUsageStats()) {
                    return $q.resolve(self.getDomainTypes());
                }


                return self.getResourceUsageStats().then(function(stats) {

                    _usageStats = stats;

                    self.updateDomainTypeLimits();

                    return self.getDomainTypes();

                });
            };

            // -------- \ READ -------------

            // -------- UPDATE -------------


            /**
             * Update the document root for a subdomain
             *
             * @method updateDocumentRoot
             *
             * @param  {String|Object} domain domain name or domain object
             *
             * @return {Promise<Object>} returns promise and then the updated domainObject
             *
             */
            Domains.prototype.updateDocumentRoot = function updateDocumentRoot(domain, documentRoot) {
                var self = this;
                var domainObject = self._getDomainObject(domain);

                ["subdomain", "rootDomain"].forEach(function(key) {
                    if (!domainObject[key]) {
                        throw new Error(key + " is required but undefined on " + domainObject.domain);
                    }
                });

                var apiCall = new API2Request.Class();
                apiCall.initialize("SubDomain", "changedocroot");
                apiCall.addArgument("subdomain", domainObject.subdomain);
                apiCall.addArgument("rootdomain", domainObject.rootDomain);
                apiCall.addArgument("dir", documentRoot);

                return self.promise(apiCall).then(function() {

                    domainObject.documentRoot = documentRoot;

                    return self.fetchSingleDomainData(domainObject.domain).then(function(updatedDomain) {
                        var updatedDocumentRoot = updatedDomain.documentRoot;

                        // find and update existing domain
                        if (domainObject.type === DOMAIN_TYPE_CONSTANTS.ADDON) {

                            // This is an addon domain. So there is a subdomain that just had it's document root updated too.
                            var subdomainObject = self._getSubDomainObject(domainObject.subdomain);
                            subdomainObject.documentRoot = updatedDocumentRoot;
                        } else if (domainObject.associatedAddonDomain) {

                            // This is an addon domain. Check for an associated addon domain
                            var addonDomainObject = self._getDomainObject(domainObject.associatedAddonDomain);
                            addonDomainObject.documentRoot = updatedDocumentRoot;
                        }

                        domainObject.documentRoot = updatedDocumentRoot;

                        return domainObject;
                    });

                });
            };

            // -------- \ UPDATE -------------

            // -------- DELETE -------------

            /**
             * API Wrapper call to remove a subdomain
             *
             * @method removeSubdomain
             *
             * @param  {String|Object} domain domain name or domain object
             *
             * @return {Promise} returns the promise that removes the subdomain
             *
             */
            Domains.prototype.removeSubdomain = function removeSubdomain(domain) {
                var self = this;
                var domainObject = self._getDomainObject(domain);

                var apiCall = new API2Request.Class();
                apiCall.initialize("SubDomain", "delsubdomain");
                apiCall.addArgument("domain", domainObject.subdomain + "_" + domainObject.rootDomain);

                return self.promise(apiCall);
            };

            /**
             * API Wrapper call to remove an addon domain
             *
             * @method removeAddonDomain
             *
             * @param  {String|Object} domain domain name or domain object
             *
             * @return {Promise} returns the promise that removes the addon domain
             *
             */
            Domains.prototype.removeAddonDomain = function removeAddonDomain(domain) {
                var self = this;
                var domainObject = self._getDomainObject(domain);

                var apiCall = new API2Request.Class();
                apiCall.initialize("AddonDomain", "deladdondomain");
                apiCall.addArgument("domain", domainObject.domain);

                // The addon domain's subdomain, an underscore (_), and the addon domain's main domain.
                apiCall.addArgument("subdomain", domainObject.subdomain + "_" + self.getMainDomain().domain);

                return self.promise(apiCall);
            };

            /**
             * API Wrapper call to remove an alias domain
             *
             * @method removeAliasDomain
             *
             * @param  {String|Object} domain domain name or domain object
             *
             * @return {Promise} returns the promise that removes the alias domain
             *
             */
            Domains.prototype.removeAliasDomain = function removeAliasDomain(domain) {
                var self = this;
                var domainObject = self._getDomainObject(domain);

                var apiCall = new API2Request.Class();
                apiCall.initialize("Park", "unpark");
                apiCall.addArgument("domain", domainObject.domain);

                return self.promise(apiCall);
            };

            /**
             * API Wrapper call to remove a redirect for a domain
             *
             * @method removeRedirect
             *
             * @param  {String|Object} domain domain name or domain object
             *
             * @return {Promise} returns the promise that removes the redirect from the domain
             *
             */
            Domains.prototype.removeRedirect = function removeRedirect(domain) {
                var self = this;
                var domainObject = self._getDomainObject(domain);

                var apiCall = new UAPIRequest.Class();
                apiCall.initialize("Mime", "delete_redirect");
                apiCall.addArgument("domain", domainObject.domain);
                apiCall.addArgument("src", domainObject.redirectTo);
                apiCall.addArgument("redirect", domainObject.documentRoot);

                return self.promise(apiCall).then(function() {
                    domainObject.redirectTo = "";
                });
            };


            Domains.prototype._removeDomainAdjustStats = function _removeDomainAdjustStats(domain) {
                var self = this;
                var domainObject = self._getDomainObject(domain);

                if (!domainObject) {
                    return;
                }

                // Remove the subdomain too, it's automatically deleted by the API
                if (domainObject.type === DOMAIN_TYPE_CONSTANTS.ADDON) {
                    self._removeDomainAdjustStats(domainObject.subdomain + "." + self.getMainDomain().domain);
                }

                self._uncacheDomain(domainObject);

                // Update Stat for Domain Type
                var domainTypeObject = _findDomainTypeByValue(domainObject.type);
                var stat = _findStatById(self.getUsageStats(), domainTypeObject.stat);
                if (stat) {
                    stat.usage--;
                }
                self.updateDomainTypeLimits();
            };

            /**
             * Remove a domain, redirects, and adjust statistics for the domain type
             *
             * @method remove
             *
             * @param  {String|Object} domain domain name or domain object
             *
             * @return {Promise} returns the promise that will remove the domain and redirects for a domain
             *
             */
            Domains.prototype.remove = function removeDomain(domain) {
                var self = this;
                var domainObject = self._getDomainObject(domain);

                var originalCanEdit = domainObject.canEdit;
                domainObject.canEdit = false;

                var promises = [];

                if ( domainObject.type === DOMAIN_TYPE_CONSTANTS.SUBDOMAIN ) {
                    promises.push(self.removeSubdomain(domainObject));
                } else if ( domainObject.type === DOMAIN_TYPE_CONSTANTS.ADDON ) {
                    promises.push(self.removeAddonDomain(domainObject));
                } else if ( domainObject.type === DOMAIN_TYPE_CONSTANTS.ALIAS ) {
                    if (domainObject.redirectTo) {
                        promises.push(self.removeRedirect(domainObject));
                    }
                    promises.push(self.removeAliasDomain(domainObject));
                }

                domainObject.removing = true;

                return $q.all(promises).then(function(result) {
                    self._removeDomainAdjustStats(domainObject);
                }, function(result) {

                    if ( _.isArray(result) ) {
                        result.forEach(function(resultItem) {
                            if (resultItem && resultItem.error) {
                                throw resultItem.error;
                            }
                        });
                    } else if (result && result.error) {
                        throw result.error;
                    }

                    // failed, restore edit capability
                    domainObject.canEdit = originalCanEdit;
                }).finally(function() {
                    domainObject.removing = false;
                    self._uncacheDomain(domainObject);
                });
            };

            Domains.prototype.getDocumentRootPattern = function() {
                var regExp = new RegExp("^[^" + _.escapeRegExp('%?* :|"<>\\') + "]+$");
                return regExp;
            };

            // -------- \ DELETE -------------

            return new Domains();
        }]);
    }
);

/*
# domains/directives/tableShowingDirecitve.js                                    Copyright(c) 2018 cPanel, Inc.
#                                                                                All rights Reserved.
# copyright@cpanel.net                                                           http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

/** @namespace cpanel.domains.directive.tableShowing */

define(
    'app/directives/tableShowingDirective',[
        "angular",
        "cjt/util/locale",
        "cjt/core"
    ],
    function(angular, LOCALE, CJT) {

        "use strict";

        var module = angular.module("cpanel.domains.tableShowing.directive", []);

        module.directive("tableShowing", function tableShowing() {

            /**
             * Directive to render the "Showing 1 - 4 of 10"
             *
             * @module table-showing
             *
             * @param  {Number} start first number in range ([1]-4)
             * @param  {Number} limit second number in range (1-[4])
             * @param  {Number} total total number of items (10)
             *
             * @example
             * <table-showing start="1" limit="4" total="10"></table-showing>
             *
             */

            var TEMPLATE_PATH = "directives/tableShowingDirective.ptt";
            var RELATIVE_PATH = "domains/" + TEMPLATE_PATH;

            return {
                templateUrl: CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : TEMPLATE_PATH,
                restrict: "EA",
                scope: {
                    start: "=",
                    limit: "=",
                    total: "="
                },
                transclude: true,
                controller: ["$scope", function($scope) {

                    /**
                     * Get the rendered string from LOCALE
                     *
                     * @method getShowingText
                     *
                     * @return {String} localized string
                     *
                     */

                    $scope.getShowingText = function getShowingText() {
                        return LOCALE.maketext("Displaying [numf,_1] through [numf,_2] out of [quant,_3,item,items]", $scope.start, $scope.limit, $scope.total);
                    };

                }]
            };

        });
    }
);

/*
# domains/directives/itemLister.js                                     Copyright(c) 2018 cPanel, Inc.
#                                                                                All rights Reserved.
# copyright@cpanel.net                                                           http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

/** @namespace cpanel.domains.directive.itemLister */

define(
    'app/directives/itemLister',[
        "angular",
        "lodash",
        "cjt/core",
        "ngRoute",
        "ngSanitize",
        "cjt/modules",
        "app/directives/tableShowingDirective",
        "cjt/services/cpanel/componentSettingSaverService",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/searchDirective",
        "cjt/directives/pageSizeDirective",
        "cjt/filters/startFromFilter",
        "cjt/decorators/paginationDecorator"
    ],
    function(angular, _, CJT) {

        "use strict";

        var module = angular.module("cpanel.domains.itemLister.directive", [
            "cpanel.domains.tableShowing.directive",
            "ngRoute",
            "ngSanitize",
            "cjt2.filters.startFrom"
        ]);

        module.directive("itemLister", ["$window", "$log", "componentSettingSaverService", function itemLister($window, $log, $CSSS) {

            /**
             * Item Lister combines the typical table functions, pageSize,
             * showing, paginator, search, and allows you to plug in multiple
             * views.
             *
             * @module item-lister
             * @restrict EA
             *
             * @param  {String} id disseminated to other objects
             * @param  {Array} items Items that will be paginated, array of objs
             * @param  {Array} configuration-options Items that will be in the configuration cog
             * @param  {Array} header-items represents the columns of the table
             *
             * @example
             * <item-lister
             *      id="MyItemLister"
             *      items="[a,b,c,d,e]"
             *      configuration-options="configurationOptions"
             *      header-items="[{field:"blah",label:"Blah",sortable:false}]">
             *   <my-item-lister-view></my-item-lister-view>
             * </item-lister>
             *
             */

            var COMPONENT_NAME = "domainsItemLister";
            var TEMPLATE_PATH = "directives/itemLister.ptt";
            var RELATIVE_PATH = "domains/" + TEMPLATE_PATH;

            return {
                templateUrl: CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : TEMPLATE_PATH,
                restrict: "EA",
                scope: {
                    parentID: "@id",
                    items: "=",
                    headerItems: "=",
                    configurationOptions: "="
                },
                transclude: true,
                replace: true,
                link: function(scope, element, attrs, transclude) {

                    var controlsBlock;
                    var contentBlock;

                    function _attachControls(elem) {
                        controlsBlock.append(elem);
                    }

                    function _attachOthers(elem) {
                        elem.setAttribute("id", scope.parentID + "_transcludePoint");
                        elem.setAttribute("ng-if", "filteredItems.length");
                        contentBlock.replaceWith(elem);
                    }

                    function _attachTransclude(elem) {
                        if (angular.element(elem).hasClass("lister-controls")) {
                            _attachControls(elem);
                        } else {
                            _attachOthers(elem);
                        }
                    }

                    function _findTranscludes() {

                        // *cackles maniacally*
                        // *does a multi-transclude anyways*
                        controlsBlock = element.find("#" + scope.parentID + "_transcludedControls");
                        contentBlock = element.find("#" + scope.parentID + "_transcludePoint");
                        var transcludedBlock = element.find("div.transcluded");
                        var transcludedItems = transcludedBlock.children();
                        angular.forEach(transcludedItems, _attachTransclude);
                        transcludedBlock.remove();
                    }

                    /* There is a dumb race condition here */
                    /* So we have to delay to get the content transcluded */
                    setTimeout(_findTranscludes, 2);
                },
                controller: ["$rootScope", "$route", "$routeParams", "$location", "$scope", "$filter", "$anchorScroll", "ITEM_LISTER_CONSTANTS", function itemListerController($rootScope, $route, $routeParams, $location, $scope, $filter, $anchorScroll, ITEM_LISTER_CONSTANTS) {

                    $scope.viewCallbacks = [];

                    var filters = {
                        filter: $filter("filter"),
                        orderBy: $filter("orderBy"),
                        startFrom: $filter("startFrom"),
                        limitTo: $filter("limitTo")
                    };

                    function _filter(filteredItems) {

                        // filter list based on search text
                        if ($scope.filterValue !== "") {
                            return filters.filter(filteredItems, $scope.filterValue, false);
                        }

                        return filteredItems;
                    }

                    function _sort(filteredItems) {

                        // sort the filtered list
                        if ($scope.sort.sortDirection !== "" && $scope.sort.sortBy !== "") {
                            return filters.orderBy(filteredItems, $scope.sort.sortBy, $scope.sort.sortDirection !== "asc");
                        }

                        return filteredItems;
                    }

                    function _paginate(filteredItems) {

                        // filter list based on page size and pagination
                        if ($scope.totalItems > _.min($scope.pageSizes)) {
                            var start = ($scope.currentPage - 1) * $scope.pageSize;
                            var limit = $scope.pageSize;

                            filteredItems = filters.startFrom(filteredItems, start);
                            filteredItems = filters.limitTo(filteredItems, limit);
                            $scope.showPager = true;

                            // table statistics
                            $scope.start = start + 1;
                            $scope.limit = start + filteredItems.length;

                        } else {

                            // hide pager and pagination
                            $scope.showPager = false;

                            if (filteredItems.length === 0) {
                                $scope.start = 0;
                            } else {

                                // table statistics
                                $scope.start = 1;
                            }

                            $scope.limit = filteredItems.length;
                        }

                        return filteredItems;
                    }

                    function _updatedListerState(lastInteractedItem) {

                        if ($scope.loadingInitialState) {
                            return;
                        }

                        var storedSettings = {
                            totalItems: $scope.totalItems,
                            currentPage: $scope.currentPage,
                            pageSize: $scope.pageSize,
                            start: $scope.start,
                            limit: $scope.limit,
                            lastInteractedItem: lastInteractedItem,
                            filterValue: $scope.filterValue,
                            sort: {
                                sortDirection: $scope.sort.sortDirection,
                                sortBy: $scope.sort.sortBy
                            }
                        };

                        $CSSS.set(COMPONENT_NAME, storedSettings);
                    }

                    function _itemInteracted(event, parameters) {
                        if (parameters.interactionID) {
                            _updatedListerState(parameters.interactionID);
                        }
                    }

                    /**
                     * Register a callback to call on the update of the lister
                     *
                     * @method registerViewCallback
                     *
                     * @param  {Function} callback function to callback to
                     *
                     */

                    this.registerViewCallback = function registerViewCallback(callback) {
                        $scope.viewCallbacks.push(callback);
                        callback($scope.filteredItems);
                    };

                    /**
                     * Get the header items
                     *
                     * @method getHeaderItems
                     *
                     * @return {Array} returns array of objects containing labels
                     *
                     */
                    this.getHeaderItems = function getHeaderItems() {
                        return $scope.headerItems;
                    };

                    /**
                     * Deregister a callback (useful for view changes)
                     *
                     * @method deregisterViewCallback
                     *
                     * @param  {Function} callback callback to deregister
                     *
                     */

                    this.deregisterViewCallback = function deregisterViewCallback(callback) {
                        for (var i = $scope.viewCallbacks.length - 1; i >= 0; i--) {
                            if ($scope.viewCallbacks[i] === callback) {
                                $scope.viewCallbacks.splice(i, 1);
                            }
                        }
                    };

                    /**
                     * Function called to rebuild the view from internal components
                     *
                     * @method fetch
                     *
                     */

                    $scope.fetch = function fetch() {

                        var filteredItems = [];

                        filteredItems = _filter($scope.items);

                        // update the total items after search
                        $scope.totalItems = filteredItems.length;

                        filteredItems = _sort(filteredItems);
                        filteredItems = _paginate(filteredItems);

                        $scope.filteredItems = filteredItems;

                        _updatedListerState();

                        angular.forEach($scope.viewCallbacks, function updateCallback(viewCallback) {
                            viewCallback($scope.filteredItems);
                        });

                        $scope.$emit(ITEM_LISTER_CONSTANTS.ITEM_LISTER_UPDATED_EVENT, { meta: { filterValue: $scope.filterValue } });

                        return filteredItems;

                    };

                    /**
                     * Return the focus of the page to the search at the top and scroll to it
                     *
                     * @method focusSearch
                     *
                     */

                    $scope.focusSearch = function focusSearch() {
                        angular.element(document).find("#" + $scope.parentID + "_search_input").focus();
                        $window.scrollTop = 0;
                    };

                    $scope.configurationClicked = function(configEvent) {
                        $scope.$emit(configEvent);
                    };

                    $scope.$on(ITEM_LISTER_CONSTANTS.TABLE_ITEM_BUTTON_EVENT, _itemInteracted);

                    angular.extend($scope, {
                        maxPages: 5,
                        totalItems: $scope.items.length,
                        filteredItems: [],
                        currentPage: 1,
                        pageSize: 20,
                        pageSizes: [20, 50, 100, 500],

                        start: 0,
                        limit: 20,

                        filterValue: "",
                        sort: {
                            sortDirection: "asc",
                            sortBy: $scope.headerItems.length ? $scope.headerItems[0].field : ""
                        }
                    }, {
                        filterValue: $routeParams["q"]
                    });

                    function _savedStateLoaded(initialState) {
                        angular.extend($scope, initialState, {
                            filterValue: $routeParams["q"]
                        });
                    }

                    var registerSuccess = $CSSS.register(COMPONENT_NAME);
                    if ( registerSuccess ) {
                        $scope.loadingInitialState = true;
                        registerSuccess.then(_savedStateLoaded, $log.error).finally(function() {
                            $scope.loadingInitialState = false;
                            $scope.fetch();
                        });
                    }

                    this.showConfigColumn = $scope.showConfigColumn = $scope.configurationOptions && $scope.configurationOptions.length;

                    $scope.$on("$destroy", function() {
                        $CSSS.unregister(COMPONENT_NAME);
                    });

                    $scope.fetch();
                    $scope.$watch("items", $scope.fetch);

                }]
            };

        }]);
    }
);

/*
# domains/directives/docrootDirective.js.                              Copyright(c) 2018 cPanel, Inc.
#                                                                                All rights Reserved.
# copyright@cpanel.net                                                           http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

/** @namespace cpanel.domains.directive.docroot */

define(
    'app/directives/docrootDirective',[
        "angular",
        "lodash",
        "cjt/core",
    ],
    function(angular, _, CJT) {

        "use strict";

        var module = angular.module("cpanel.domains.docroot.directive", []);
        module.value("PAGE", PAGE);


        module.directive("docroot", function itemListerItem() {

            /**
             * Generates a docroot link automatically shortening the home dir to
             * to an icon and addint title text
             *
             * @module docroot
             * @restrict E
             *
             * @param  {String} docroot full path of the docroot
             * @param  {String} homedir path of the homedir (will be first part of docroot)
             *
             * @example
             * <docroot homedir="/home/baldr" docroot="/home/baldr/a/docroot" />
             *
             */

            var TEMPLATE_PATH = "directives/docrootDirective.ptt";
            var RELATIVE_PATH = "domains/" + TEMPLATE_PATH;

            return {
                templateUrl: CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : TEMPLATE_PATH,

                restrict: "E",
                scope: {
                    parentID: "@id",
                    rawDocroot: "@docroot",
                    homedir: "@"
                },
                controller: ["$scope", "PAGE", function($scope, PAGE) {

                    /**
                     * Converts a full document root into a shortened one and updates $scope.docroot
                     *
                     * @method updateDocroot
                     *
                     * @param  {String} newFullDocroot full document root, including the homedir to parse
                     *
                     * @return {String} returns the parsed document root
                     *
                     */
                    function updateDocroot(newFullDocroot) {
                        $scope.fullDocroot = encodeURIComponent(newFullDocroot);
                        var regexp = new RegExp("^" + _.escapeRegExp($scope.homedir) + "/?");
                        $scope.docroot = newFullDocroot.replace(regexp, "");
                        $scope.docroot = $scope.docroot === "/" ? "" : $scope.docroot;
                        return $scope.docroot;
                    }

                    // Filemananger only works in cPanel
                    var appIscPanel = PAGE.APP_NAME === "cpanel";

                    // Expects PAGE.fileManagerAppObj to be an object with at least a url and possibly a target
                    $scope.fileManager = false;
                    if (appIscPanel && PAGE.fileManagerAppObj) {
                        $scope.fileManager = {
                            url: PAGE.fileManagerAppObj.url,
                            target: PAGE.fileManagerAppObj.target || "_blank"
                        };
                    }

                    $scope.$watch("rawDocroot", updateDocroot);
                    updateDocroot($scope.rawDocroot);

                }]

            };

        });
    }
);

/*
# domains/directives/domainListerViewDirective.js                     Copyright(c) 2018 cPanel, Inc.
#                                                                                All rights Reserved.
# copyright@cpanel.net                                                           http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

/** @namespace cpanel.domains.directives.domainListerView */

define(
    'app/directives/domainListerViewDirective',[
        "angular",
        "cjt/core",
        "app/directives/docrootDirective"
    ],
    function(angular, CJT) {

        "use strict";

        var module = angular.module("cpanel.domains.domainListerView.directive", [ "cpanel.domains.docroot.directive" ]);

        module.value("PAGE", PAGE);

        module.directive("domainListerView", function itemListerItem() {

            /**
             * Domain Lister View is a view that pairs with the item lister to
             * display domains and docroots as well as a manage link. It must
             * be nested within an item lister
             *
             * @module domain-lister-view
             * @restrict EA
             *
             * @example
             * <item-lister>
             *     <domain-lister-view></domain-lister-view>
             * </item-lister>
             *
             */

            var TEMPLATE_PATH = "directives/domainListerViewDirective.ptt";
            var RELATIVE_PATH = "domains/" + TEMPLATE_PATH;

            return {
                templateUrl: CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : TEMPLATE_PATH,

                restrict: "EA",
                replace: true,
                require: "^itemLister",
                link: function($scope, $element, $attrs, $ctrl) {
                    $scope.domains = [];
                    $scope.showConfigColumn = $ctrl.showConfigColumn;
                    $scope.headerItems = $ctrl.getHeaderItems();
                    $scope.updateView = function updateView(viewData) {
                        $scope.domains = viewData;
                    };
                    $ctrl.registerViewCallback($scope.updateView.bind($scope));

                    $scope.$on("$destroy", function() {
                        $ctrl.deregisterViewCallback($scope.updateView);
                    });
                },
                controller: ["$scope", "ITEM_LISTER_CONSTANTS", "DOMAIN_TYPE_CONSTANTS", "PAGE", function($scope, ITEM_LISTER_CONSTANTS, DOMAIN_TYPE_CONSTANTS, PAGE) {

                    $scope.DOMAIN_TYPE_CONSTANTS = DOMAIN_TYPE_CONSTANTS;
                    $scope.EMAIL_ACCOUNTS_APP_EXISTS = PAGE.EMAIL_ACCOUNTS_APP_EXISTS;
                    $scope.webserverRoleAvailable = PAGE.hasWebServerRole;

                    $scope.getDomains = function getDomains() {
                        return $scope.domains;
                    };

                    /**
                     * dispatches a TABLE_ITEM_BUTTON_EVENT event
                     *
                     * @method actionButtonClicked
                     *
                     * @param  {String} type type of action taken
                     * @param  {String} domain the domain on which the action occurred
                     *
                     * @return {Boolean} returns the result of the $scope.$emit function
                     *
                     */
                    $scope.actionButtonClicked = function actionButtonClicked(type, domain) {
                        $scope.$emit(ITEM_LISTER_CONSTANTS.TABLE_ITEM_BUTTON_EVENT, { actionType: type, item: domain, interactionID: domain.domain });
                    };

                }]

            };

        });
    }
);

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
    'app/validators/subdomain',[
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
    'app/validators/domainIsUnique',[
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

(function(root) {
define("jquery-chosen", ["jquery"], function() {
  return (function() {
/*!
Chosen, a Select Box Enhancer for jQuery and Prototype
by Patrick Filler for Harvest, http://getharvest.com

Version 1.5.1
Full source at https://github.com/harvesthq/chosen
Copyright (c) 2011-2016 Harvest http://getharvest.com

MIT License, https://github.com/harvesthq/chosen/blob/master/LICENSE.md
This file is generated by `grunt build`, do not edit it by hand.
*/

(function() {
  var $, AbstractChosen, Chosen, SelectParser, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  SelectParser = (function() {
    function SelectParser() {
      this.options_index = 0;
      this.parsed = [];
    }

    SelectParser.prototype.add_node = function(child) {
      if (child.nodeName.toUpperCase() === "OPTGROUP") {
        return this.add_group(child);
      } else {
        return this.add_option(child);
      }
    };

    SelectParser.prototype.add_group = function(group) {
      var group_position, option, _i, _len, _ref, _results;
      group_position = this.parsed.length;
      this.parsed.push({
        array_index: group_position,
        group: true,
        label: this.escapeExpression(group.label),
        title: group.title ? group.title : void 0,
        children: 0,
        disabled: group.disabled,
        classes: group.className
      });
      _ref = group.childNodes;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        option = _ref[_i];
        _results.push(this.add_option(option, group_position, group.disabled));
      }
      return _results;
    };

    SelectParser.prototype.add_option = function(option, group_position, group_disabled) {
      if (option.nodeName.toUpperCase() === "OPTION") {
        if (option.text !== "") {
          if (group_position != null) {
            this.parsed[group_position].children += 1;
          }
          this.parsed.push({
            array_index: this.parsed.length,
            options_index: this.options_index,
            value: option.value,
            text: option.text,
            html: option.innerHTML,
            title: option.title ? option.title : void 0,
            selected: option.selected,
            disabled: group_disabled === true ? group_disabled : option.disabled,
            group_array_index: group_position,
            group_label: group_position != null ? this.parsed[group_position].label : null,
            classes: option.className,
            style: option.style.cssText
          });
        } else {
          this.parsed.push({
            array_index: this.parsed.length,
            options_index: this.options_index,
            empty: true
          });
        }
        return this.options_index += 1;
      }
    };

    SelectParser.prototype.escapeExpression = function(text) {
      var map, unsafe_chars;
      if ((text == null) || text === false) {
        return "";
      }
      if (!/[\&\<\>\"\'\`]/.test(text)) {
        return text;
      }
      map = {
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "`": "&#x60;"
      };
      unsafe_chars = /&(?!\w+;)|[\<\>\"\'\`]/g;
      return text.replace(unsafe_chars, function(chr) {
        return map[chr] || "&amp;";
      });
    };

    return SelectParser;

  })();

  SelectParser.select_to_array = function(select) {
    var child, parser, _i, _len, _ref;
    parser = new SelectParser();
    _ref = select.childNodes;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      child = _ref[_i];
      parser.add_node(child);
    }
    return parser.parsed;
  };

  AbstractChosen = (function() {
    function AbstractChosen(form_field, options) {
      this.form_field = form_field;
      this.options = options != null ? options : {};
      if (!AbstractChosen.browser_is_supported()) {
        return;
      }
      this.is_multiple = this.form_field.multiple;
      this.set_default_text();
      this.set_default_values();
      this.setup();
      this.set_up_html();
      this.register_observers();
      this.on_ready();
    }

    AbstractChosen.prototype.set_default_values = function() {
      var _this = this;
      this.click_test_action = function(evt) {
        return _this.test_active_click(evt);
      };
      this.activate_action = function(evt) {
        return _this.activate_field(evt);
      };
      this.active_field = false;
      this.mouse_on_container = false;
      this.results_showing = false;
      this.result_highlighted = null;
      this.allow_single_deselect = (this.options.allow_single_deselect != null) && (this.form_field.options[0] != null) && this.form_field.options[0].text === "" ? this.options.allow_single_deselect : false;
      this.disable_search_threshold = this.options.disable_search_threshold || 0;
      this.disable_search = this.options.disable_search || false;
      this.enable_split_word_search = this.options.enable_split_word_search != null ? this.options.enable_split_word_search : true;
      this.group_search = this.options.group_search != null ? this.options.group_search : true;
      this.search_contains = this.options.search_contains || false;
      this.single_backstroke_delete = this.options.single_backstroke_delete != null ? this.options.single_backstroke_delete : true;
      this.max_selected_options = this.options.max_selected_options || Infinity;
      this.inherit_select_classes = this.options.inherit_select_classes || false;
      this.display_selected_options = this.options.display_selected_options != null ? this.options.display_selected_options : true;
      this.display_disabled_options = this.options.display_disabled_options != null ? this.options.display_disabled_options : true;
      this.include_group_label_in_selected = this.options.include_group_label_in_selected || false;
      return this.max_shown_results = this.options.max_shown_results || Number.POSITIVE_INFINITY;
    };

    AbstractChosen.prototype.set_default_text = function() {
      if (this.form_field.getAttribute("data-placeholder")) {
        this.default_text = this.form_field.getAttribute("data-placeholder");
      } else if (this.is_multiple) {
        this.default_text = this.options.placeholder_text_multiple || this.options.placeholder_text || AbstractChosen.default_multiple_text;
      } else {
        this.default_text = this.options.placeholder_text_single || this.options.placeholder_text || AbstractChosen.default_single_text;
      }
      return this.results_none_found = this.form_field.getAttribute("data-no_results_text") || this.options.no_results_text || AbstractChosen.default_no_result_text;
    };

    AbstractChosen.prototype.choice_label = function(item) {
      if (this.include_group_label_in_selected && (item.group_label != null)) {
        return "<b class='group-name'>" + item.group_label + "</b>" + item.html;
      } else {
        return item.html;
      }
    };

    AbstractChosen.prototype.mouse_enter = function() {
      return this.mouse_on_container = true;
    };

    AbstractChosen.prototype.mouse_leave = function() {
      return this.mouse_on_container = false;
    };

    AbstractChosen.prototype.input_focus = function(evt) {
      var _this = this;
      if (this.is_multiple) {
        if (!this.active_field) {
          return setTimeout((function() {
            return _this.container_mousedown();
          }), 50);
        }
      } else {
        if (!this.active_field) {
          return this.activate_field();
        }
      }
    };

    AbstractChosen.prototype.input_blur = function(evt) {
      var _this = this;
      if (!this.mouse_on_container) {
        this.active_field = false;
        return setTimeout((function() {
          return _this.blur_test();
        }), 100);
      }
    };

    AbstractChosen.prototype.results_option_build = function(options) {
      var content, data, data_content, shown_results, _i, _len, _ref;
      content = '';
      shown_results = 0;
      _ref = this.results_data;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        data = _ref[_i];
        data_content = '';
        if (data.group) {
          data_content = this.result_add_group(data);
        } else {
          data_content = this.result_add_option(data);
        }
        if (data_content !== '') {
          shown_results++;
          content += data_content;
        }
        if (options != null ? options.first : void 0) {
          if (data.selected && this.is_multiple) {
            this.choice_build(data);
          } else if (data.selected && !this.is_multiple) {
            this.single_set_selected_text(this.choice_label(data));
          }
        }
        if (shown_results >= this.max_shown_results) {
          break;
        }
      }
      return content;
    };

    AbstractChosen.prototype.result_add_option = function(option) {
      var classes, option_el;
      if (!option.search_match) {
        return '';
      }
      if (!this.include_option_in_results(option)) {
        return '';
      }
      classes = [];
      if (!option.disabled && !(option.selected && this.is_multiple)) {
        classes.push("active-result");
      }
      if (option.disabled && !(option.selected && this.is_multiple)) {
        classes.push("disabled-result");
      }
      if (option.selected) {
        classes.push("result-selected");
      }
      if (option.group_array_index != null) {
        classes.push("group-option");
      }
      if (option.classes !== "") {
        classes.push(option.classes);
      }
      option_el = document.createElement("li");
      option_el.className = classes.join(" ");
      option_el.style.cssText = option.style;
      option_el.setAttribute("data-option-array-index", option.array_index);
      option_el.innerHTML = option.search_text;
      if (option.title) {
        option_el.title = option.title;
      }
      return this.outerHTML(option_el);
    };

    AbstractChosen.prototype.result_add_group = function(group) {
      var classes, group_el;
      if (!(group.search_match || group.group_match)) {
        return '';
      }
      if (!(group.active_options > 0)) {
        return '';
      }
      classes = [];
      classes.push("group-result");
      if (group.classes) {
        classes.push(group.classes);
      }
      group_el = document.createElement("li");
      group_el.className = classes.join(" ");
      group_el.innerHTML = group.search_text;
      if (group.title) {
        group_el.title = group.title;
      }
      return this.outerHTML(group_el);
    };

    AbstractChosen.prototype.results_update_field = function() {
      this.set_default_text();
      if (!this.is_multiple) {
        this.results_reset_cleanup();
      }
      this.result_clear_highlight();
      this.results_build();
      if (this.results_showing) {
        return this.winnow_results();
      }
    };

    AbstractChosen.prototype.reset_single_select_options = function() {
      var result, _i, _len, _ref, _results;
      _ref = this.results_data;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        result = _ref[_i];
        if (result.selected) {
          _results.push(result.selected = false);
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    AbstractChosen.prototype.results_toggle = function() {
      if (this.results_showing) {
        return this.results_hide();
      } else {
        return this.results_show();
      }
    };

    AbstractChosen.prototype.results_search = function(evt) {
      if (this.results_showing) {
        return this.winnow_results();
      } else {
        return this.results_show();
      }
    };

    AbstractChosen.prototype.winnow_results = function() {
      var escapedSearchText, option, regex, results, results_group, searchText, startpos, text, zregex, _i, _len, _ref;
      this.no_results_clear();
      results = 0;
      searchText = this.get_search_text();
      escapedSearchText = searchText.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      zregex = new RegExp(escapedSearchText, 'i');
      regex = this.get_search_regex(escapedSearchText);
      _ref = this.results_data;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        option = _ref[_i];
        option.search_match = false;
        results_group = null;
        if (this.include_option_in_results(option)) {
          if (option.group) {
            option.group_match = false;
            option.active_options = 0;
          }
          if ((option.group_array_index != null) && this.results_data[option.group_array_index]) {
            results_group = this.results_data[option.group_array_index];
            if (results_group.active_options === 0 && results_group.search_match) {
              results += 1;
            }
            results_group.active_options += 1;
          }
          option.search_text = option.group ? option.label : option.html;
          if (!(option.group && !this.group_search)) {
            option.search_match = this.search_string_match(option.search_text, regex);
            if (option.search_match && !option.group) {
              results += 1;
            }
            if (option.search_match) {
              if (searchText.length) {
                startpos = option.search_text.search(zregex);
                text = option.search_text.substr(0, startpos + searchText.length) + '</em>' + option.search_text.substr(startpos + searchText.length);
                option.search_text = text.substr(0, startpos) + '<em>' + text.substr(startpos);
              }
              if (results_group != null) {
                results_group.group_match = true;
              }
            } else if ((option.group_array_index != null) && this.results_data[option.group_array_index].search_match) {
              option.search_match = true;
            }
          }
        }
      }
      this.result_clear_highlight();
      if (results < 1 && searchText.length) {
        this.update_results_content("");
        return this.no_results(searchText);
      } else {
        this.update_results_content(this.results_option_build());
        return this.winnow_results_set_highlight();
      }
    };

    AbstractChosen.prototype.get_search_regex = function(escaped_search_string) {
      var regex_anchor;
      regex_anchor = this.search_contains ? "" : "^";
      return new RegExp(regex_anchor + escaped_search_string, 'i');
    };

    AbstractChosen.prototype.search_string_match = function(search_string, regex) {
      var part, parts, _i, _len;
      if (regex.test(search_string)) {
        return true;
      } else if (this.enable_split_word_search && (search_string.indexOf(" ") >= 0 || search_string.indexOf("[") === 0)) {
        parts = search_string.replace(/\[|\]/g, "").split(" ");
        if (parts.length) {
          for (_i = 0, _len = parts.length; _i < _len; _i++) {
            part = parts[_i];
            if (regex.test(part)) {
              return true;
            }
          }
        }
      }
    };

    AbstractChosen.prototype.choices_count = function() {
      var option, _i, _len, _ref;
      if (this.selected_option_count != null) {
        return this.selected_option_count;
      }
      this.selected_option_count = 0;
      _ref = this.form_field.options;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        option = _ref[_i];
        if (option.selected) {
          this.selected_option_count += 1;
        }
      }
      return this.selected_option_count;
    };

    AbstractChosen.prototype.choices_click = function(evt) {
      evt.preventDefault();
      if (!(this.results_showing || this.is_disabled)) {
        return this.results_show();
      }
    };

    AbstractChosen.prototype.keyup_checker = function(evt) {
      var stroke, _ref;
      stroke = (_ref = evt.which) != null ? _ref : evt.keyCode;
      this.search_field_scale();
      switch (stroke) {
        case 8:
          if (this.is_multiple && this.backstroke_length < 1 && this.choices_count() > 0) {
            return this.keydown_backstroke();
          } else if (!this.pending_backstroke) {
            this.result_clear_highlight();
            return this.results_search();
          }
          break;
        case 13:
          evt.preventDefault();
          if (this.results_showing) {
            return this.result_select(evt);
          }
          break;
        case 27:
          if (this.results_showing) {
            this.results_hide();
          }
          return true;
        case 9:
        case 38:
        case 40:
        case 16:
        case 91:
        case 17:
        case 18:
          break;
        default:
          return this.results_search();
      }
    };

    AbstractChosen.prototype.clipboard_event_checker = function(evt) {
      var _this = this;
      return setTimeout((function() {
        return _this.results_search();
      }), 50);
    };

    AbstractChosen.prototype.container_width = function() {
      if (this.options.width != null) {
        return this.options.width;
      } else {
        return "" + this.form_field.offsetWidth + "px";
      }
    };

    AbstractChosen.prototype.include_option_in_results = function(option) {
      if (this.is_multiple && (!this.display_selected_options && option.selected)) {
        return false;
      }
      if (!this.display_disabled_options && option.disabled) {
        return false;
      }
      if (option.empty) {
        return false;
      }
      return true;
    };

    AbstractChosen.prototype.search_results_touchstart = function(evt) {
      this.touch_started = true;
      return this.search_results_mouseover(evt);
    };

    AbstractChosen.prototype.search_results_touchmove = function(evt) {
      this.touch_started = false;
      return this.search_results_mouseout(evt);
    };

    AbstractChosen.prototype.search_results_touchend = function(evt) {
      if (this.touch_started) {
        return this.search_results_mouseup(evt);
      }
    };

    AbstractChosen.prototype.outerHTML = function(element) {
      var tmp;
      if (element.outerHTML) {
        return element.outerHTML;
      }
      tmp = document.createElement("div");
      tmp.appendChild(element);
      return tmp.innerHTML;
    };

    AbstractChosen.browser_is_supported = function() {
      if (/iP(od|hone)/i.test(window.navigator.userAgent)) {
        return false;
      }
      if (/Android/i.test(window.navigator.userAgent)) {
        if (/Mobile/i.test(window.navigator.userAgent)) {
          return false;
        }
      }
      if (/IEMobile/i.test(window.navigator.userAgent)) {
        return false;
      }
      if (/Windows Phone/i.test(window.navigator.userAgent)) {
        return false;
      }
      if (/BlackBerry/i.test(window.navigator.userAgent)) {
        return false;
      }
      if (/BB10/i.test(window.navigator.userAgent)) {
        return false;
      }
      if (window.navigator.appName === "Microsoft Internet Explorer") {
        return document.documentMode >= 8;
      }
      return true;
    };

    AbstractChosen.default_multiple_text = "Select Some Options";

    AbstractChosen.default_single_text = "Select an Option";

    AbstractChosen.default_no_result_text = "No results match";

    return AbstractChosen;

  })();

  $ = jQuery;

  $.fn.extend({
    chosen: function(options) {
      if (!AbstractChosen.browser_is_supported()) {
        return this;
      }
      return this.each(function(input_field) {
        var $this, chosen;
        $this = $(this);
        chosen = $this.data('chosen');
        if (options === 'destroy') {
          if (chosen instanceof Chosen) {
            chosen.destroy();
          }
          return;
        }
        if (!(chosen instanceof Chosen)) {
          $this.data('chosen', new Chosen(this, options));
        }
      });
    }
  });

  Chosen = (function(_super) {
    __extends(Chosen, _super);

    function Chosen() {
      _ref = Chosen.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    Chosen.prototype.setup = function() {
      this.form_field_jq = $(this.form_field);
      this.current_selectedIndex = this.form_field.selectedIndex;
      return this.is_rtl = this.form_field_jq.hasClass("chosen-rtl");
    };

    Chosen.prototype.set_up_html = function() {
      var container_classes, container_props;
      container_classes = ["chosen-container"];
      container_classes.push("chosen-container-" + (this.is_multiple ? "multi" : "single"));
      if (this.inherit_select_classes && this.form_field.className) {
        container_classes.push(this.form_field.className);
      }
      if (this.is_rtl) {
        container_classes.push("chosen-rtl");
      }
      container_props = {
        'class': container_classes.join(' '),
        'style': "width: " + (this.container_width()) + ";",
        'title': this.form_field.title
      };
      if (this.form_field.id.length) {
        container_props.id = this.form_field.id.replace(/[^\w]/g, '_') + "_chosen";
      }
      this.container = $("<div />", container_props);
      if (this.is_multiple) {
        this.container.html('<ul class="chosen-choices"><li class="search-field"><input type="text" value="' + this.default_text + '" class="default" autocomplete="off" style="width:25px;" /></li></ul><div class="chosen-drop"><ul class="chosen-results"></ul></div>');
      } else {
        this.container.html('<a class="chosen-single chosen-default"><span>' + this.default_text + '</span><div><b></b></div></a><div class="chosen-drop"><div class="chosen-search"><input type="text" autocomplete="off" /></div><ul class="chosen-results"></ul></div>');
      }
      this.form_field_jq.hide().after(this.container);
      this.dropdown = this.container.find('div.chosen-drop').first();
      this.search_field = this.container.find('input').first();
      this.search_results = this.container.find('ul.chosen-results').first();
      this.search_field_scale();
      this.search_no_results = this.container.find('li.no-results').first();
      if (this.is_multiple) {
        this.search_choices = this.container.find('ul.chosen-choices').first();
        this.search_container = this.container.find('li.search-field').first();
      } else {
        this.search_container = this.container.find('div.chosen-search').first();
        this.selected_item = this.container.find('.chosen-single').first();
      }
      this.results_build();
      this.set_tab_index();
      return this.set_label_behavior();
    };

    Chosen.prototype.on_ready = function() {
      return this.form_field_jq.trigger("chosen:ready", {
        chosen: this
      });
    };

    Chosen.prototype.register_observers = function() {
      var _this = this;
      this.container.bind('touchstart.chosen', function(evt) {
        _this.container_mousedown(evt);
        return evt.preventDefault();
      });
      this.container.bind('touchend.chosen', function(evt) {
        _this.container_mouseup(evt);
        return evt.preventDefault();
      });
      this.container.bind('mousedown.chosen', function(evt) {
        _this.container_mousedown(evt);
      });
      this.container.bind('mouseup.chosen', function(evt) {
        _this.container_mouseup(evt);
      });
      this.container.bind('mouseenter.chosen', function(evt) {
        _this.mouse_enter(evt);
      });
      this.container.bind('mouseleave.chosen', function(evt) {
        _this.mouse_leave(evt);
      });
      this.search_results.bind('mouseup.chosen', function(evt) {
        _this.search_results_mouseup(evt);
      });
      this.search_results.bind('mouseover.chosen', function(evt) {
        _this.search_results_mouseover(evt);
      });
      this.search_results.bind('mouseout.chosen', function(evt) {
        _this.search_results_mouseout(evt);
      });
      this.search_results.bind('mousewheel.chosen DOMMouseScroll.chosen', function(evt) {
        _this.search_results_mousewheel(evt);
      });
      this.search_results.bind('touchstart.chosen', function(evt) {
        _this.search_results_touchstart(evt);
      });
      this.search_results.bind('touchmove.chosen', function(evt) {
        _this.search_results_touchmove(evt);
      });
      this.search_results.bind('touchend.chosen', function(evt) {
        _this.search_results_touchend(evt);
      });
      this.form_field_jq.bind("chosen:updated.chosen", function(evt) {
        _this.results_update_field(evt);
      });
      this.form_field_jq.bind("chosen:activate.chosen", function(evt) {
        _this.activate_field(evt);
      });
      this.form_field_jq.bind("chosen:open.chosen", function(evt) {
        _this.container_mousedown(evt);
      });
      this.form_field_jq.bind("chosen:close.chosen", function(evt) {
        _this.input_blur(evt);
      });
      this.search_field.bind('blur.chosen', function(evt) {
        _this.input_blur(evt);
      });
      this.search_field.bind('keyup.chosen', function(evt) {
        _this.keyup_checker(evt);
      });
      this.search_field.bind('keydown.chosen', function(evt) {
        _this.keydown_checker(evt);
      });
      this.search_field.bind('focus.chosen', function(evt) {
        _this.input_focus(evt);
      });
      this.search_field.bind('cut.chosen', function(evt) {
        _this.clipboard_event_checker(evt);
      });
      this.search_field.bind('paste.chosen', function(evt) {
        _this.clipboard_event_checker(evt);
      });
      if (this.is_multiple) {
        return this.search_choices.bind('click.chosen', function(evt) {
          _this.choices_click(evt);
        });
      } else {
        return this.container.bind('click.chosen', function(evt) {
          evt.preventDefault();
        });
      }
    };

    Chosen.prototype.destroy = function() {
      $(this.container[0].ownerDocument).unbind("click.chosen", this.click_test_action);
      if (this.search_field[0].tabIndex) {
        this.form_field_jq[0].tabIndex = this.search_field[0].tabIndex;
      }
      this.container.remove();
      this.form_field_jq.removeData('chosen');
      return this.form_field_jq.show();
    };

    Chosen.prototype.search_field_disabled = function() {
      this.is_disabled = this.form_field_jq[0].disabled;
      if (this.is_disabled) {
        this.container.addClass('chosen-disabled');
        this.search_field[0].disabled = true;
        if (!this.is_multiple) {
          this.selected_item.unbind("focus.chosen", this.activate_action);
        }
        return this.close_field();
      } else {
        this.container.removeClass('chosen-disabled');
        this.search_field[0].disabled = false;
        if (!this.is_multiple) {
          return this.selected_item.bind("focus.chosen", this.activate_action);
        }
      }
    };

    Chosen.prototype.container_mousedown = function(evt) {
      if (!this.is_disabled) {
        if (evt && evt.type === "mousedown" && !this.results_showing) {
          evt.preventDefault();
        }
        if (!((evt != null) && ($(evt.target)).hasClass("search-choice-close"))) {
          if (!this.active_field) {
            if (this.is_multiple) {
              this.search_field.val("");
            }
            $(this.container[0].ownerDocument).bind('click.chosen', this.click_test_action);
            this.results_show();
          } else if (!this.is_multiple && evt && (($(evt.target)[0] === this.selected_item[0]) || $(evt.target).parents("a.chosen-single").length)) {
            evt.preventDefault();
            this.results_toggle();
          }
          return this.activate_field();
        }
      }
    };

    Chosen.prototype.container_mouseup = function(evt) {
      if (evt.target.nodeName === "ABBR" && !this.is_disabled) {
        return this.results_reset(evt);
      }
    };

    Chosen.prototype.search_results_mousewheel = function(evt) {
      var delta;
      if (evt.originalEvent) {
        delta = evt.originalEvent.deltaY || -evt.originalEvent.wheelDelta || evt.originalEvent.detail;
      }
      if (delta != null) {
        evt.preventDefault();
        if (evt.type === 'DOMMouseScroll') {
          delta = delta * 40;
        }
        return this.search_results.scrollTop(delta + this.search_results.scrollTop());
      }
    };

    Chosen.prototype.blur_test = function(evt) {
      if (!this.active_field && this.container.hasClass("chosen-container-active")) {
        return this.close_field();
      }
    };

    Chosen.prototype.close_field = function() {
      $(this.container[0].ownerDocument).unbind("click.chosen", this.click_test_action);
      this.active_field = false;
      this.results_hide();
      this.container.removeClass("chosen-container-active");
      this.clear_backstroke();
      this.show_search_field_default();
      return this.search_field_scale();
    };

    Chosen.prototype.activate_field = function() {
      this.container.addClass("chosen-container-active");
      this.active_field = true;
      this.search_field.val(this.search_field.val());
      return this.search_field.focus();
    };

    Chosen.prototype.test_active_click = function(evt) {
      var active_container;
      active_container = $(evt.target).closest('.chosen-container');
      if (active_container.length && this.container[0] === active_container[0]) {
        return this.active_field = true;
      } else {
        return this.close_field();
      }
    };

    Chosen.prototype.results_build = function() {
      this.parsing = true;
      this.selected_option_count = null;
      this.results_data = SelectParser.select_to_array(this.form_field);
      if (this.is_multiple) {
        this.search_choices.find("li.search-choice").remove();
      } else if (!this.is_multiple) {
        this.single_set_selected_text();
        if (this.disable_search || this.form_field.options.length <= this.disable_search_threshold) {
          this.search_field[0].readOnly = true;
          this.container.addClass("chosen-container-single-nosearch");
        } else {
          this.search_field[0].readOnly = false;
          this.container.removeClass("chosen-container-single-nosearch");
        }
      }
      this.update_results_content(this.results_option_build({
        first: true
      }));
      this.search_field_disabled();
      this.show_search_field_default();
      this.search_field_scale();
      return this.parsing = false;
    };

    Chosen.prototype.result_do_highlight = function(el) {
      var high_bottom, high_top, maxHeight, visible_bottom, visible_top;
      if (el.length) {
        this.result_clear_highlight();
        this.result_highlight = el;
        this.result_highlight.addClass("highlighted");
        maxHeight = parseInt(this.search_results.css("maxHeight"), 10);
        visible_top = this.search_results.scrollTop();
        visible_bottom = maxHeight + visible_top;
        high_top = this.result_highlight.position().top + this.search_results.scrollTop();
        high_bottom = high_top + this.result_highlight.outerHeight();
        if (high_bottom >= visible_bottom) {
          return this.search_results.scrollTop((high_bottom - maxHeight) > 0 ? high_bottom - maxHeight : 0);
        } else if (high_top < visible_top) {
          return this.search_results.scrollTop(high_top);
        }
      }
    };

    Chosen.prototype.result_clear_highlight = function() {
      if (this.result_highlight) {
        this.result_highlight.removeClass("highlighted");
      }
      return this.result_highlight = null;
    };

    Chosen.prototype.results_show = function() {
      if (this.is_multiple && this.max_selected_options <= this.choices_count()) {
        this.form_field_jq.trigger("chosen:maxselected", {
          chosen: this
        });
        return false;
      }
      this.container.addClass("chosen-with-drop");
      this.results_showing = true;
      this.search_field.focus();
      this.search_field.val(this.search_field.val());
      this.winnow_results();
      return this.form_field_jq.trigger("chosen:showing_dropdown", {
        chosen: this
      });
    };

    Chosen.prototype.update_results_content = function(content) {
      return this.search_results.html(content);
    };

    Chosen.prototype.results_hide = function() {
      if (this.results_showing) {
        this.result_clear_highlight();
        this.container.removeClass("chosen-with-drop");
        this.form_field_jq.trigger("chosen:hiding_dropdown", {
          chosen: this
        });
      }
      return this.results_showing = false;
    };

    Chosen.prototype.set_tab_index = function(el) {
      var ti;
      if (this.form_field.tabIndex) {
        ti = this.form_field.tabIndex;
        this.form_field.tabIndex = -1;
        return this.search_field[0].tabIndex = ti;
      }
    };

    Chosen.prototype.set_label_behavior = function() {
      var _this = this;
      this.form_field_label = this.form_field_jq.parents("label");
      if (!this.form_field_label.length && this.form_field.id.length) {
        this.form_field_label = $("label[for='" + this.form_field.id + "']");
      }
      if (this.form_field_label.length > 0) {
        return this.form_field_label.bind('click.chosen', function(evt) {
          if (_this.is_multiple) {
            return _this.container_mousedown(evt);
          } else {
            return _this.activate_field();
          }
        });
      }
    };

    Chosen.prototype.show_search_field_default = function() {
      if (this.is_multiple && this.choices_count() < 1 && !this.active_field) {
        this.search_field.val(this.default_text);
        return this.search_field.addClass("default");
      } else {
        this.search_field.val("");
        return this.search_field.removeClass("default");
      }
    };

    Chosen.prototype.search_results_mouseup = function(evt) {
      var target;
      target = $(evt.target).hasClass("active-result") ? $(evt.target) : $(evt.target).parents(".active-result").first();
      if (target.length) {
        this.result_highlight = target;
        this.result_select(evt);
        return this.search_field.focus();
      }
    };

    Chosen.prototype.search_results_mouseover = function(evt) {
      var target;
      target = $(evt.target).hasClass("active-result") ? $(evt.target) : $(evt.target).parents(".active-result").first();
      if (target) {
        return this.result_do_highlight(target);
      }
    };

    Chosen.prototype.search_results_mouseout = function(evt) {
      if ($(evt.target).hasClass("active-result" || $(evt.target).parents('.active-result').first())) {
        return this.result_clear_highlight();
      }
    };

    Chosen.prototype.choice_build = function(item) {
      var choice, close_link,
        _this = this;
      choice = $('<li />', {
        "class": "search-choice"
      }).html("<span>" + (this.choice_label(item)) + "</span>");
      if (item.disabled) {
        choice.addClass('search-choice-disabled');
      } else {
        close_link = $('<a />', {
          "class": 'search-choice-close',
          'data-option-array-index': item.array_index
        });
        close_link.bind('click.chosen', function(evt) {
          return _this.choice_destroy_link_click(evt);
        });
        choice.append(close_link);
      }
      return this.search_container.before(choice);
    };

    Chosen.prototype.choice_destroy_link_click = function(evt) {
      evt.preventDefault();
      evt.stopPropagation();
      if (!this.is_disabled) {
        return this.choice_destroy($(evt.target));
      }
    };

    Chosen.prototype.choice_destroy = function(link) {
      if (this.result_deselect(link[0].getAttribute("data-option-array-index"))) {
        this.show_search_field_default();
        if (this.is_multiple && this.choices_count() > 0 && this.search_field.val().length < 1) {
          this.results_hide();
        }
        link.parents('li').first().remove();
        return this.search_field_scale();
      }
    };

    Chosen.prototype.results_reset = function() {
      this.reset_single_select_options();
      this.form_field.options[0].selected = true;
      this.single_set_selected_text();
      this.show_search_field_default();
      this.results_reset_cleanup();
      this.form_field_jq.trigger("change");
      if (this.active_field) {
        return this.results_hide();
      }
    };

    Chosen.prototype.results_reset_cleanup = function() {
      this.current_selectedIndex = this.form_field.selectedIndex;
      return this.selected_item.find("abbr").remove();
    };

    Chosen.prototype.result_select = function(evt) {
      var high, item;
      if (this.result_highlight) {
        high = this.result_highlight;
        this.result_clear_highlight();
        if (this.is_multiple && this.max_selected_options <= this.choices_count()) {
          this.form_field_jq.trigger("chosen:maxselected", {
            chosen: this
          });
          return false;
        }
        if (this.is_multiple) {
          high.removeClass("active-result");
        } else {
          this.reset_single_select_options();
        }
        high.addClass("result-selected");
        item = this.results_data[high[0].getAttribute("data-option-array-index")];
        item.selected = true;
        this.form_field.options[item.options_index].selected = true;
        this.selected_option_count = null;
        if (this.is_multiple) {
          this.choice_build(item);
        } else {
          this.single_set_selected_text(this.choice_label(item));
        }
        if (!((evt.metaKey || evt.ctrlKey) && this.is_multiple)) {
          this.results_hide();
        }
        this.show_search_field_default();
        if (this.is_multiple || this.form_field.selectedIndex !== this.current_selectedIndex) {
          this.form_field_jq.trigger("change", {
            'selected': this.form_field.options[item.options_index].value
          });
        }
        this.current_selectedIndex = this.form_field.selectedIndex;
        evt.preventDefault();
        return this.search_field_scale();
      }
    };

    Chosen.prototype.single_set_selected_text = function(text) {
      if (text == null) {
        text = this.default_text;
      }
      if (text === this.default_text) {
        this.selected_item.addClass("chosen-default");
      } else {
        this.single_deselect_control_build();
        this.selected_item.removeClass("chosen-default");
      }
      return this.selected_item.find("span").html(text);
    };

    Chosen.prototype.result_deselect = function(pos) {
      var result_data;
      result_data = this.results_data[pos];
      if (!this.form_field.options[result_data.options_index].disabled) {
        result_data.selected = false;
        this.form_field.options[result_data.options_index].selected = false;
        this.selected_option_count = null;
        this.result_clear_highlight();
        if (this.results_showing) {
          this.winnow_results();
        }
        this.form_field_jq.trigger("change", {
          deselected: this.form_field.options[result_data.options_index].value
        });
        this.search_field_scale();
        return true;
      } else {
        return false;
      }
    };

    Chosen.prototype.single_deselect_control_build = function() {
      if (!this.allow_single_deselect) {
        return;
      }
      if (!this.selected_item.find("abbr").length) {
        this.selected_item.find("span").first().after("<abbr class=\"search-choice-close\"></abbr>");
      }
      return this.selected_item.addClass("chosen-single-with-deselect");
    };

    Chosen.prototype.get_search_text = function() {
      return $('<div/>').text($.trim(this.search_field.val())).html();
    };

    Chosen.prototype.winnow_results_set_highlight = function() {
      var do_high, selected_results;
      selected_results = !this.is_multiple ? this.search_results.find(".result-selected.active-result") : [];
      do_high = selected_results.length ? selected_results.first() : this.search_results.find(".active-result").first();
      if (do_high != null) {
        return this.result_do_highlight(do_high);
      }
    };

    Chosen.prototype.no_results = function(terms) {
      var no_results_html;
      no_results_html = $('<li class="no-results">' + this.results_none_found + ' "<span></span>"</li>');
      no_results_html.find("span").first().html(terms);
      this.search_results.append(no_results_html);
      return this.form_field_jq.trigger("chosen:no_results", {
        chosen: this
      });
    };

    Chosen.prototype.no_results_clear = function() {
      return this.search_results.find(".no-results").remove();
    };

    Chosen.prototype.keydown_arrow = function() {
      var next_sib;
      if (this.results_showing && this.result_highlight) {
        next_sib = this.result_highlight.nextAll("li.active-result").first();
        if (next_sib) {
          return this.result_do_highlight(next_sib);
        }
      } else {
        return this.results_show();
      }
    };

    Chosen.prototype.keyup_arrow = function() {
      var prev_sibs;
      if (!this.results_showing && !this.is_multiple) {
        return this.results_show();
      } else if (this.result_highlight) {
        prev_sibs = this.result_highlight.prevAll("li.active-result");
        if (prev_sibs.length) {
          return this.result_do_highlight(prev_sibs.first());
        } else {
          if (this.choices_count() > 0) {
            this.results_hide();
          }
          return this.result_clear_highlight();
        }
      }
    };

    Chosen.prototype.keydown_backstroke = function() {
      var next_available_destroy;
      if (this.pending_backstroke) {
        this.choice_destroy(this.pending_backstroke.find("a").first());
        return this.clear_backstroke();
      } else {
        next_available_destroy = this.search_container.siblings("li.search-choice").last();
        if (next_available_destroy.length && !next_available_destroy.hasClass("search-choice-disabled")) {
          this.pending_backstroke = next_available_destroy;
          if (this.single_backstroke_delete) {
            return this.keydown_backstroke();
          } else {
            return this.pending_backstroke.addClass("search-choice-focus");
          }
        }
      }
    };

    Chosen.prototype.clear_backstroke = function() {
      if (this.pending_backstroke) {
        this.pending_backstroke.removeClass("search-choice-focus");
      }
      return this.pending_backstroke = null;
    };

    Chosen.prototype.keydown_checker = function(evt) {
      var stroke, _ref1;
      stroke = (_ref1 = evt.which) != null ? _ref1 : evt.keyCode;
      this.search_field_scale();
      if (stroke !== 8 && this.pending_backstroke) {
        this.clear_backstroke();
      }
      switch (stroke) {
        case 8:
          this.backstroke_length = this.search_field.val().length;
          break;
        case 9:
          if (this.results_showing && !this.is_multiple) {
            this.result_select(evt);
          }
          this.mouse_on_container = false;
          break;
        case 13:
          if (this.results_showing) {
            evt.preventDefault();
          }
          break;
        case 32:
          if (this.disable_search) {
            evt.preventDefault();
          }
          break;
        case 38:
          evt.preventDefault();
          this.keyup_arrow();
          break;
        case 40:
          evt.preventDefault();
          this.keydown_arrow();
          break;
      }
    };

    Chosen.prototype.search_field_scale = function() {
      var div, f_width, h, style, style_block, styles, w, _i, _len;
      if (this.is_multiple) {
        h = 0;
        w = 0;
        style_block = "position:absolute; left: -1000px; top: -1000px; display:none;";
        styles = ['font-size', 'font-style', 'font-weight', 'font-family', 'line-height', 'text-transform', 'letter-spacing'];
        for (_i = 0, _len = styles.length; _i < _len; _i++) {
          style = styles[_i];
          style_block += style + ":" + this.search_field.css(style) + ";";
        }
        div = $('<div />', {
          'style': style_block
        });
        div.text(this.search_field.val());
        $('body').append(div);
        w = div.width() + 25;
        div.remove();
        f_width = this.container.outerWidth();
        if (w > f_width - 10) {
          w = f_width - 10;
        }
        return this.search_field.css({
          'width': w + 'px'
        });
      }
    };

    return Chosen;

  })(AbstractChosen);

}).call(this);


  }).apply(root, arguments);
});
}(this));

(function(root) {
define("angular-chosen", ["angular","jquery-chosen"], function() {
  return (function() {
/**
 * angular-chosen-localytics - Angular Chosen directive is an AngularJS Directive that brings the Chosen jQuery in a Angular way
 * @version v1.3.0
 * @link http://github.com/leocaseiro/angular-chosen
 * @license MIT
 */
(function() {
  var indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  angular.module('localytics.directives', []);

  angular.module('localytics.directives').directive('chosen', [
    '$timeout', function($timeout) {
      var CHOSEN_OPTION_WHITELIST, NG_OPTIONS_REGEXP, isEmpty, snakeCase;
      NG_OPTIONS_REGEXP = /^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+group\s+by\s+([\s\S]+?))?\s+for\s+(?:([\$\w][\$\w]*)|(?:\(\s*([\$\w][\$\w]*)\s*,\s*([\$\w][\$\w]*)\s*\)))\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?$/;
      CHOSEN_OPTION_WHITELIST = ['persistentCreateOption', 'createOptionText', 'createOption', 'skipNoResults', 'noResultsText', 'allowSingleDeselect', 'disableSearchThreshold', 'disableSearch', 'enableSplitWordSearch', 'inheritSelectClasses', 'maxSelectedOptions', 'placeholderTextMultiple', 'placeholderTextSingle', 'searchContains', 'singleBackstrokeDelete', 'displayDisabledOptions', 'displaySelectedOptions', 'width', 'includeGroupLabelInSelected', 'maxShownResults'];
      snakeCase = function(input) {
        return input.replace(/[A-Z]/g, function($1) {
          return "_" + ($1.toLowerCase());
        });
      };
      isEmpty = function(value) {
        var key;
        if (angular.isArray(value)) {
          return value.length === 0;
        } else if (angular.isObject(value)) {
          for (key in value) {
            if (value.hasOwnProperty(key)) {
              return false;
            }
          }
        }
        return true;
      };
      return {
        restrict: 'A',
        require: '?ngModel',
        priority: 1,
        link: function(scope, element, attr, ngModel) {
          var chosen, empty, initOrUpdate, match, options, origRender, startLoading, stopLoading, updateMessage, valuesExpr, viewWatch;
          scope.disabledValuesHistory = scope.disabledValuesHistory ? scope.disabledValuesHistory : [];
          element = $(element);
          element.addClass('localytics-chosen');
          options = scope.$eval(attr.chosen) || {};
          angular.forEach(attr, function(value, key) {
            if (indexOf.call(CHOSEN_OPTION_WHITELIST, key) >= 0) {
              return attr.$observe(key, function(value) {
                options[snakeCase(key)] = String(element.attr(attr.$attr[key])).slice(0, 2) === '{{' ? value : scope.$eval(value);
                return updateMessage();
              });
            }
          });
          startLoading = function() {
            return element.addClass('loading').attr('disabled', true).trigger('chosen:updated');
          };
          stopLoading = function() {
            element.removeClass('loading');
            if (angular.isDefined(attr.disabled)) {
              element.attr('disabled', attr.disabled);
            } else {
              element.attr('disabled', false);
            }
            return element.trigger('chosen:updated');
          };
          chosen = null;
          empty = false;
          initOrUpdate = function() {
            var defaultText;
            if (chosen) {
              return element.trigger('chosen:updated');
            } else {
              $timeout(function() {
                chosen = element.chosen(options).data('chosen');
              });
              if (angular.isObject(chosen)) {
                return defaultText = chosen.default_text;
              }
            }
          };
          updateMessage = function() {
            if (empty) {
              element.attr('data-placeholder', chosen.results_none_found).attr('disabled', true);
            } else {
              element.removeAttr('data-placeholder');
            }
            return element.trigger('chosen:updated');
          };
          if (ngModel) {
            origRender = ngModel.$render;
            ngModel.$render = function() {
              origRender();
              return initOrUpdate();
            };
            element.on('chosen:hiding_dropdown', function() {
              return scope.$apply(function() {
                return ngModel.$setTouched();
              });
            });
            if (attr.multiple) {
              viewWatch = function() {
                return ngModel.$viewValue;
              };
              scope.$watch(viewWatch, ngModel.$render, true);
            }
          } else {
            initOrUpdate();
          }
          attr.$observe('disabled', function() {
            return element.trigger('chosen:updated');
          });
          if (attr.ngOptions && ngModel) {
            match = attr.ngOptions.match(NG_OPTIONS_REGEXP);
            valuesExpr = match[7];
            scope.$watchCollection(valuesExpr, function(newVal, oldVal) {
              var timer;
              return timer = $timeout(function() {
                if (angular.isUndefined(newVal)) {
                  return startLoading();
                } else {
                  empty = isEmpty(newVal);
                  stopLoading();
                  return updateMessage();
                }
              });
            });
            return scope.$on('$destroy', function(event) {
              if (typeof timer !== "undefined" && timer !== null) {
                return $timeout.cancel(timer);
              }
            });
          }
        }
      };
    }
  ]);

}).call(this);


  }).apply(root, arguments);
});
}(this));

/*
# domains/index.js                        Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/
/* global require, define, PAGE */

/** @namespace cpanel.domains */

define(
    'app/index',[
        "angular",
        "cjt/core",
        "app/views/ROUTES",
        "cjt/modules",
        "ngRoute",
        "ngAnimate",
        "cjt/services/alertService",
        "app/services/domains",
        "app/directives/itemLister",
        "app/directives/domainListerViewDirective",
        "app/validators/subdomain",
        "app/validators/domainIsUnique",
        "cjt/directives/callout",
        "cjt/directives/loadingPanel",
        "angular-chosen"
    ],
    function(angular, CJT, ROUTES) {

        "use strict";

        return function() {

            // First create the application
            angular.module("cpanel.domains", [
                "ngRoute",
                "ngAnimate",
                "cjt2.cpanel",
                "cpanel.domains.domains.service",
                "cpanel.domains.itemLister.directive",
                "cpanel.domains.domainListerView.directive",
                "cjt2.directives.loadingPanel",
                "cjt2.services.alert",
                "localytics.directives"
            ]);

            var requires = [
                "cjt/bootstrap",
                "app/views/main"
            ];

            ROUTES.forEach(function(route) {
                requires.push("app/views/" + route.controller);
            });

            // Then load the application dependencies
            var app = require(requires, function(BOOTSTRAP) {

                var app = angular.module("cpanel.domains");
                app.value("PAGE", PAGE);

                app.value("ITEM_LISTER_CONSTANTS", {
                    TABLE_ITEM_BUTTON_EVENT: "TableItemActionButtonEmitted",
                    ITEM_LISTER_UPDATED_EVENT: "ItemListerUpdatedEvent"
                });

                app.config([
                    "$routeProvider",
                    "$animateProvider",
                    function($routeProvider, $animateProvider) {

                        $animateProvider.classNameFilter(/^((?!no-animate).)*$/);

                        ROUTES.forEach(function(route) {
                            $routeProvider.when(route.route, {
                                controller: route.controller,
                                templateUrl: route.templateUrl,
                                resolve: route.resolve
                            });
                        });

                        $routeProvider.otherwise({
                            "redirectTo": "/"
                        });

                    }
                ]);

                BOOTSTRAP("#content", "cpanel.domains");

            });

            return app;
        };
    }
);

