/*
# email_deliverability/controllers/ROUTES.js         Copyright 2018 cPanel, L.L.C.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

define(
    'app/controllers/ROUTES',[
        "cjt/util/locale",
        "cjt/core"
    ],
    function(LOCALE, CJT) {

        "use strict";

        /**
         * @module ROUTES
         */

        /** @static */
        var ROUTES = [
            {
                "id": "listDomains",
                "route": "/",
                "hideTitle": true,
                "controller": "ListDomainsController",
                "controllerAs": "listDomains",
                "templateUrl": CJT.buildFullPath("shared/js/email_deliverability/views/listDomains.ptt"),
                "title": LOCALE.maketext("List Domains"),
                "resolve": {
                    "initialDomains": ["DomainsService", function($service) {
                        return $service.fetchAll();
                    }]
                }
            },
            {
                "id": "manageDomain",
                "route": "/manage",
                "controller": "ManageDomainController",
                "controllerAs": "manageDomain",
                "templateUrl": CJT.buildFullPath("shared/js/email_deliverability/views/manageDomain.ptt"),
                "hideTitle": true,
                "title": LOCALE.maketext("Manage the Domain"),
                "resolve": {
                    "initialDomains": ["DomainsService", function($service) {
                        return $service.fetchAll();
                    }]
                },
                "parentID": "listDomains"
            },
            {
                "id": "manageDomainSPF",
                "route": "/manage/spf",
                "controller": "ManageDomainSPFController",
                "controllerAs": "manageDomainSPF",
                "templateUrl": CJT.buildFullPath("shared/js/email_deliverability/views/manageDomainSPF.ptt"),
                "hideTitle": true,
                "title": LOCALE.maketext("Customize an [output,abbr,SPF,Sender Policy Framework] Record"),
                "resolve": {
                    "initialDomains": ["DomainsService", function($service) {
                        return $service.fetchAll();
                    }]
                },
                "parentID": "manageDomain"
            },
            {
                "id": "manageDomainDKIM",
                "route": "/manage/dkim",
                "controller": "ManageDomainDKIMController",
                "controllerAs": "manageDomainDKIM",
                "templateUrl": CJT.buildFullPath("shared/js/email_deliverability/views/manageDomainDKIM.ptt"),
                "hideTitle": true,
                "title": LOCALE.maketext("View a [output,acronym,DKIM,Domain Keys Identified Mail] Private Key"),
                "resolve": {
                    "initialDomains": ["DomainsService", function($service) {
                        return $service.fetchAll();
                    }]
                },
                "parentID": "manageDomain"
            }
        ];

        ROUTES.forEach(function addBreadcrumbs(ROUTE) {
            ROUTE.breadcrumb = {
                id: ROUTE.id,
                name: ROUTE.title,
                path: ROUTE.route,
                parentID: ROUTE.parentID
            };
        });

        return ROUTES;
    }
);

/*
# email_deliverability/controllers/main.js           Copyright 2018 cPanel, L.L.C.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

define(
    'app/controllers/route',[
        "angular",
        "app/controllers/ROUTES",
        "cjt/directives/breadcrumbs",
        "cjt/services/alertService"
    ],
    function(angular, ROUTES) {

        "use strict";

        /**
         * Controller for App-level Route Handling
         *
         * @module RouteController
         *
         * @memberof cpanel.emailDeliverability
         *
         * @param {Object} $scope angular scope
         * @param {Object} $rootScope angular rootScope
         * @param {Object} $location angular location Object
         * @param {Object} $alertService cjt2 alertService
         *
         */

        var MODULE_NAMESPACE = "cpanel.emailDeliverability.controllers.route";
        var MODULE_REQUIREMENTS = [];
        var CONTROLLER_NAME = "RouteController";
        var CONTROLLER_INJECTABLES = ["$scope", "$rootScope", "$location", "alertService"];

        var CONTROLLER = function RouteController($scope, $rootScope, $location, $alertService) {

            /**
             * Find a Route by the Path
             *
             * @private
             *
             * @method _getRouteByPath
             * @param  {String} path route to match against the .route property of the existing routes
             *
             * @returns {Object} route that matches the provided path
             *
             */

            function _getRouteByPath(path) {
                var foundRoute;
                $scope.routes.forEach(function(route, key) {
                    if (route.route === path) {
                        foundRoute = key;
                    }
                });
                return foundRoute;
            }

            /**
             * Find a Tab / View by the ID
             *
             * @private
             *
             * @method _getTabByID
             * @param  {String} id id to match against the .route property of the existing routes
             *
             * @returns {Object} route that matches the provided path
             *
             */

            function _getTabByID(id) {
                var parentTab;
                $scope.routes.forEach(function(route) {
                    if (route.id === id) {
                        parentTab = route;
                    }
                });
                return parentTab;
            }

            /**
             * Initiate the $rootScope listeners
             *
             * @private
             *
             * @method _init
             *
             */

            function _init() {
                $rootScope.$on("$routeChangeStart", function() {
                    $scope.loading = true;
                    $alertService.clear("danger");
                });

                $rootScope.$on("$routeChangeSuccess", function(event, current) {
                    $scope.loading = false;
                    $scope.parentTab = null;

                    if (current) {
                        var currentRouteKey = _getRouteByPath(current.$$route.originalPath);
                        $scope.currentTab = $scope.routes[currentRouteKey];
                        $scope.activeTab = currentRouteKey;
                        if ($scope.currentTab) {
                            $scope.parentTab = _getTabByID($scope.currentTab.parentRoute);
                        }
                    }

                });

                $rootScope.$on("$routeChangeError", function() {
                    $scope.loading = false;
                });
            }

            angular.extend($scope, {
                activeTab: 0,
                currentTab: null,
                routes: ROUTES
            });

            _init();

        };

        CONTROLLER_INJECTABLES.push(CONTROLLER);

        var app = angular.module(MODULE_NAMESPACE, MODULE_REQUIREMENTS);
        app.controller(CONTROLLER_NAME, CONTROLLER_INJECTABLES);

        return {
            class: CONTROLLER,
            namespace: MODULE_NAMESPACE
        };
    }
);

/*
# email_deliverability/services/Domain.class.js      Copyright 2018 cPanel, L.L.C.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

define('shared/js/email_deliverability/services/Domain.class',[
    "lodash"
], function(_) {

    "use strict";

    /**
     * Class to contain domain object functions
     *
     * @property {Boolean} recordsLoaded whether setRecordsLoaded has been called
     * @property {Boolean} recordsValid whether the current records make the domain valid
     * @memberof cpanel.emailDeliverability
     * @class
     */
    var Domain = function Domain(domainObject) {
        var self = this;

        var _requiredArgs = ["domain"];

        this.records = [];
        this._recordDetails = {};
        this.reloadingIn = 0;
        this.nameservers = [];
        this.zone = "";
        this.recordsLoaded = false;
        this.recordsValid = false;
        this._recordTypesLoaded = [];
        this._recordsTypesWithIssues = [];
        this._suggestedRecords = {};
        this._expectedMatch = {};
        this.hasNSAuthority = false;
        this.mailIP = {
            version: null,
            address: null
        };

        /**
         *
         * Initiate the domain object
         *
         * @param {Object} domainObject object to process in construction
         */
        function init(domainObject) {

            Object.keys(domainObject).forEach(function(key) {
                self[key] = domainObject[key];
            });

            self.protocol = "http";
            self.isWildcard = self["domain"] && self["domain"].substr(0, 1) === "*";

            _requiredArgs.forEach(function(reqArg) {
                if (!self[reqArg]) {
                    throw new Error("“" + reqArg + "” is a required parameter.");
                }
            });
        }

        /**
         * Add a DNS Record to the Domain
         *
         * @method
         * @param  {Object} record new record to be added to the domain
         *
         */
        function addRecord(record) {
            if (_.isUndefined(record.recordType)) {
                throw new Error("recordType must be defined on a record");
            }
            if (_.isUndefined(record.valid)) {
                throw new Error("valid must be defined on a record of type “" + record.recordType + "” for domain “" + this.domain + "”");
            }
            this.records.push(record);
        }

        /**
         * Updates the status and validity of the domain based on existing records
         *
         * @method
         *
         */
        function setRecordsLoaded(recordTypesLoaded) {
            this._recordTypesLoaded = recordTypesLoaded;
            this.recordsLoaded = true;
            this._recordsTypesWithIssues = [];
            recordTypesLoaded.forEach(function(recordType) {
                var records = this.getRecords(recordType);
                if (records.length !== 1 || !records[0].valid) {
                    this._recordsTypesWithIssues.push(recordType);
                }
            }, this);
            this.recordsValid = this._recordsTypesWithIssues.length === 0;
        }

        /**
         *
         * Get the record types that have been loaded into this Domain
         *
         * @returns {Array<String>} array of record types
         */
        function getRecordTypesLoaded() {
            return this._recordTypesLoaded;
        }

        /**
         *
         * Reset loaded records
         *
         */
        function resetRecordLoaded() {
            this.recordsLoaded = false;
            this.recordTypesLoaded = [];
            this.reloadingIn = 0;
            this.records = [];
            this.hasNSAuthority = false;
            this.recordsValid = false;
            this._recordsTypesWithIssues = [];
        }

        /**
         *
         * Is a specific record type valid
         *
         * @param {String} recordType record type to check
         * @returns {Boolean} is the record type valid
         */
        function isRecordValid(recordType) {
            return this._recordsTypesWithIssues.indexOf(recordType) === -1;
        }

        /**
         * Get the record status for the domain
         *
         * @method
         * @return  {Array<Object>} an array of DNS records stored on the domain
         *
         */
        function getRecords(recordTypes) {
            var records = this.records;
            if (recordTypes) {
                records = records.filter(function(record) {
                    if (recordTypes.indexOf(record.recordType) !== -1) {
                        return true;
                    }
                    return false;
                });
            }
            return records;
        }

        /**
         *
         * Get the suggested valid record of a type for this domain
         *
         * @param {String} recordType record type to get the suggestion for
         * @returns {Object} suggested record
         */
        function getSuggestedRecord(recordType) {
            if (this.recordsLoaded && this.isRecordValid(recordType)) {
                return this.getCurrentRecord(recordType);
            }
            return this._suggestedRecords[recordType];
        }

        /**
         *
         * Set the suggested record for the domain
         *
         * @param {String} recordType record type to set the suggestion for
         * @param {Object} recordObject record suggestion
         */
        function setSuggestedRecord(recordType, recordObject) {
            this._suggestedRecords[recordType] = recordObject;
        }

        /**
         *
         * Get the expected valid record of a type for this domain
         *
         * @param {String} recordType record type to get the suggestion for
         * @returns {Object} expected record
         */
        function getExpectedMatch(recordType) {
            return this._expectedMatch[recordType];
        }

        /**
         *
         * Set the expected record for the domain
         *
         * @param {String} recordType record type to set the suggestion for
         * @param {Object} recordObject record suggestion
         */
        function setExpectedMatch(recordType, recordObject) {
            this._expectedMatch[recordType] = recordObject;
        }

        function getCurrentRecord(recordType) {
            var records = this.getRecords([recordType]);
            var topRecord = records[0];

            return topRecord ? topRecord.current : {};
        }

        /**
         * Get a list of record types with issues
         *
         * @method
         * @return  {Array<String>} an array of record types stored on the domain
         *
         */
        function getRecordTypesWithIssues() {
            return this._recordsTypesWithIssues;
        }

        /**
         *
         * Set the mail ip object for this domain
         *
         * @param {int} version IP Version 4 or Version 6
         * @param {String} address IP Address
         */
        function setMailIP(version, address) {
            this.mailIP.version = version;
            this.mailIP.address = address;
        }

        /**
         *
         * Get the mail IP object for the domain
         *
         * @returns {Object} object containing the .version and .address
         */
        function getMailIP() {
            return this.mailIP;
        }

        this.init = init.bind(this);
        this.addRecord = addRecord.bind(this);
        this.setRecordsLoaded = setRecordsLoaded.bind(this);
        this.getRecords = getRecords.bind(this);
        this.isRecordValid = isRecordValid.bind(this);
        this.getRecordTypesWithIssues = getRecordTypesWithIssues.bind(this);
        this.getSuggestedRecord = getSuggestedRecord.bind(this);
        this.setSuggestedRecord = setSuggestedRecord.bind(this);
        this.getExpectedMatch = getExpectedMatch.bind(this);
        this.setExpectedMatch = setExpectedMatch.bind(this);
        this.resetRecordLoaded = resetRecordLoaded.bind(this);
        this.setMailIP = setMailIP.bind(this);
        this.getMailIP = getMailIP.bind(this);
        this.getRecordTypesLoaded = getRecordTypesLoaded.bind(this);
        this.getCurrentRecord = getCurrentRecord.bind(this);

        this.init(domainObject);
    };

    _.assign(
        Domain.prototype,
        {
            setRecordDetails: function(rtype, details) {

                // sanity check - enforce lower-case
                if (!/^[a-z]+$/.test(rtype)) {
                    throw new Error("Invalid record type: " + rtype);
                }

                this._recordDetails[rtype] = details;
            },

            getRecordDetails: function(rtype) {
                if (!this._recordDetails.hasOwnProperty(rtype)) {
                    throw new Error("No stored details: " + rtype);
                }

                return this._recordDetails[rtype];
            },
        }
    );

    return Domain;
}
);

/*
# email_deliverability/services/domainFactory.js     Copyright 2018 cPanel, L.L.C.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

define('shared/js/email_deliverability/services/domainFactory',[
    "lodash",
    "shared/js/email_deliverability/services/Domain.class"
], function(_, Domain) {

    "use strict";

    /**
         * Factory for Creating Domain based on type
         *
         * @module DomainFactory
         * @memberof cpanel.emailDeliverability
         *
         */

    var DOMAIN_TYPE_CONSTANTS = {
        SUBDOMAIN: "subdomain",
        ADDON: "addon",
        ALIAS: "alias",
        MAIN: "main_domain"
    };

    /**
     * Creates a Domain
     *
     * @method
     * @return {Domain}
     */
    function DomainFactory(mainHomedir, mainDomain) {
        this._mainHomedir = mainHomedir;
        this._mainDomain = mainDomain;

        /**
         *
         * Clean a raw API object
         *
         * @param {Object} rawDomain raw API Object
         * @returns {Object} cleaned object
         */
        function _cleanRaw(rawDomain) {
            rawDomain.homedir = this._mainHomedir;
            rawDomain.documentRoot = rawDomain.documentRoot || rawDomain.dir;
            rawDomain.rootDomain = rawDomain.rootDomain || rawDomain.rootdomain || this._mainDomain;
            rawDomain.redirectsTo = rawDomain.status === "not redirected" ? null : rawDomain.status,

            delete rawDomain.dir;
            delete rawDomain.rootdomain;
            delete rawDomain.status;

            return rawDomain;
        }

        /**
         * create a new Domain from a raw API result
         *
         * @method create
         * @public
         *
         * @param {Object} rawDomain raw API domain object
         * @returns {Domain} new Domain();
         */
        function _create(rawDomain) {
            var cleanedDomain = this._cleanRaw(rawDomain);
            return new Domain(cleanedDomain);
        }

        /**
         * Get the Domain Type Constants
         *
         * @method getTypeConstants
         * @public
         *
         * @returns {Object} domain type constants
        */
        function _getTypeConstants() {
            return DOMAIN_TYPE_CONSTANTS;
        }

        /**
         * Set the main home dir for the user
         *
         * @method setMainHomedir
         * @public
         *
         * @param {String} homedir main home dir for the user
         */
        function _setMainHomedir(homedir) {
            this._mainHomedir = homedir;
        }

        /**
         * Set the main domain for the user
         *
         * @method setMainDomain
         * @public
         *
         * @param {String} domain main domain for the user
         */
        function _setMainDomain(domain) {
            this._mainDomain = domain;
        }

        /**
         * Get the class for the Factory
         *
         * @method getClass
         * @public
         *
         * @returns {Class} returns the Domain class
         */
        function getClass() {
            return Domain;
        }

        this._cleanRaw = _cleanRaw.bind(this);
        this.create = _create.bind(this);
        this.setMainHomedir = _setMainHomedir.bind(this);
        this.setMainDomain = _setMainDomain.bind(this);
        this.getTypeConstants = _getTypeConstants.bind(this);
        this.getClass = getClass.bind(this);
    }

    return new DomainFactory();
}
);

/*
# email_deliverability/services/DKIMRecordProcessor       Copyright 2018 cPanel, L.L.C.
#                                                                All rights Reserved.
# copyright@cpanel.net                                              http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

define('shared/js/email_deliverability/services/DKIMRecordProcessor',[], function() {

    "use strict";

    /**
     *
     * @module DKIMRecordProcessor
     * @memberof cpanel.emailDeliverability
     *
     */
    function DKIMRecordProcessor() {

        /**
         * Get the Validate API call for this Record Processor
         *
         * @method getValidateAPI
         * @public
         *
         * @returns {Object} api call .module and .func
         */
        function _getValidateAPI() {
            return { module: "EmailAuth", func: "validate_current_dkims" };
        }

        /**
         * Get the Install API call for this Record Processor
         *
         * @method getInstallAPI
         * @public
         *
         * @returns {Object} api call .module and .func
         */
        function _getInstallAPI() {
            return { module: "EmailAuth", func: "enable_dkim" };
        }

        /**
         * Process an Individual API result item
         *
         * @method processResultItem
         * @public
         *
         * @param {Object} resultItem API result item
         * @returns {Array<Object>} parsed records for the result item
         */
        function _processResultItem(resultItem) {
            var records = [];
            if (resultItem) {
                records = resultItem.records.map(this.parseRecord.bind(this));
            }
            return records;
        }

        /**
         * Process the result items for an API
         *
         * @method processResultItems
         * @public
         *
         * @param {Array<Object>} resultItems
         * @returns {Array<Array>} processed records organized by domain
         */
        function _processResultItems(resultItems) {
            var domainRecords = [];
            resultItems.forEach(function(resultItem) {
                domainRecords.push(this.processResultItem(resultItem));
            }, this);
            return domainRecords;
        }

        /**
         * Parse a record of this processor's type
         *
         * @method parseRecord
         * @public
         *
         * @param {Object} record record object
         * @returns validated and parsed record
         */
        function _parseRecord(record) {
            record.recordType = "dkim";
            return this.validateState(record);
        }

        /**
         * Validate a record of this processor's type
         *
         * @method validateState
         * @public
         *
         * @param {Object} record record object
         * @returns validated record
         */
        function _validateState(record) {
            record.valid = false;
            switch (record.state) {
                case "MISMATCH":
                case "PERMFAIL":
                    break;
                case "PASS":
                case "VALID":
                    record.valid = true;
                    break;
            }
            return record;
        }

        /**
         * Preprocess result items for consistent results during processResultItems call
         *
         * @method normalizeResults
         * @public
         *
         * @param {Array<Object>} results unprocessed results
         * @returns {Array<Object>} normalized results
         */
        function _normalizeResults(results) {
            results.data.forEach(function(resultItem) {
                var recordName = resultItem.domain;
                resultItem.records.forEach(function(record) {
                    record.current = {
                        name: recordName + ".",
                        value: record.current
                    };
                });
            });
            return results;
        }

        /**
         * Generated an expected record for this processor type
         *
         * @method generateSuggestedRecord
         * @public
         *
         * @param {Object} resultItem result item to generate a record for
         * @returns {String} expected record string
         */
        function _generateSuggestedRecord(resultItem) {
            return { name: resultItem.domain + ".", value: resultItem.expected };
        }

        this.generateSuggestedRecord = _generateSuggestedRecord.bind(this);
        this.normalizeResults = _normalizeResults.bind(this);
        this.getValidateAPI = _getValidateAPI.bind(this);
        this.getInstallAPI = _getInstallAPI.bind(this);
        this.processResultItem = _processResultItem.bind(this);
        this.processResultItems = _processResultItems.bind(this);
        this.parseRecord = _parseRecord.bind(this);
        this.validateState = _validateState.bind(this);
    }

    return new DKIMRecordProcessor();

});

/*
 * email_deliverability/services/spfParser.js         Copyright 2018 cPanel, L.L.C.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */


define(
    'shared/js/email_deliverability/services/spfParser',["lodash"],
    function(_) {

        "use strict";

        var MechanismError = function MechanismError(message, type) {
            this.name = "MechanismError";
            this.message = message;
            this.type = type || "warning";
            this.stack = new Error().stack;
        };

        function domainPrefixCheck(name, pattern, term) {
            var parts = term.match(pattern);
            var value = parts[1];

            if (!value) {
                return null;
            }

            if (value === ":" || value === "/") {
                throw new MechanismError("Blank argument for the " + name + " mechanism", "error");
            }

            // Value starts with ":" so it"s a domain
            if (/^:/.test(value)) {
                value = value.replace(/^:/, "");
            }

            return value;
        }

        function domainCheckNullable(name, pattern, term) {
            return domainCheck(name, pattern, term, true);
        }

        function domainCheck(name, pattern, term, nullable) {
            var value = term.match(pattern)[1];

            if (!nullable && !value) {
                throw new MechanismError("Missing mandatory argument for the " + name + " mechanism", "error");
            }

            if (value === ":" || value === "=") {
                throw new MechanismError("Blank argument for the " + name + " mechanism", "error");
            }

            if (/^(:|=)/.test(value)) {
                value = value.replace(/^(:|=)/, "");
            }

            return value;
        }

        MechanismError.prototype = Object.create(Error.prototype);
        MechanismError.prototype.constructor = MechanismError;

        var MECHANISMS = {
            version: {
                description: "The SPF record version",
                pattern: /^v=(.+)$/i,
                validate: function validate(r) {
                    var version = r.match(this.pattern)[1]; // NOTE: This test can never work since we force match it to spf1 in index.js
                    // if (version !== 'spf1') {
                    // 	throw new MechanismError(`Invalid version '${version}', must be 'spf1'`);
                    // }

                    return version;
                }
            },
            all: {
                description: "Always matches. It goes at the end of your record",
                pattern: /^all$/i
            },
            ip4: {

            // ip4:<ip4-address>
            // ip4:<ip4-network>/<prefix-length>
                description: "Match if IP is in the given range",
                pattern: /^ip4:(([\d.]*)(\/\d+)?)$/i,
                validate: function validate(r) {
                    var parts = r.match(this.pattern);
                    var value = parts[1];

                    if (!value) {
                        throw new MechanismError("Missing or blank mandatory network specification for the 'ip4' mechanism.", "error");
                    }

                    return value;
                }
            },
            ip6: {

            // ip6:<ip6-address>
            // ip6:<ip6-network>/<prefix-length>
                description: "Match if IPv6 is in the given range",
                pattern: /^ip6:((.*?)(\/\d+)?)$/i,
                validate: function validate(r) {
                    var parts = r.match(this.pattern);
                    var value = parts[1];

                    if (!value) {
                        throw new MechanismError("Missing or blank mandatory network specification for the 'ip6' mechanism.", "error");
                    }

                    return value;
                }
            },
            a: {

            // a
            // a/<prefix-length>
            // a:<domain>
            // a:<domain>/<prefix-length>
                description: "Match if IP has a DNS 'A' record in given domain",
                pattern: /a((:.*?)?(\/\d*)?)?$/i,
                validate: function validate(r) {
                    return domainPrefixCheck("a", this.pattern, r);
                }
            },
            mx: {

            // mx
            // mx/<prefix-length>
            // mx:<domain>
            // mx:<domain>/<prefix-length>
                description: "",
                pattern: /mx((:.*?)?(\/\d*)?)?$/i,
                validate: function validate(r) {
                    return domainPrefixCheck("mx", this.pattern, r);
                }
            },
            ptr: {

            // ptr
            // ptr:<domain>
                description: "Match if IP has a DNS 'PTR' record within given domain",
                pattern: /^ptr(:.*?)?$/i,
                validate: function validate(r) {
                    return domainCheckNullable("ptr", this.pattern, r);
                }
            },
            exists: {
                pattern: /^exists(:.*?)?$/i,
                validate: function validate(r) {
                    return domainCheck("exists", this.pattern, r);
                }
            },
            include: {
                description: "The specified domain is searched for an 'allow'",
                pattern: /^include(:.*?)?$/i,
                validate: function validate(r) {
                    return domainCheck("include", this.pattern, r);
                }
            },
            redirect: {
                description: "The SPF record for the value replaces the current record",
                pattern: /redirect(=.*?)?$/i,
                validate: function validate(r) {
                    return domainCheck("redirect", this.pattern, r);
                }
            },
            exp: {
                description: "Explanation message to send with rejection",
                pattern: /exp(=.*?)?$/i,
                validate: function validate(r) {
                    return domainCheck("exp", this.pattern, r);
                }
            }
        };

        var PREFIXES = {
            "+": "Pass",
            "-": "Fail",
            "~": "SoftFail",
            "?": "Neutral"
        };

        var versionRegex = /^v=spf1/i;
        var mechanismRegex = /(\+|-|~|\?)?(.+)/i; // * Values that will be set for every mechanism:
        // Prefix
        // Type
        // Value
        // PrefixDesc
        // Description

        function parseTerm(term, messages) {

        // Match up the prospective mechanism against the mechanism regex
            var parts = term.match(mechanismRegex);
            var record = {}; // It matched! Let's try to see which specific mechanism type it matches

            if (parts !== null) {

            // Break up the parts into their pieces
                var prefix = parts[1];
                var mechanism = parts[2]; // Check qualifier

                if (prefix) {
                    record.prefix = prefix;
                    record.prefixdesc = PREFIXES[prefix];
                } else if (versionRegex.test(mechanism)) {
                    record.prefix = "v";
                } else {

                    // Default to "pass" qualifier
                    record.prefix = "+";
                    record.prefixdesc = PREFIXES["+"];
                }

                var found = false;

                for (var name in MECHANISMS) {
                    if (Object.prototype.hasOwnProperty.call(MECHANISMS, name)) {
                        var settings = MECHANISMS[name]; // Matches mechanism spec

                        if (settings.pattern.test(mechanism)) {
                            found = true;
                            record.type = name;
                            record.description = settings.description;

                            if (settings.validate) {
                                try {
                                    var value = settings.validate.call(settings, mechanism);

                                    if (typeof value !== "undefined" && value !== null) {
                                        record.value = value;
                                    }
                                } catch (err) {
                                    if (err instanceof MechanismError) {

                                        // Error validating mechanism
                                        messages.push({
                                            message: err.message,
                                            type: err.type
                                        });
                                        break;
                                    } // else {
                                    // 	throw err;
                                    // }

                                }
                            }

                            break;
                        }
                    }
                }

                if (!found) {
                    messages.push({
                        message: "Unknown standalone term '".concat(mechanism, "'"),
                        type: "error"
                    });
                }
            }


            return record;
        }

        function parse(record) {

        // Remove whitespace
            record = record.trim();
            var records = {
                mechanisms: [],
                messages: [],

                // Valid flag will be changed at end of function
                valid: false
            };

            if (!versionRegex.test(record)) {

            // throw new Error();
                records.messages.push({
                    message: "No valid version found, record must start with 'v=spf1'",
                    type: "error"
                });
                return records;
            }

            var terms = record.split(/\s+/); // Give an error for duplicate Modifiers

            var duplicateMods = terms.filter(function(x) {
                return new RegExp("=").test(x);
            }).map(function(x) {
                return x.match(/^(.*?)=/)[1];
            }).filter(function(x, i, arr) {
                return _.includes(arr, x, i + 1);
            });

            if (duplicateMods && duplicateMods.length > 0) {
                records.messages.push({
                    type: "error",
                    message: "Modifiers like \"".concat(duplicateMods[0], "\" may appear only once in an SPF string")
                });
                return records;
            } // Give warning for duplicate mechanisms


            var duplicateMechs = terms.map(function(x) {
                return x.replace(/^(\+|-|~|\?)/, "");
            }).filter(function(x, i, arr) {
                return _.includes(arr, x, i + 1);
            });

            if (duplicateMechs && duplicateMechs.length > 0) {
                records.messages.push({
                    type: "warning",
                    message: "One or more duplicate mechanisms were found in the policy"
                });
            }


            try {
                for (var i = 0; i < terms.length; i++) {
                    var term = terms[i];
                    var mechanism = parseTerm(term, records.messages);

                    if (mechanism) {
                        records.mechanisms.push(mechanism);
                    }
                } // See if there's an "all" or "redirect" at the end of the policy
            } catch (err) {
            // eslint-disable-next-line no-console
                console.error(err);
            }

            if (records.mechanisms.length > 0) {

            // More than one modifier like redirect or exp is invalid
            // if (records.mechanisms.filter(x => x.type === 'redirect').length > 1 || records.mechanisms.filter(x => x.type === 'exp').length > 1) {
            // 	records.messages.push({
            // 		type: 'error',
            // 		message: 'Modifiers like "redirect" and "exp" can only appear once in an SPF string'
            // 	});
            // 	return records;
            // }
            // let lastMech = records.mechanisms[records.mechanisms.length - 1];
                var redirectMech = _.find(records.mechanisms, function(x) {
                    return x.type === "redirect";
                });
                var allMech = _.find(records.mechanisms, function(x) {
                    return x.type === "all";
                }); // if (lastMech.type !== "all" && lastMech !== "redirect") {

                if (!allMech && !redirectMech) {
                    records.messages.push({
                        type: "warning",
                        message: 'SPF strings should always either use an "all" mechanism or a "redirect" modifier to explicitly terminate processing.'
                    });
                } // Give a warning if "all" is not last mechanism in policy


                var allIdx = -1;

                records.mechanisms.forEach(function(x, index) {
                    if (x.type === "all" && allIdx === -1) {
                        allIdx = index;
                    }
                });

                if (allIdx > -1) {
                    if (allIdx < records.mechanisms.length - 1) {
                        records.messages.push({
                            type: "warning",
                            message: "One or more mechanisms were found after the \"all\" mechanism. These mechanisms will be ignored"
                        });
                    }
                } // Give a warning if there"s a redirect modifier AND an "all" mechanism


                if (redirectMech && allMech) {
                    records.messages.push({
                        type: "warning",
                        message: 'The "redirect" modifier will not be used, because the SPF string contains an "all" mechanism. A "redirect" modifier is only used after all mechanisms fail to match, but "all" will always match'
                    });
                }
            } // If there are no messages, delete the key from "records"


            if (!Object.keys(records.messages).length > 0) {
                delete records.messages;
            }

            records.valid = true;
            return records;
        }

        return {
            parse: parse,
            parseTerm: parseTerm,
            mechanisms: MECHANISMS,
            prefixes: PREFIXES
        };
    }
);

/*
# email_deliverability/services/SPFRecordProcessor       Copyright 2018 cPanel, L.L.C.
#                                                                All rights Reserved.
# copyright@cpanel.net                                              http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

define('shared/js/email_deliverability/services/SPFRecordProcessor',[
    "shared/js/email_deliverability/services/spfParser"
], function(SPFParser) {

    "use strict";

    function SPFRecordProcessor() {

        /**
         *
         * @module SPFRecordProcessor
         * @memberof cpanel.emailDeliverability
         *
         */

        /**
         * Get the Validate API call for this Record Processor
         *
         * @method getValidateAPI
         * @public
         *
         *
         * @returns {Object} api call .module and .func
         */
        function _getValidateAPI() {
            return { module: "EmailAuth", func: "validate_current_spfs" };
        }

        /**
         * Get the Install API call for this Record Processor
         *
         * @method getInstallAPI
         * @public
         *
         *
         * @returns {Object} api call .module and .func
         */
        function _getInstallAPI() {
            return { module: "EmailAuth", func: "install_spf_records" };
        }

        /**
         * Process an Individual API result item
         *
         * @method processResultItem
         * @public
         *
         * @param {Object} resultItem API result item
         * @returns {Array<Object>} parsed records for the result item
         */
        function _processResultItem(resultItem) {
            var records = [];
            if (resultItem) {
                records = resultItem.records.map(this.parseRecord.bind(this));
            }
            return records;
        }

        /**
         * Process the result items for an API
         *
         * @method processResultItems
         * @public
         *
         * @param {Array<Object>} resultItems
         * @returns {Array<Array>} processed records organized by domain
         */
        function _processResultItems(resultItems) {
            var domainRecords = [];
            resultItems.forEach(function(resultItem) {
                domainRecords.push(this.processResultItem(resultItem));
            }, this);
            return domainRecords;
        }

        /**
         * Parse a record of this processor's type
         *
         * @method parseRecord
         * @public
         *
         * @param {Object} record record object
         * @returns validated and parsed record
         */
        function _parseRecord(record) {
            var currentName = record.current.name;
            var currentValue = record.current.value;
            var parsedRecord = this._parseSPF(currentValue);
            parsedRecord.state = record.state;
            parsedRecord.recordType = "spf";
            parsedRecord.current = { name: currentName, value: currentValue };
            parsedRecord = this.validateState(parsedRecord);
            return parsedRecord;
        }

        /**
         * Validate a record of this processor's type
         *
         * @method validateState
         * @public
         *
         * @param {Object} record record object
         * @returns validated record
         */
        function _validateState(record) {
            record.valid = false;
            switch (record.state) {
                case "SOFTFAIL":
                case "PERMERROR":
                    break;
                case "PASS":
                case "VALID":
                    record.valid = true;
                    break;
            }
            return record;
        }

        /**
         * Preporocess result items for consistent results during processResultItems call
         *
         * @method normalizeResults
         * @public
         *
         * @param {Array<Object>} results unprocessed results
         * @returns {Array<Object>} normalized results
         */
        function _normalizeResults(results) {
            results.data.forEach(function(resultItem) {
                var recordName = resultItem.domain;
                resultItem.records.forEach(function(record) {
                    record.current = {
                        name: recordName + ".",
                        value: record.current
                    };
                });
            });
            return results;
        }

        /**
         * Combine a string record with new mechanisms and de-dupe
         *
         * @method generatedExpectedRecord
         * @public
         *
         * @param {String} record record to combine with new mechanisms
         * @param {Array<String>} mechanisms new mechanisms to inject into the record
         * @returns {String} combined string record
         */
        function _combineRecords(oldRecord, mechanisms) {
            oldRecord = oldRecord || "";
            var parsedRecord = this._parseSPF(oldRecord);

            // de-dupe (remove instances of updated mechanisms in old record)
            var mechanismsToRemove = [];
            mechanisms.forEach(function(mechanism) {
                parsedRecord.mechanisms.forEach(function(oldRecordMech, index) {
                    if (oldRecordMech.type === mechanism.type && oldRecordMech.value === mechanism.value) {

                        // Item with type and value exist, regardless of prefix, remove it.
                        mechanismsToRemove.push(index);
                    }
                });
            });

            // Starting from the last index, remove all matching indexes
            mechanismsToRemove = mechanismsToRemove.sort().reverse();
            mechanismsToRemove.forEach(function(mechanismIndex) {
                parsedRecord.mechanisms.splice(mechanismIndex, 1);
            });
            var finalRecordMechanisms = [];

            // Add preceeding old mechanisms
            var insertIndex = 0;
            while (parsedRecord.mechanisms[insertIndex] && parsedRecord.mechanisms[insertIndex].type && parsedRecord.mechanisms[insertIndex].type.match(/^(version|ip|mx|a)$/)) {
                finalRecordMechanisms.push(parsedRecord.mechanisms[insertIndex]);
                insertIndex++;
            }

            // Add new mechanisms
            mechanisms.forEach(function(mechanism) {
                finalRecordMechanisms.push(mechanism);
            });

            // Add rest of old mechanisms
            while (insertIndex < parsedRecord.mechanisms.length) {
                finalRecordMechanisms.push(parsedRecord.mechanisms[insertIndex]);
                insertIndex++;
            }

            // convert to a string
            var newRecord = finalRecordMechanisms.map(function(mechanism) {
                var mechanismString;
                if (mechanism.type === "version") {
                    mechanismString = mechanism.prefix + "=" + mechanism.value;
                } else {
                    mechanismString = mechanism.prefix + mechanism.type;
                    if (mechanism.value) {
                        mechanismString += ":" + mechanism.value;
                    }
                }
                return mechanismString;
            }).join(" ");

            // return the completed record
            return newRecord;
        }

        /**
         * Generated an expected record for this processor type
         *
         * @method generateSuggestedRecord
         * @public
         *
         * @param {Object} resultItem result item to generate a record for
         * @returns {String} expected record string
         */
        function _generateSuggestedRecord(resultItem) {
            var missingPieces = resultItem.expected || "";
            var missingMechanisms = missingPieces.split(/\s+/).map(this._parseSPFTerm);
            var suggestedRecord = "";
            if (resultItem.records.length) {
                var firstCurrent = resultItem.records[0].current;
                suggestedRecord = this.combineRecords(firstCurrent.value, missingMechanisms);
            } else {
                suggestedRecord = this.combineRecords("v=spf1 +mx +a ~all", missingMechanisms);
            }
            return { name: resultItem.domain + ".", value: suggestedRecord, originalExpected: resultItem.expected };
        }

        this.generateSuggestedRecord = _generateSuggestedRecord.bind(this);
        this.normalizeResults = _normalizeResults.bind(this);
        this.getValidateAPI = _getValidateAPI.bind(this);
        this.getInstallAPI = _getInstallAPI.bind(this);
        this.processResultItem = _processResultItem.bind(this);
        this.processResultItems = _processResultItems.bind(this);
        this.parseRecord = _parseRecord.bind(this);
        this.validateState = _validateState.bind(this);
        this._parseSPF = SPFParser.parse.bind(SPFParser);
        this._parseSPFTerm = SPFParser.parseTerm.bind(SPFParser);
        this.combineRecords = _combineRecords.bind(this);
    }

    return new SPFRecordProcessor();

});

/*
# email_deliverability/services/PTRRecordProcessor       Copyright 2018 cPanel, L.L.C.
#                                                                All rights Reserved.
# copyright@cpanel.net                                              http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

define('shared/js/email_deliverability/services/PTRRecordProcessor',[], function() {

    "use strict";

    function PTRRecordProcessor() {

        /**
         *
         * @module PTRRecordProcessor
         * @memberof cpanel.emailDeliverability
         *
         */

        /**
         * Get the Validate API call for this Record Processor
         *
         * @method getValidateAPI
         * @public
         *
         * @returns {Object} api call .module and .func
         */
        function _getValidateAPI() {
            return { module: "EmailAuth", func: "validate_current_ptrs" };
        }

        /**
         * Get the Install API call for this Record Processor
         *
         * @method getInstallAPI
         * @public
         *
         * @returns {Object} api call .module and .func
         */
        function _getInstallAPI() {
            throw new Error("ptr does not do install in this interface");
        }

        /**
         * Process an Individual API result item
         *
         * @method processResultItem
         * @public
         *
         * @param {Object} resultItem API result item
         * @returns {Array<Object>} parsed records for the result item
         */
        function _processResultItem(resultItem) {
            var records = [];
            if (resultItem) {
                records = resultItem.records.map(this.parseRecord.bind(this));
            }
            return records;
        }

        /**
         * Process the result items for an API
         *
         * @method processResultItems
         * @public
         *
         * @param {Array<Object>} resultItems
         * @returns {Array<Array>} processed records organized by domain
         */
        function _processResultItems(resultItems) {
            var domainRecords = [];
            resultItems.forEach(function(resultItem) {
                domainRecords.push(this.processResultItem(resultItem));
            }, this);
            return domainRecords;
        }

        /**
         * Parse a record of this processor's type
         *
         * @method parseRecord
         * @public
         *
         * @param {Object} record record object
         * @returns validated and parsed record
         */
        function _parseRecord(record) {
            record.recordType = "ptr";
            return this.validateState(record);
        }

        /**
         * Validate a record of this processor's type
         *
         * @method validateState
         * @public
         *
         * @param {Object} record record object
         * @returns validated record
         */
        function _validateState(record) {
            record.valid = false;
            switch (record.state) {
                case "PASS":
                case "VALID":
                    record.valid = true;
                    break;
            }
            return record;
        }

        /**
         * Preporocess result items for consistent results during processResultItems call
         *
         * @method normalizeResults
         * @public
         *
         * @param {Array<Object>} results unprocessed results
         * @returns {Array<Object>} normalized results
         */
        function _normalizeResults(results) {
            var normalized = results.data.map( function(ptrEntry) {
                var mailDomain = ptrEntry.domain;

                var ptrRecords = ptrEntry.ptr_records.map( function(record) {
                    return {
                        current: {
                            name: ptrEntry.arpa_domain + ".",
                            value: record.domain,
                        },
                        domain: mailDomain,
                        state: record.state,
                    };
                } );

                return {
                    expected: ptrEntry.arpa_domain,
                    domain: mailDomain,
                    records: ptrRecords,
                    details: ptrEntry,
                };
            } );

            return { data: normalized };
        }

        /**
         * Generated an expected record for this processor type
         *
         * @method generateSuggestedRecord
         * @public
         *
         * @param {Object} resultItem result item to generate a record for
         * @returns {String} expected record string
         */
        function _generateSuggestedRecord(resultItem) {
            var expected = resultItem.expected;
            return { name: expected + ".", value: "unknown" };
        }

        this.generateSuggestedRecord = _generateSuggestedRecord.bind(this);
        this.normalizeResults = _normalizeResults.bind(this);
        this.getValidateAPI = _getValidateAPI.bind(this);
        this.getInstallAPI = _getInstallAPI.bind(this);
        this.processResultItem = _processResultItem.bind(this);
        this.processResultItems = _processResultItems.bind(this);
        this.parseRecord = _parseRecord.bind(this);
        this.validateState = _validateState.bind(this);
    }

    return new PTRRecordProcessor();

});

/*
 * email_deliverability/services/domains.js           Copyright 2018 cPanel, L.L.C.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define, PAGE */

define(
    'shared/js/email_deliverability/services/domains',[
        "angular",
        "lodash",
        "cjt/util/locale",
        "shared/js/email_deliverability/services/domainFactory",
        "shared/js/email_deliverability/services/DKIMRecordProcessor",
        "shared/js/email_deliverability/services/SPFRecordProcessor",
        "shared/js/email_deliverability/services/PTRRecordProcessor",
        "cjt/modules",
        "cjt/services/alertService",
        "cjt/modules",
        "cjt/services/APICatcher"
    ],
    function(angular, _, LOCALE, domainFactory, DKIMRecordProcessor, SPFRecordProcessor, PTRRecordProcessor) {

        "use strict";

        var MODULE_NAMESPACE = "shared.emailDeliverability.services.domains";
        var SERVICE_NAME = "DomainsService";
        var MODULE_REQUIREMENTS = [ "cjt2.services.apicatcher", "cjt2.services.alert" ];
        var SERVICE_INJECTABLES = ["$q", "$log", "$interval", "alertService", "APIInitializer", "APICatcher", "DOMAIN_TYPE_CONSTANTS", "PAGE"];

        // UAPI’s EmailAuth::validate_current_dkims returns the DKIM
        // record name as “domain”. This function intends to strip
        // the subdomain from that name to arrive at the domain name
        // for which the record exists. For example,
        // “newyork._domainkey.bob.com” becomes just “bob.com”.
        function _STRIP_DKIM_SUBDOMAIN(d) {
            return d.replace(/^.+\._domainkey\./, "");
        }

        var Zone = function(zoneName) {
            this.zone = zoneName;
            this.domains = [];
            this.lockDomain = null;
        };

        Zone.prototype.addDomain = function addDomainToZone(domain) {
            this.domains.push(domain);
        };

        // Returns a Domain object or null.
        Zone.prototype.getLockDomain = function getLockDomain() {
            return this.lockDomain;
        };

        // Requires a Domain object.
        Zone.prototype.lock = function lockZone(domainObj) {
            if (typeof domainObj !== "object") {
                throw new Error("Give a domain object!");
            }

            if (this.lockDomain) {
                throw new Error("Zone " + this.zone + " cannot lock for " + domainObj.domain + " because the zone is already locked for " + this.lockDomain + "!");
            }

            this.lockDomain = domainObj;
        };

        Zone.prototype.unlock = function unlockZone() {
            this.lockDomain = null;
        };


        /**
         *
         * Service Factory to generate the Domains service
         *
         * @module DomainsService
         * @memberof cpanel.emailDeliverability
         *
         * @param {ng.$q} $q
         * @param {ng.$log} $log
         * @param {Object} APICatcher base service
         * @param {Object} DOMAIN_TYPE_CONSTANTS constants lookup of domain types
         * @param {Object} PAGE window PAGE object created in template
         * @returns {Domains} instance of the Domains service
         */
        var SERVICE_FACTORY = function($q, $log, $interval, $alertService, $apiInit, APICatcher, DOMAIN_TYPE_CONSTANTS, PAGE) {

            var _flattenedDomains;
            var _domainLookupMap = {};
            var _domainZoneMap = {};
            var _zones = [];

            var Domains = function() {};

            Domains.prototype = Object.create(APICatcher);

            /**
             *
             * Cache domains for ease of later lookup
             *
             * @private
             *
             * @param {Domain} domain to cache for later lookup
             * @returns {Domain} stored domain
             */
            Domains.prototype._cacheDomain = function _cacheDomain(domain) {

                if (!_flattenedDomains) {
                    _flattenedDomains = [];
                }

                _domainLookupMap[domain.domain] = domain;

                // Cache DKIM Key Domain too
                _domainLookupMap["default._domainkey." + domain.domain] = domain;

                // Store Domain in flattened domains
                _flattenedDomains.push(domain);

                return domain;
            };

            /**
             *
             * Remove a domain from the cache lookup
             *
             * @private
             *
             * @param {Domain} domain to remove from cache
             * @returns {Boolean} success of domain removal
             */
            Domains.prototype._uncacheDomain = function _uncacheDomain(domain) {
                var self = this;

                if (!_flattenedDomains) {
                    return false;
                }

                var domainObject = self._getDomainObject(domain);

                for (var i = _flattenedDomains.length - 1; i >= 0; i--) {
                    if (_flattenedDomains[i].domain === domainObject.domain) {
                        _flattenedDomains.splice(i, 1);
                        return true;
                    }
                }

                return false;
            };

            /**
             *
             * Return a domain object. This is used to ensure you're always working with a Domain()
             * even when a string might have been passed to a function.
             *
             * @public
             *
             * @param {string|Domain} wantedDomain - domain name or domain object
             * @returns {Domain} matching wantedDomain
             */
            Domains.prototype._getDomainObject = function _getDomainObject(wantedDomain) {

                var self = this;

                var domain = wantedDomain;

                if (typeof domain === "string") {
                    domain = self.findDomainByName(domain);
                }

                if (domain instanceof domainFactory.getClass() !== true) {
                    $log.warn("Could not find domain “" + wantedDomain + "”");
                }

                return domain;
            };

            /**
             *
             * Find a domain using the domain name string
             *
             * @public
             *
             * @param {string} domainName - domain name to find
             * @returns {Domain} matching domainName
             */
            Domains.prototype.findDomainByName = function _findDomainByName(domainName) {
                return _domainLookupMap[domainName];
            };

            /**
             *
             * Returns all currently loaded and stored domains
             *
             * @public
             *
             * @returns Array<Domain> returns a list of all loaded domains
             */
            Domains.prototype.getAll = function getAllDomains() {
                return _flattenedDomains;
            };

            /**
             *
             * API Wrapper to fetch the all domains (main, addon, subdomain, alias) and cache them
             *
             * @public
             *
             * @returns Promise<Array<Domain>>
             */
            Domains.prototype.fetchAll = function fetchAllDomains() {
                var self = this;

                if (self.getAll()) {
                    return $q.resolve(self.getAll());
                }

                _flattenedDomains = [];

                var domains = PAGE.domains || [];

                domains.forEach(function(domain) {
                    if (domain.substring(0, 2) === "*.") {
                        return;
                    }
                    var domainObj = domainFactory.create({
                        domain: domain,
                        type: domain === PAGE.mainDomain ? DOMAIN_TYPE_CONSTANTS.MAIN : DOMAIN_TYPE_CONSTANTS.DOMAIN
                    });
                    self._cacheDomain(domainObj);
                });

                return $q.resolve(self.getAll());

            };

            /**
             *
             * Extract Mail IPS from a validate_current_ptrs API Result
             *
             * @private
             *
             * @param {Object} results object from API with .data array
             */
            Domains.prototype._extractMailIPs = function _extractMailIPs(results) {
                var data = results.data;

                data.forEach(function(ptrResult) {
                    var domain = this._getDomainObject(ptrResult.domain);
                    if (domain) {
                        domain.setMailIP(ptrResult.ip_version, ptrResult.ip_address);
                    }
                }, this);

            };

            /**
             * Find a domain zone by the domain name
             *
             * @param {String} zoneName name of the zone to find
             * @returns {Zone}
             */
            Domains.prototype.findZoneByName = function findZoneByName(zoneName) {
                for (var i = 0; i < _zones.length; i++) {
                    if (_zones[i].zone === zoneName) {
                        return _zones[i];
                    }
                }

                return null;
            };

            /**
             * Find domain zone by domain or domain name
             *
             * @param {Domain|String} domain
             * @returns {Zone}
             */
            Domains.prototype.findZoneByDomain = function findZoneByDomain(domain) {
                var domainObj = this._getDomainObject(domain);
                return _domainLookupMap[domainObj.domain];
            };


            /**
             * Add a domain to an existing zone, or create it
             *
             * @private
             *
             * @param {Domain} domain
             * @param {String} zone
             */
            Domains.prototype._addDomainToZone = function _addDomainToZone(domain, zone) {
                var zoneObj = this.findZoneByName(zone);
                if (!zoneObj) {
                    zoneObj = new Zone(zone);
                    _zones.push(zoneObj);
                }
                domain.zone = zone;
                zoneObj.addDomain(domain);
                _domainZoneMap[domain.domain] = zoneObj;
            };

            /**
             *
             * Process the results of a has_ns_authority results item
             *
             * @private
             *
             * @param {Object} resultItem
             * @returns {Domain} the updated Domain
             */
            Domains.prototype._processNSAuthResultItem = function _processNSAuthResultItem(resultItem) {
                var domainObj = this._getDomainObject(resultItem.domain);
                if (domainObj) {
                    domainObj.hasNSAuthority = resultItem.local_authority.toString() === "1";
                    domainObj.nameservers = resultItem.nameservers;
                    this._addDomainToZone(domainObj, resultItem.zone);
                }
                return domainObj;
            };

            /**
             *
             * Process a results item based on recordType and add records and suggested records to domains
             *
             * @private
             *
             * @param {Object} processor for handling recordType example services/DKIMRecordProcessor
             * @param {Object} recordTypeResults api results for the specific api call {data:...}
             * @param {string} recordType record type being processed
             */
            Domains.prototype._processRecordTypeResults = function _processRecordTypeResults(processor, recordTypeResults, recordType) {

                var normalizedResults = processor.normalizeResults(recordTypeResults);

                if (recordType === "ptr") {
                    this._extractMailIPs(recordTypeResults);
                }

                var normalizedResultsData = normalizedResults.data;
                var processedResults = processor.processResultItems(normalizedResultsData);
                normalizedResultsData.forEach(function(normalizedResultItem, index) {
                    var domainObj = this._getDomainObject(normalizedResultItem.domain);
                    if (!domainObj) {
                        $log.debug("domain not found", normalizedResultItem);
                        return;
                    }
                    var domainRecords = processedResults[index];
                    var suggestedRecord = processor.generateSuggestedRecord(normalizedResultItem);
                    domainObj.setSuggestedRecord(recordType, suggestedRecord);

                    if (recordType === "ptr") {
                        domainObj.setRecordDetails(recordType, normalizedResultItem.details);
                    } else if (recordType === "spf") {
                        domainObj.setExpectedMatch(recordType, normalizedResultItem.expected);
                    }

                    domainRecords.forEach( domainObj.addRecord.bind(domainObj) );
                }, this);

            };

            function _reportDKIMValidityCacheUpdates(recordTypeResults) {
                var validityCacheUpdated = recordTypeResults.data.filter( function(item) {
                    return item.validity_cache_update === "set";
                } );

                if (validityCacheUpdated.length) {
                    var domains = validityCacheUpdated.map( function(item) {
                        return _.escape( _STRIP_DKIM_SUBDOMAIN(item.domain) );
                    } );

                    domains = _.sortBy( domains, function(d) {
                        return d.length;
                    } );

                    // “domains” shouldn’t be a long list. If it becomes
                    // so, we’ll need to chop this up so that it gives just
                    // a few domains and then says something like
                    // “… and N others”. That will avoid creating a big blob
                    // in what should normally be just an informative alert.
                    $alertService.add({
                        type: "info",
                        replace: false,
                        message: LOCALE.maketext("The system detected [quant,_1,domain,domains] whose [output,acronym,DKIM,DomainKeys Identified Mail] signatures were inactive despite valid [asis,DKIM] configuration. The system has automatically enabled [asis,DKIM] signatures for the following [numerate,_1,domain,domains]: [list_and_quoted,_2]", domains.length, domains),
                    });
                }
            }

            /**
             *
             * Process the results of the fetchMailRecords API
             *
             * @private
             *
             * @param {Array} results batch api results [{data:...},{data:...}] where the first is the result of the has_ns_authority call, and the rest are recordType related
             * @param {Array<String>} recordTypes record types requested during the fetchMailRecords API call
             */
            Domains.prototype._processMailRecordResults = function _processMailRecordResults(results, recordTypes) {
                var batchResultItems = results.data;

                var nsAuthResult = batchResultItems.shift();

                if (nsAuthResult.data) {
                    nsAuthResult.data.forEach(this._processNSAuthResultItem, this);
                }

                recordTypes = recordTypes ? recordTypes : this.getSupportedRecordTypes();
                var processors = this.getRecordProcessors();

                recordTypes.forEach(function(recordType, index) {
                    var recordTypeResults = batchResultItems[index];
                    var processor = processors[recordType];
                    this._processRecordTypeResults(processor, recordTypeResults, recordType);

                    if (recordType === "dkim") {
                        _reportDKIMValidityCacheUpdates(recordTypeResults);
                    }
                }, this);
            };

            /**
             *
             * API Wrapper to fetch the status of all mail records for a set of domains
             *
             * @public
             *
             * @param {Array<Domain>} domains array of Domain() objects for which to fetch records
             * @param {Array<String>} recordTypes array of record types for which to fetch records
             * @returns {Promise<void>} returns the promise, but does not return an results object. That data is updated on the domain objects.
             */
            Domains.prototype.fetchMailRecords = function fetchMailRecords(domains, recordTypes) {

                var self = this;

                if (domains.length === 0) {
                    return $q.resolve();
                }

                var start = new Date();
                var startTime = start.getTime();

                var apiCall = $apiInit.init("Batch", "strict");

                var flatDomains = {};
                domains.forEach(function(domain, index) {
                    return flatDomains["domain-" + index] = domain.domain;
                });

                var commands = [];

                commands.push($apiInit.buildBatchCommandItem("DNS", "has_local_authority", flatDomains));

                recordTypes = recordTypes ? recordTypes : this.getSupportedRecordTypes();
                var processors = this.getRecordProcessors();

                recordTypes.forEach(function(recordType) {
                    var processor = processors[recordType];
                    var apiName = processor.getValidateAPI();
                    commands.push($apiInit.buildBatchCommandItem(apiName.module, apiName.func, flatDomains));
                }, this);

                apiCall.addArgument("command", commands);

                // If there’s an in-progress fetch already, then abort it
                // because we know we don’t need its data.
                if (this._fetchMailRecordsPromise) {
                    $log.debug("Canceling prior record status load");
                    this._fetchMailRecordsPromise.cancelCpCall();
                }

                this._fetchMailRecordsPromise = this.promise(apiCall);

                return this._fetchMailRecordsPromise.then(function(result) {
                    result = $apiInit.normalizeBatchResults(result);

                    var end = new Date();
                    var endTime = end.getTime();
                    $log.debug("Updating record statuses load took " + (endTime - startTime) + "ms for " + domains.length + " domains");
                    startTime = endTime;
                    self._processMailRecordResults(result, recordTypes);
                }).finally(function() {
                    delete self._fetchMailRecordsPromise;

                    var end = new Date();
                    var endTime = end.getTime();

                    $log.debug("Updating record statuses parsing took " + (endTime - startTime) + "ms for " + domains.length + " domains");
                });
            };

            /**
             *
             * Reset the records for a given domain, and poll for the records
             *
             * @public
             *
             * @param {Array<Domain>} domains array of domains for which to fetch records
             * @param {Array<string>} recordTypes array of record types for which to fetch records
             * @returns {Promise<void>} returns the promise, but does not return an results object. That data is updated on the domain objects.
             */
            Domains.prototype.validateAllRecords = function validateAllRecords(domains, recordTypes) {

                var self = this;
                recordTypes = recordTypes ? recordTypes : self.getSupportedRecordTypes();

                // Filter out domains already queued for a reload
                domains = domains.filter(function(domain) {
                    if (domain.reloadingIn) {
                        return false;
                    }
                    return true;
                });

                domains.forEach(function(domain) {
                    domain.resetRecordLoaded();
                }, self);

                return self.fetchMailRecords(domains, recordTypes).then(function() {
                    domains.forEach(function(domain) {
                        domain.setRecordsLoaded(recordTypes);
                    }, self);
                });

            };

            /**
             *
             * Returns a list of available processors for available record types. This is the key function for disabling record types.
             *
             * @public
             *
             * @returns {Object} returns object with keys representing record types, and value representing processor objects
             */
            Domains.prototype.getRecordProcessors = function recordProcessors() {

                var processors = {
                    "dkim": DKIMRecordProcessor,
                    "spf": SPFRecordProcessor
                };

                if ( PAGE.skipPTRLookups === undefined || !PAGE.skipPTRLookups ) {
                    processors.ptr = PTRRecordProcessor;
                }

                return processors;
            };

            /**
             *
             * Returns the currently supported record types.
             *
             * @public
             *
             * @returns {Array<strings>} array of supported record type strings
             */
            Domains.prototype.getSupportedRecordTypes = function getSupportedRecordTypes() {
                return Object.keys(this.getRecordProcessors());
            };

            /**
             *
             * Repair SPF records for a set of domains
             *
             * @public
             *
             * @param {Array<Domain>} domains array of domains to update records for
             * @param {Array<string>} records new SPF record strings to update
             * @returns <Promise<Object>> returns a promise and then an API results object
             */
            Domains.prototype.repairSPF = function repairSPF(domains, records) {
                var processors = this.getRecordProcessors();
                var processor = processors["spf"];
                var apiName = processor.getInstallAPI();

                var flatDomains = domains.map(function(domain) {
                    return domain.domain;
                });

                var apiCall = $apiInit.init(apiName.module, apiName.func);
                apiCall.addArgument("domain", flatDomains);
                apiCall.addArgument("record", records);

                return this.promise(apiCall);
            };

            /**
             *
             * Repair DKIM records for a set of domains
             *
             * @public
             *
             * @param {Array<Domain>} domains array of domains to update records for
             * @returns <Promise<Object>> returns a promise and then an API results object
             */
            Domains.prototype.repairDKIM = function repairDKIM(domains) {
                var processors = this.getRecordProcessors();
                var processor = processors["dkim"];
                var apiName = processor.getInstallAPI();

                var flatDomains = domains.map(function(domain) {
                    return domain.domain;
                });

                var apiCall = $apiInit.init(apiName.module, apiName.func);
                apiCall.addArgument("domain", flatDomains);

                return this.promise(apiCall);
            };

            /**
             *
             * Repair PTR records for a set of domains **current unsupported**
             *
             * @public
             *
             */
            Domains.prototype.repairPTR = function repairPTR(domain) {
                throw new Error("Installing PTR Records are not currently supported in this interface.");
            };

            /**
             *
             * Repair a record type for a single domain
             *
             * @public
             *
             * @param {Domain} domain domain to repair the record for
             * @param {String} recordType record type to repair
             * @param {String} newRecord new record, if setting a new record for the domain (SPF)
             * @returns {Promise<Object>} returns a promise and then the API result object
             */
            Domains.prototype.repairRecord = function repairRecord(domain, recordType, newRecord) {

                if (recordType === "spf") {
                    return this.repairSPF([domain], [newRecord]);
                } else if (recordType === "dkim") {
                    return this.repairDKIM([domain], [newRecord]);
                } else if (recordType === "ptr") {
                    return this.repairPTR([domain], [newRecord]);
                }

            };

            /**
             *
             * Called on success of a record repair
             *
             * @private
             *
             * @param {Domain} domainObj domain updated during the repair call
             * @param {String} recordType record type repaired during the repair call
             * @param {String} record resulting updated record
             */
            Domains.prototype._repairRecordSuccess = function _repairRecordSuccess(domainObj, recordType, record) {
                $alertService.success({
                    replace: false,
                    message: LOCALE.maketext("The system updated the “[_1]” record for “[_2]” to the following: [_3]", recordType.toUpperCase(), _.escape(domainObj.domain), "<pre>" + _.escape(record) + "</pre>")
                });
            };

            /**
             *
             * Called on failure of a record repair
             *
             * @private
             *
             * @param {Domain} domainObj domain updated during the repair call
             * @param {String} recordType record type repaired during the repair call
             * @param {String} error
             */
            Domains.prototype._repairRecordFailure = function _repairRecordSuccess(domainObj, recordType, error) {
                $alertService.add({
                    type: "error",
                    replace: false,
                    message: LOCALE.maketext("The system failed to update the “[_1]” record for “[_2]” because of an error: [_3]", recordType.toUpperCase(), _.escape(domainObj.domain), _.escape(error))
                });
            };

            Domains.prototype._interval = function _interval(func, interval, count) {
                return $interval(func, interval, count);
            };

            Domains.prototype._validateUntilSuccessComplete = function _validateUntilSuccessComplete(domainObj, successTypeRecords, waitAfter, startTime) {

                var self = this;

                $log.debug("[" + domainObj.domain + "] fetchMailRecords completed");

                var recordTypes = self.getSupportedRecordTypes();

                domainObj.setRecordsLoaded(recordTypes);
                var someFailed = successTypeRecords.some(function(recordType) {
                    return !domainObj.isRecordValid(recordType);
                });

                var timePassed = (new Date().getTime() - startTime) / 1000;

                $log.debug("[" + domainObj.domain + "] time passed since records set: " + timePassed);

                // If not, double waitAfter and wait that long to check again
                if (someFailed && timePassed < 120) {
                    $log.debug("[" + domainObj.domain + "] some failed, wait " + (waitAfter) + "s, and then try again.");

                    // Only bother alerting if it's been more than 5 seconds since the first call.
                    // A safety for the I/O issue found in COBRA-8775
                    if (timePassed > 5) {
                        $alertService.add({
                            type: "info",
                            replace: true,
                            message: LOCALE.maketext("The server records have not updated after [quant,_1,second,seconds]. The system will try again in [quant,_2,second,seconds].", Math.floor(timePassed), Math.floor(waitAfter))
                        });
                    }

                    domainObj.resetRecordLoaded();

                    domainObj.reloadingIn = waitAfter;

                    return self._interval(function() {
                        domainObj.reloadingIn--;
                    }, 1000, waitAfter).then(function() {
                        domainObj.reloadingIn = 0;
                        waitAfter *= 2;
                        $log.debug("[" + domainObj.domain + "] done waiting, trying again.");
                        return self.validateUntilSuccess(domainObj, successTypeRecords, waitAfter, startTime);
                    });
                } else {

                    if (!someFailed) {
                        $log.debug("[" + domainObj.domain + "] all records fixed.");
                        $alertService.success({
                            replace: true,
                            message: LOCALE.maketext("The system successfully updated the [asis,DNS] records.")
                        });
                    } else if (timePassed > 120) {
                        $log.debug("[" + domainObj.domain + "] more than 120s was taken to validate the change.");
                        $alertService.add({
                            type: "warning",
                            replace: true,
                            message: LOCALE.maketext("The system cannot verify that the record updated after 120 seconds.")
                        });
                    }

                    // If records are valid, we're done
                    domainObj.setRecordsLoaded(self.getSupportedRecordTypes());
                }
            };


            Domains.prototype.validateUntilSuccess = function validateUntilSuccess(domain, successTypeRecords, waitAfter, startTime) {
                var self = this;

                var domainObj = this._getDomainObject(domain);
                var recordTypes = self.getSupportedRecordTypes();

                $log.debug("[" + domain.domain + "] begin validateUntilSuccess @" + (waitAfter) + "s");

                return self.fetchMailRecords([domainObj], recordTypes).then(function() {
                    return self._validateUntilSuccessComplete(domainObj, successTypeRecords, waitAfter, startTime);
                });
            };

            Domains.prototype.getDomainZoneObject = function getDomainZoneObject(domain) {
                var domainObj = this._getDomainObject(domain);
                return this.findZoneByName(domainObj.zone) || false;
            };

            Domains.prototype._repairDomainComplete = function _repairDomainComplete(result, domain, recordTypes, records) {

                result = $apiInit.normalizeBatchResults(result);

                $log.debug("[" + domain.domain + "] beginning _repairDomainComplete.");

                var self = this;

                if (result.data) {
                    var recordsThatSucceeded = [];
                    result.data.forEach(function _processRecordResultObj(recordResultObj, index) {
                        var recordType = recordTypes[index];
                        var record = records[index];
                        var domainResultObj = recordResultObj.data[0];
                        if (domainResultObj.status.toString() !== "1") {
                            this._repairRecordFailure(domain, recordType, domainResultObj.msg);
                        } else {
                            recordsThatSucceeded.push(recordType);
                            this._repairRecordSuccess(domain, recordType, record);
                        }
                    }, this);

                    if (recordsThatSucceeded.length) {
                        $log.debug("[" + domain.domain + "] some records succeeeded.", recordsThatSucceeded.join(","));

                        var startTime = new Date().getTime();

                        return self.validateUntilSuccess(domain, recordsThatSucceeded, 5, startTime);
                    } else {
                        return self.validateAllRecords([domain]);
                    }
                }

            };

            Domains.prototype.repairDomain = function repairDomain(domain, recordTypes, records) {

                recordTypes = recordTypes.slice();
                records = records.slice();

                var self = this;

                var domainObj = this._getDomainObject(domain);

                // Lock the Zone
                var zoneObj = this.findZoneByName(domainObj.zone);
                zoneObj.lock(domainObj);
                $log.debug("[" + domainObj.domain + "] locking zone: ", zoneObj.zone);

                $log.debug("[" + domainObj.domain + "] beginning repairDomain.");

                domainObj.resetRecordLoaded();

                $log.debug("[" + domainObj.domain + "] resetting loaded records.");

                // Start the Repair - Batch is serial, so this is fine to do
                var apiCall = $apiInit.init("Batch", "strict");
                var processors = self.getRecordProcessors();

                var commands = recordTypes.map(function(recordType, index) {
                    var record = records[index];
                    var processor = processors[recordType];
                    var apiName = processor.getInstallAPI();
                    $log.debug("[" + domainObj.domain + "] adding batch command for “" + recordType + "”.");
                    return $apiInit.buildBatchCommandItem(apiName.module, apiName.func, { "domain": domainObj.domain, record: record });
                });

                apiCall.addArgument("command", commands);

                return self.promise(apiCall).then(function(result) {
                    $log.debug("[" + domainObj.domain + "] batch command completed.");
                    zoneObj.unlock();
                    return self._repairDomainComplete(result, domainObj, recordTypes, records);
                });
            };

            /**
             *
             * Process the API result for fetchPrivateDKIMKey
             *
             * @private
             *
             * @param {Object} result API results object {data:...}
             * @returns first result of API results.data array
             */
            Domains.prototype._processGetPrivateDKIMKey = function _processGetPrivateDKIMKey(result) {
                return result.data.pop();
            };

            /**
             *
             * Get the private DKIM key for a domain
             *
             * @public
             *
             * @param {Domain} domain domain to request the DKIM key for
             * @returns {Promise<Object>} DKIM Key object {pem:...,domain:...}
             */
            Domains.prototype.fetchPrivateDKIMKey = function fetchPrivateDKIMKey(domain) {
                var domainObj = this._getDomainObject(domain);

                var apiCall = $apiInit.init("EmailAuth", "fetch_dkim_private_keys");
                apiCall.addArgument("domain", domainObj.domain);

                return this.promise(apiCall).then(this._processGetPrivateDKIMKey);
            };

            /**
             *
             * Get the top most current record for a domain and record type
             *
             * @public
             *
             * @param {Domain} domain domain to get the record from
             * @param {String} recordType record type to fetch the record for
             * @returns {String} returns the string record or an empty string
             */
            Domains.prototype.getCurrentRecord = function getCurrentRecord(domain, recordType) {

                var domainObj = this._getDomainObject(domain);
                return domainObj.getCurrentRecord(recordType);

            };

            Domains.prototype.getNoAuthorityMessage = function getNoAuthorityMessage(domainObj, recordType) {
                var nameserversHtml = domainObj.nameservers.map( _.escape );

                if (domainObj.nameservers.length) {
                    return LOCALE.maketext("This system does not control [asis,DNS] for the “[_4]” domain. Contact the person responsible for the [list_and_quoted,_3] [numerate,_2,nameserver,nameservers] and request that they update the “[_1]” record with the following:", recordType.toUpperCase(), domainObj.nameservers.length, nameserversHtml, domainObj.domain);
                }

                return LOCALE.maketext("This system does not control [asis,DNS] for the “[_1]” domain, and the system did not find any authoritative nameservers for this domain. Contact your domain registrar to verify this domain’s registration.", domainObj.domain);
            };

            /**
             *
             * API Wrapper to obtain the helo record for a domain
             *
             * @param {Domain} domain domain to request the helo record for
             * @returns {Promise} get_mail_helo_ip promise
             */
            Domains.prototype.fetchMailHeloIP = function fetchMailHeloIP(domain) {

                var domainObj = this._getDomainObject(domain);

                var apiCall = $apiInit.init("EmailAuth", "get_mail_helo_ip");
                apiCall.addArgument("domain", domainObj.domain);

                return this.promise(apiCall).then(this._processMailHeloResult);

            };

            Domains.prototype.localDKIMExists = function localDKIMExists(domain) {
                var recordType = "dkim";

                if (domain.isRecordValid(recordType)) {
                    return true;
                }

                var record = domain.getSuggestedRecord(recordType);
                if (record.value) {
                    return true;
                }
                return false;
            };

            Domains.prototype.ensureLocalDKIMKeyExists = function ensureLocalDKIMKeyExists(domain) {
                var self = this;
                var apiCall = $apiInit.init("EmailAuth", "ensure_dkim_keys_exist");

                apiCall.addArgument("domain", domain.domain);

                return self.promise(apiCall).then(function(results) {
                    var data = results.data;
                    var domainResult = data.pop();
                    if (domainResult.status.toString() === "1") {
                        return self.fetchMailRecords([domain]);
                    } else {
                        return $alertService.add({
                            type: "error",
                            message: _.escape(domainResult.msg),
                        });
                    }
                });
            };

            // To be called whenever a view changes so that pending
            // “load” API calls can be canceled or abandoned.
            Domains.prototype.markViewLoad = function() {
                if (this._fetchMailRecordsPromise) {
                    this._fetchMailRecordsPromise.cancelCpCall();
                }
            };

            return new Domains();
        };

        SERVICE_INJECTABLES.push(SERVICE_FACTORY);

        var app = angular.module(MODULE_NAMESPACE, MODULE_REQUIREMENTS);
        app.value("PAGE", PAGE);
        app.value("DOMAIN_TYPE_CONSTANTS", domainFactory.getTypeConstants());
        app.factory(SERVICE_NAME, SERVICE_INJECTABLES);

        return {
            "class": SERVICE_FACTORY,
            "namespace": MODULE_NAMESPACE
        };
    }
);

/*
# email_deliverability/filters/htmlSafeString.js         Copyright 2018 cPanel, L.L.C.
#                                                             All rights Reserved.
# copyright@cpanel.net                                           http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'shared/js/email_deliverability/filters/htmlSafeString',[
        "angular",
        "lodash"
    ],
    function(angular, _) {

        "use strict";

        /**
         * Wrapper for lodash escape
         *
         * @module htmlSafeString
         * @memberof cpanel.emailDeliverability
         *
         * @example
         * {{ domain.domain | htmlSafeString }}
         *
         */

        var MODULE_NAMESPACE = "shared.emailDeliverability.htmlSafeString.filter";
        var MODULE_REQUIREMENTS = [ ];

        var CONTROLLER_INJECTABLES = [];
        var CONTROLLER = function CopyFieldController() {
            return _.escape;
        };

        var module = angular.module(MODULE_NAMESPACE, MODULE_REQUIREMENTS);
        module.filter("htmlSafeString", CONTROLLER_INJECTABLES.concat(CONTROLLER));

        return {
            "class": CONTROLLER,
            "namespace": MODULE_NAMESPACE
        };
    }
);

/*
# cjt/decorators/paginationDecorator.js             Copyright(c) 2014 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/decorators/paginationDecorator',[
        "angular",
        "cjt/core",
        "cjt/util/locale",
        "uiBootstrap"
    ],
    function(angular, CJT, LOCALE) {

        "use strict";

        var module;
        var MODULE_NAMESPACE = "cpanel.emailAccounts";

        try {
            module = angular.module(MODULE_NAMESPACE);
        } catch (e) {
            module = angular.module(MODULE_NAMESPACE, ["ui.bootstrap.pagination"]);
        }

        module.config(["$provide", function($provide) {

            // Extend the ngModelDirective to interpolate its name attribute
            $provide.decorator("uibPaginationDirective", ["$delegate", function($delegate) {
                var TEMPLATE_PATH = "decorators/pagination.phtml";
                var RELATIVE_PATH = "email_accounts/" + TEMPLATE_PATH;

                var uiPaginationDirective = $delegate[0];

                /**
                 * Update the ids in the page collection
                 *
                 * @method updateIds
                 * @param  {Array} pages
                 * @param  {string} id    Id of the directive, used as a prefix
                 */
                var updateIds = function(pages, id) {
                    if (!pages) {
                        return;
                    }

                    pages.forEach(function(page) {
                        page.id = id + "_" + page.text;
                    });
                };

                /**
                 * Update aria labels page collection
                 *
                 * @method updateIds
                 * @param  {Array} pages
                 */
                var updateAriaLabel = function(pages) {
                    if (!pages) {
                        return;
                    }

                    pages.forEach(function(page) {
                        page.ariaLabel = LOCALE.maketext("Go to page “[_1]”.", page.text);
                    });
                };

                /**
                 * Update current selected text
                 *
                 * @method updateCurrentSelectedText
                 * @param  {string} page - Current page number
                 * @param  {string} totalPages - Total pages
                 * @returns {string} Text to display
                 */
                var updateCurrentSelectedText = function(page, totalPages) {
                    return LOCALE.maketext("Page [numf,_1] of [numf,_2]", page, totalPages);
                };

                // Use a local template
                uiPaginationDirective.templateUrl = CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : TEMPLATE_PATH;

                // Extend the page model with the id field.
                var linkFn = uiPaginationDirective.link;

                /**
                 * Compile function for uiPagination Directive
                 *
                 * @method uiPaginationDirective.compile
                 */
                uiPaginationDirective.compile = function() {
                    return function(scope, element, attrs, ctrls) {
                        var paginationCtrl = ctrls[0];

                        linkFn.apply(this, arguments);

                        scope.parentId = attrs.id;
                        scope.ariaLabels = {
                            title: LOCALE.maketext("Pagination"),
                            firstPage: LOCALE.maketext("Go to first page."),
                            previousPage: LOCALE.maketext("Go to previous page."),
                            nextPage: LOCALE.maketext("Go to next page."),
                            lastPage: LOCALE.maketext("Go to last page."),
                        };

                        scope.updateCurrentSelectedText = updateCurrentSelectedText;

                        var render = paginationCtrl.render;
                        paginationCtrl.render = function() {
                            render.apply(paginationCtrl);
                            updateIds(scope.pages, scope.parentId);
                            updateAriaLabel(scope.pages);
                        };

                    };
                };

                return $delegate;
            }]);
        }]);

        return {
            namespace: MODULE_NAMESPACE
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
# email_deliverability/directives/domainListerViewDirective.js         Copyright 2018 cPanel, L.L.C.
#                                                                                All rights Reserved.
# copyright@cpanel.net                                                           http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'shared/js/email_deliverability/directives/copyField',[
        "angular",
        "cjt/util/locale",
        "cjt/core",
        "cjt/modules",
        "cjt/services/alertService"
    ],
    function(angular, LOCALE, CJT) {

        "use strict";

        function execCopyToClipboard(fieldID) {
            var field = document.getElementById(fieldID);
            field.focus();
            field.select();
            return document.execCommand("copy");
        }

        /**
         * Field and button combo to copy a pre-formatted text to the users clipboard
         *
         * @module copy-field
         * @restrict E
         * @memberof cpanel.emailDeliverability
         *
         * @example
         * <copy-field text="copy me to your clipboard"></copy-field>
         *
         */

        var RELATIVE_PATH = "shared/js/email_deliverability/directives/copyField.ptt";
        var TEMPLATE_PATH = CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : CJT.buildPath(RELATIVE_PATH);
        var MODULE_NAMESPACE = "shared.emailDeliverability.copyField.directive";
        var MODULE_REQUIREMENTS = [ "cjt2.services.alert" ];

        var CONTROLLER_INJECTABLES = ["$scope", "$timeout", "alertService"];
        var CONTROLLER = function CopyFieldController($scope, $timeout, $alertService) {

            $scope._onSuccess = function _onSuccess() {
                $alertService.success(LOCALE.maketext("Successfully copied to the clipboard."));
                $scope.copying = true;
                $timeout(function() {
                    $scope.copying = false;
                }, 3000);
            };

            $scope._execCopy = function() {
                return execCopyToClipboard($scope.copyFieldID);
            };

            /**
             *
             * Copy the text currently in the $scope.text to the clipboard
             *
             */
            $scope.copyToClipboard = function copyToClipboard() {
                if ($scope._execCopy()) {
                    $scope._onSuccess();
                }
            };

            /**
             *
             * Process updated text to determine if it is multiline or not
             *
             */
            $scope.processText = function processText() {

                if (!$scope.text) {
                    return;
                }

                var newTextParts = $scope.text.split("\n");
                if (newTextParts.length > 1) {
                    $scope.multilineRows = newTextParts.length - 1;
                }

            };

            $scope.$watch("text", $scope.processText);

            $scope.processText();

        };

        var module = angular.module(MODULE_NAMESPACE, MODULE_REQUIREMENTS);
        var DIRECTIVE_LINK = function($scope, $element, $attrs) {
            $scope.multilineRows = 1;
            $scope.copyFieldID = $scope.parentID + "_recordField";
            $scope.copying = false;
            $scope.placeholderText = $attrs.placeholder ? $attrs.placeholder : LOCALE.maketext("Nothing to copy");
        };

        module.directive("copyField", function copyFieldDirectiveFactory() {

            return {
                templateUrl: TEMPLATE_PATH,
                scope: {
                    parentID: "@id",
                    text: "=",
                    label: "@"
                },
                restrict: "E",
                replace: true,
                transclude: true,
                link: DIRECTIVE_LINK,
                controller: CONTROLLER_INJECTABLES.concat(CONTROLLER)
            };

        });

        return {
            "class": CONTROLLER,
            "namespace": MODULE_NAMESPACE,
            "link": DIRECTIVE_LINK,
            "template": TEMPLATE_PATH,
            execCopyToClipboard: execCopyToClipboard
        };
    }
);

/*
# email_deliverability/directives/suggestedRecordSet.js          Copyright 2018 cPanel, L.L.C.
#                                                                All rights Reserved.
# copyright@cpanel.net                                              http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'shared/js/email_deliverability/directives/suggestedRecordSet',[
        "angular",
        "lodash",
        "shared/js/email_deliverability/directives/copyField",
        "shared/js/email_deliverability/filters/htmlSafeString",
        "cjt/util/locale",
        "cjt/core",
        "cjt/directives/callout",
        "cjt/modules"
    ],
    function(angular, _, CopyField, HTMLSafeString, LOCALE, CJT) {

        "use strict";


        var RELATIVE_PATH = "shared/js/email_deliverability/directives/suggestedRecordSet.ptt";
        var TEMPLATE_PATH = CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : CJT.buildPath(RELATIVE_PATH);
        var MODULE_NAMESPACE = "shared.emailDeliverability.suggestedRecordSet.directive";
        var MODULE_REQUIREMENTS = [ CopyField.namespace, HTMLSafeString.namespace ];

        var SPLIT_REGEX = new RegExp("(.{1,255})", "g");

        var CONTROLLER_INJECTABLES = [ "$scope" ];
        var CONTROLLER = function SuggestedRecordSetController($scope) {

            $scope.domainName = $scope.domain.domain;

            $scope._suggestionMode = function() {
                $scope.label = LOCALE.maketext("Suggested “[_1]” ([_2]) Record", $scope.recordType.toUpperCase(), $scope.recordZoneType );
                $scope.record = $scope.domain.getSuggestedRecord($scope.recordType);
                $scope.noRecordMessage = LOCALE.maketext("Suggested “[_1]” does not exist.", $scope.recordType.toUpperCase());
                $scope.nameText = $scope.record.name;
                $scope.originalValueText = $scope.valueText = $scope.record.value;
            };

            $scope._currentMode = function() {
                $scope.label = LOCALE.maketext("Current “[_1]” ([_2]) Record", $scope.recordType.toUpperCase(), $scope.recordZoneType );
                $scope.record = $scope.domain.getCurrentRecord($scope.recordType);
                $scope.noRecordMessage = LOCALE.maketext("Current “[_1]” does not exist.", $scope.recordType.toUpperCase());
                $scope.nameText = $scope.record.name;
                $scope.originalValueText = $scope.valueText = $scope.record.value;
            };

            $scope._recordsReady = function() {
                if (!$scope.domain.recordsLoaded) {
                    return;
                }

                $scope.recordValid = $scope.domain.isRecordValid($scope.recordType);
                $scope.recordsLoaded = true;

                if ($scope.alwaysCurrent) {
                    $scope._currentMode();
                } else if ($scope.alwaysSuggested) {
                    $scope._suggestionMode();
                } else if ($scope.recordValid) {
                    $scope._currentMode();
                } else {
                    $scope._suggestionMode();
                }

                if (Object.keys($scope.record).length === 0) {
                    $scope.record = false;
                }
            };

            $scope._checkRecordsReady = function() {
                return $scope.domain.recordsLoaded;
            };

            $scope.splitMode = "full";

            $scope.toggleSplitMode = function() {
                $scope.splitMode = $scope.splitMode === "full" ? "split" : "full";

                if ( $scope.splitMode === "split" ) {

                    if ( !$scope.splitText ) {
                        var split = $scope.originalValueText.match(SPLIT_REGEX);
                        $scope.splitText = _.join( _.map(split, function(e) {
                            return "\"" + e + "\"";
                        }), " " );
                    }

                    $scope.valueText = $scope.splitText;
                } else {
                    $scope.valueText = $scope.originalValueText;
                }
            };

            $scope.$watch($scope._checkRecordsReady, $scope._recordsReady);

            $scope.label = LOCALE.maketext("Loading “[_1]” Record", $scope.recordType.toUpperCase() );

        };

        var module = angular.module(MODULE_NAMESPACE, MODULE_REQUIREMENTS);

        var DIRECTIVE_LINK = function($scope, $element, $attrs) {
            if (_.isUndefined($attrs["hideExtras"]) === false) {
                $scope.hideExtras = true;
            }
            if (_.isUndefined($attrs["alwaysSuggested"]) === false) {
                $scope.alwaysSuggested = true;
            }
            if (_.isUndefined($attrs["alwaysCurrent"]) === false) {
                $scope.alwaysCurrent = true;
            }
        };

        module.directive("suggestedRecordSet", function suggestedRecordSetDirectiveFactory() {

            return {
                templateUrl: TEMPLATE_PATH,
                scope: {
                    parentID: "@id",
                    domain: "=",
                    recordType: "@",
                    recordZoneType: "@",
                    splitable: "="
                },
                restrict: "E",
                replace: true,
                transclude: true,
                link: DIRECTIVE_LINK,
                controller: CONTROLLER_INJECTABLES.concat(CONTROLLER)
            };

        });

        return {
            "class": CONTROLLER,
            "namespace": MODULE_NAMESPACE,
            "template": TEMPLATE_PATH
        };
    }
);

/*
# email_deliverability/controller/manageDomain.js    Copyright 2018 cPanel, L.L.C.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

define(
    'shared/js/email_deliverability/views/manageDomain',[
        "angular",
        "lodash",
        "cjt/core",
        "cjt/util/locale",
        "cjt/util/inet6",
        "shared/js/email_deliverability/services/domains",
        "shared/js/email_deliverability/directives/copyField",
        "shared/js/email_deliverability/directives/suggestedRecordSet",
        "cjt/modules",
        "cjt/directives/callout",
        "cjt/directives/actionButtonDirective",
    ],
    function(angular, _, CJT, LOCALE, INET6, DomainsService, CopyField, SuggestedRecordSet) {

        "use strict";

        /**
         * Controller for Managing a Domain
         *
         * @module ManageDomainController
         * @memberof cpanel.emailDeliverability
         *
         */

        var MODULE_NAMESPACE = "shared.emailDeliverability.views.manageDomain";
        var MODULE_REQUIREMENTS = [
            DomainsService.namespace,
            CopyField.namespace,
            SuggestedRecordSet.namespace
        ];
        var CONTROLLER_NAME = "ManageDomainController";
        var CONTROLLER_INJECTABLES = ["$scope", "$location", "$routeParams", "DomainsService", "alertService", "ADD_RESOURCE_PANEL", "PAGE"];

        var CONTROLLER = function($scope, $location, $routeParams, $domainsService, $alertService, ADD_RESOURCE_PANEL, PAGE) {

            $scope.canReturnToLister = !PAGE.CAN_SKIP_LISTER || $domainsService.getAll().length > 1;

            $scope._returnToLister = function() {
                $location.path("/").search("");
            };

            /**
             *
             * Init the view
             *
             */
            $scope.init = function init() {

                var domains = $domainsService.getAll();

                $scope.currentDomain = $domainsService.findDomainByName($routeParams["domain"]);
                $scope.skipPTRLookups = PAGE.skipPTRLookups !== undefined ? PAGE.skipPTRLookups : false;

                if (!$scope.currentDomain && domains.length > 1) {
                    $alertService.add({
                        "message": LOCALE.maketext("You did not specify a domain to manage."),
                        "type": "info"
                    });

                    $scope._returnToLister();
                    return;
                } else if (domains.length === 1) {
                    $scope.currentDomain = domains[0];
                }

                angular.extend($scope, {
                    isWhm: CJT.isWhm(),
                    confirmDKIMDownloadRequest: false,
                    showConfirmDKIM: false,
                    dkimPrivateKey: false,
                    ptrServerName: "",
                    resourcesPanelTemplate: ADD_RESOURCE_PANEL,
                    isRecordValid: $scope.currentDomain.isRecordValid.bind($scope.currentDomain),
                    getSuggestedRecord: $scope.currentDomain.getSuggestedRecord.bind($scope.currentDomain)
                });

                var promise = $domainsService.validateAllRecords([$scope.currentDomain]);
                if (!$scope.skipPTRLookups) {
                    promise.then($scope._populatePTRInfo).then( $scope._handlePTRStatus );
                }
                return promise;
            };

            $scope._populatePTRInfo = function _populatePTRInformation() {
                var ptrDetails = $scope.currentDomain.getRecordDetails("ptr");
                var suggestedRecord = $scope.currentDomain.getSuggestedRecord("ptr");
                suggestedRecord.value = ptrDetails.helo + ".";
                $scope.currentDomain.setSuggestedRecord("ptr", suggestedRecord);

                $scope.ptrServerName = ptrDetails.helo;
                $scope.ptrServerIP = ptrDetails.ip_address;
            };

            /**
             *
             * Determine if current domain has nameserver authority
             *
             * @returns {Boolean} nameserver authority status
             */
            $scope.hasNSAuthority = function hasNSAuthority() {
                return $scope.currentDomain.hasNSAuthority;
            };

            /**
             *
             * Return the string message for a bad configuration
             *
             * @param {String} recordType record type to generate the message for
             * @returns {String} bad configuration message
             */
            $scope.badConfigurationMessage = function badConfigurationMessage(recordType) {
                var currentRecords = $scope.currentDomain.getRecords([recordType]);
                if (currentRecords.length) {
                    return LOCALE.maketext("“[_1]” is [output,strong,not] properly configured for this domain.", recordType.toUpperCase());
                } else {
                    return LOCALE.maketext("A “[_1]” record does [output,strong,not] exist for this domain.", recordType.toUpperCase());
                }
            };

            /**
             *
             * Generate the string message for a user with no authority
             *
             * @param {String} recordType record type to generate the message for
             * @returns {String} the no authority message
             */
            $scope.noAuthorityMessage = function noAuthorityMessage(recordType) {
                return $domainsService.getNoAuthorityMessage($scope.currentDomain, recordType);
            };

            /**
             *
             * Generate a string message for a valid record
             *
             * @param {String} recordType record type to generate the message for
             * @returns {String} valid record message
             */
            $scope.validRecordMessage = function validRecordMessage(recordType) {
                return LOCALE.maketext("“[_1]” is properly configured for this domain.", recordType.toUpperCase());
            };

            /**
             *
             * Repair a record for the current domain
             *
             * @param {String} recordType record type to repair
             * @returns {Promise} repair record promise
             */
            $scope.repairRecord = function repairRecord(recordType) {
                var newRecord = $scope.getSuggestedRecord(recordType);
                var promise = $domainsService.repairDomain($scope.currentDomain, [recordType], [newRecord.value]);
                if (!$scope.skipPTRLookups) {
                    promise.then($scope._populatePTRInfo);
                }
                promise.finally(function() {
                    $scope.showConfirmDKIM = false;
                });
                return promise;
            };

            /**
             *
             * Toggle the visible state of the confirm DKIM installation message
             *
             */
            $scope.toggleShowConfirmDKIM = function toggleShowConfirmDKIM() {
                $scope.showConfirmDKIM = !$scope.showConfirmDKIM;
            };

            /**
             *
             * Get the current record for the current domain
             *
             * @param {String} recordType record type to get the current record for the domain
             * @returns {String} current record or empty string
             */
            $scope.getCurrentRecord = function getCurrentRecord(recordType) {
                return $domainsService.getCurrentRecord($scope.currentDomain, recordType);
            };

            /**
             *
             * Get the ptr message based on the status of the invalid ptr record
             *
             * @returns {String} string message regarding PTR
             */
            $scope._handlePTRStatus = function _handlePTRStatus() {
                var details = $scope.currentDomain.getRecordDetails("ptr");

                var ptrState = details.state;
                var ptrRecords = details.ptr_records;
                var mailIP = details.ip_address;
                var mailHelo = details.helo;
                var ptrName = details.arpa_domain;

                $scope.ptrStatusCode = ptrState;

                if (ptrState === "IP_IS_PRIVATE") {
                    $scope.ipIsPrivate = true;
                } else {
                    var recordName = $scope.getSuggestedRecord("ptr").name;
                    recordName = recordName.replace(/\.$/, "");
                    $scope.ptrRecordName = _.escape(recordName);

                    var ptrNameservers = details.nameservers.map(_.escape) || [];
                    ptrNameservers.sort();

                    if (ptrState === "MISSING_PTR") {
                        $scope.badPTRMessages = [ LOCALE.maketext("There is no reverse [asis,DNS] configured for the [asis,IP] address ([_1]) that the system uses to send this domain’s outgoing email.", mailIP) ];

                        if (CJT.isWhm()) {
                            if (ptrNameservers.length) {
                                $scope.ptrToFixMessage = LOCALE.maketext("To fix this problem, create the following [asis,PTR] record at [list_and_quoted,_1]:", ptrNameservers);
                            } else {
                                $scope.ptrToFixMessage = LOCALE.maketext("To fix this problem, create the following [asis,PTR] record in [asis,DNS]:");
                            }
                        } else {
                            if (ptrNameservers.length) {
                                $scope.ptrToFixMessage = LOCALE.maketext("To fix this problem, contact your system administrator and request that they create the following [asis,PTR] record at [list_and_quoted,_1]:", ptrNameservers);
                            } else {
                                $scope.ptrToFixMessage = LOCALE.maketext("To fix this problem, contact your system administrator and request that they create the following [asis,PTR] record in [asis,DNS]:");
                            }
                        }
                    }

                    // At least one PTR value isn’t the expected value.
                    if (ptrState === "HELO_MISMATCH") {
                        var badNames = ptrRecords.filter( function(r) {
                            return (r.domain !== mailHelo);
                        } ).map( function(r) {
                            return r.domain;
                        } );

                        var resolvesSentence = LOCALE.maketext("The system sends “[_1]”’s outgoing email from the “[_2]” [output,abbr,IP,Internet Protocol] address.", $scope.currentDomain.domain, mailIP);

                        $scope.badPTRMessages = [
                            resolvesSentence + " " + LOCALE.maketext("The only [asis,PTR] value for this [output,abbr,IP,Internet Protocol] address must be “[_1]”. This is the name that this server sends with [output,abbr,SMTP,Simple Mail Transfer Protocol]’s “[_2]” command to send “[_3]”’s outgoing email.", mailHelo, "HELO", $scope.currentDomain.domain ),
                            LOCALE.maketext("[numf,_1] unexpected [asis,PTR] [numerate,_1,value exists,values exist] for this [output,abbr,IP,Internet Protocol] address:", badNames.length),
                        ];

                        $scope.badPTRNames = badNames;

                        if (CJT.isWhm()) {
                            if (ptrNameservers.length) {
                                $scope.ptrToFixMessage = LOCALE.maketext("To fix this problem, replace all [asis,PTR] records for “[_1]” with the following record at [list_and_quoted,_2]:", ptrName, ptrNameservers);
                            } else {
                                $scope.ptrToFixMessage = LOCALE.maketext("To fix this problem, replace all [asis,PTR] records for “[_1]” with the following record:", ptrName);
                            }
                        } else {
                            if (ptrNameservers.length) {
                                $scope.ptrToFixMessage = LOCALE.maketext("To fix this problem, contact your system administrator and request that they replace all [asis,PTR] records for “[_1]” with the following record at [list_and_quoted,_2]:", ptrName, ptrNameservers);
                            } else {
                                $scope.ptrToFixMessage = LOCALE.maketext("To fix this problem, contact your system administrator and request that they replace all [asis,PTR] records for “[_1]” with the following record:", ptrName);
                            }
                        }
                    }

                    // All PTRs are the expected value, but either there
                    // are no forward IPs or they all mismatch the mail IP.
                    //
                    // TODO: Because the PTR has the correct value, it’s
                    // probably more sensible to report this as a HELO
                    // problem than as a reverse DNS problem.
                    if (ptrState === "PTR_MISMATCH") {
                        var ips = ptrRecords[0].forward_records;

                        var badmsg = LOCALE.maketext("The system sends the domain “[_1]” in the [output,abbr,SMTP,Simple Mail Transfer Protocol] handshake for this domain’s email.", mailHelo);

                        if (!ips.length) {
                            badmsg += " " + LOCALE.maketext("“[_1]” does not resolve to any [output,abbr,IP,Internet Protocol] addresses.", mailHelo);
                        } else {
                            badmsg += " " + LOCALE.maketext("“[_1]” resolves to [list_and_quoted,_2], not “[_3]”.", mailHelo, ips, mailIP);
                        }

                        $scope.badPTRMessages = [badmsg];

                        var recordType = INET6.isValid(mailIP) ? "AAAA" : "A";

                        if (CJT.isWhm()) {
                            $scope.ptrToFixMessage = LOCALE.maketext("To fix this problem, create a [output,abbr,DNS,Domain Name System] “[_1]” record for “[_2]” whose value is “[_3]”.", recordType, mailHelo, mailIP);
                        } else {
                            $scope.ptrToFixMessage = LOCALE.maketext("To fix this problem, contact your system administrator and request that they create a [output,abbr,DNS,Domain Name System] “[_1]” record for “[_2]” whose value is “[_3]”.", recordType, mailHelo, mailIP);
                        }
                    }
                }
            };

            $scope.localDKIMExists = function() {
                return $domainsService.localDKIMExists($scope.currentDomain);
            };

            $scope.ensureLocalDKIMKeyExists = function() {
                return $domainsService.ensureLocalDKIMKeyExists($scope.currentDomain);
            };

            return $scope.init();

        };

        CONTROLLER_INJECTABLES.push(CONTROLLER);

        var app = angular.module(MODULE_NAMESPACE, MODULE_REQUIREMENTS);
        app.controller(CONTROLLER_NAME, CONTROLLER_INJECTABLES);

        return {
            class: CONTROLLER,
            namespace: MODULE_NAMESPACE
        };

    }
);

/*
# email_deliverability/controller/manageDomain.js    Copyright 2018 cPanel, L.L.C.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

define(
    'shared/js/email_deliverability/views/manageDomainSPF',[
        "angular",
        "lodash",
        "cjt/util/locale",
        "shared/js/email_deliverability/services/domains",
        "shared/js/email_deliverability/services/spfParser",
        "shared/js/email_deliverability/services/SPFRecordProcessor",
        "shared/js/email_deliverability/directives/copyField",
        "cjt/modules",
        "cjt/services/cpanel/componentSettingSaverService",
        "cjt/directives/callout",
        "cjt/directives/multiFieldEditorItem",
        "cjt/directives/multiFieldEditor",
        "cjt/directives/actionButtonDirective",
        "cjt/validator/ip-validators",
        "cjt/validator/domain-validators",
    ],
    function(angular, _, LOCALE, DomainsService, SPFParser, SPFRecordProcessor, CopyField) {

        "use strict";

        /**
         * Controller for Managing a Domain
         *
         * @module ManageDomainController
         * @memberof cpanel.emailDeliverability
         *
         */

        var MODULE_NAMESPACE = "shared.emailDeliverability.views.manageDomainSPF";
        var MODULE_REQUIREMENTS = [
            DomainsService.namespace,
            CopyField.namespace
        ];
        var CONTROLLER_NAME = "ManageDomainSPFController";
        var CONTROLLER_INJECTABLES = ["$scope", "$log", "$location", "$routeParams", "DomainsService", "alertService", "componentSettingSaverService", "ADD_RESOURCE_PANEL"];

        var CONTROLLER = function($scope, $log, $location, $routeParams, $domainsService, $alertService, $CSSS, ADD_RESOURCE_PANEL) {

            var MECHANISM_ARRAYS = ["additionalHosts", "additionalMXServers", "additionalIPv4Addresses", "additionalIPv6Addresses", "additionalINCLUDEItems"];

            /**
             *
             * Initiate the current view
             *
             */
            $scope.init = function init() {
                var domains = $domainsService.getAll();

                if (!$scope.currentDomain && domains.length > 1) {
                    $alertService.add({
                        "message": LOCALE.maketext("You did not specify a domain to manage."),
                        "type": "danger"
                    });

                    $location.path("/").search("");
                    return;
                } else if (domains.length === 1) {
                    $scope.currentDomain = domains[0];
                }

                $CSSS.get(CONTROLLER_NAME).then(function(response) {
                    if (typeof response !== "undefined" && response) {
                        $scope.showAllHelp = response.showAllHelp;
                    }
                });

                $CSSS.register(CONTROLLER_NAME);

                $scope.$on("$destroy", function() {
                    $CSSS.unregister(CONTROLLER_NAME);
                });

                MECHANISM_ARRAYS.forEach(function(attr) {
                    $scope.$watchCollection(attr, $scope.updatePreview.bind($scope));
                });

                return $domainsService.validateAllRecords([$scope.currentDomain]).then(function() {

                    $scope.suggestedRecord = $scope.currentDomain.getSuggestedRecord("spf");
                    var originalExpected = $scope.suggestedRecord.originalExpected || "";
                    var originalExpectedTerms = originalExpected.trim().split(/\s+/);
                    $scope.missingMechanisms = originalExpectedTerms.map(SPFRecordProcessor._parseSPFTerm).filter(function(term) {
                        if ( !term.type ) {
                            return false;
                        }
                        return true;
                    });

                    $scope.workingRecord = $scope.suggestedRecord;

                    $scope.populateFormFrom($scope.workingRecord);

                    $scope.updatePreview();

                });

            };


            /**
             *
             * Parse SPF record into various mechanisms
             *
             * @param {String} record SPF record to parse
             */
            $scope.parseRecord = function parseRecord(record) {
                if (!record) {
                    return;
                }
                if (!record.value) {
                    return;
                }
                var currentRecordParts = SPFParser.parse(record.value);
                var mechanisms = currentRecordParts.mechanisms;
                mechanisms.forEach(function(mechanism) {
                    if (mechanism.type !== "all" && !mechanism.value) {
                        return;
                    }

                    if (["version", "all"].indexOf(mechanism.type) === -1 && mechanism.prefix !== "+") {
                        $log.debug("Non-pass mechanism exists. Presenting warning.", mechanism);
                        $scope.nonPassPrefixesExist = true;
                        return;
                    }

                    if (mechanism.type === "mx") {
                        $scope.additionalMXServers.push(mechanism.value);
                    } else if (mechanism.type === "ip4") {
                        $scope.additionalIPv4Addresses.push(mechanism.value);
                    } else if (mechanism.type === "ip6") {
                        $scope.additionalIPv6Addresses.push(mechanism.value);
                    } else if (mechanism.type === "all" && mechanism.prefix === "-") {
                        $scope.excludeAllOtherDomains = true;
                    } else if (mechanism.type === "a") {
                        $scope.additionalHosts.push(mechanism.value);
                    } else if (mechanism.type === "include") {
                        $scope.additionalINCLUDEItems.push(mechanism.value);
                    }
                });
            };

            /**
             *
             * Remove duplicates from each of the mechanism arrays
             *
             */
            $scope.removeDuplicates = function removeDuplicates() {

                MECHANISM_ARRAYS.forEach(function(MECH_AR) {

                    var original = $scope[MECH_AR].slice(0);
                    var uniq = _.uniq(original);

                    $scope[MECH_AR].splice(0, $scope[MECH_AR].length);

                    uniq.forEach($scope[MECH_AR].push);
                });
            };

            /**
             *
             * Populate form from passed records
             *
             * @param {String} record SPF record to populate form from
             */
            $scope.populateFormFrom = function populateFormFromRecords(record) {

                // Clear current values
                MECHANISM_ARRAYS.forEach(function(MECH_AR) {
                    $scope[MECH_AR].splice(0, $scope[MECH_AR]);
                });

                $scope.parseRecord(record);
            };

            $scope.toggleExcludeAllOtherDomains = function toggleExcludeAllOtherDomains() {
                $scope.excludeAllOtherDomains = !$scope.excludeAllOtherDomains;
                $scope.updatePreview();
            };

            /**
             *
             * Update the $scope.workingPreview variable with the SPF Record
             *
             */
            $scope.updatePreview = function updatePreview() {

                // Build new user requested record.
                var newWorkingPreview = ["v=spf1", "+mx", "+a"];

                if (!$scope.missingMechanisms) {
                    return;
                }

                // add +a records
                $scope.additionalHosts.forEach(function(item) {
                    newWorkingPreview.push("+a:" + item);
                });

                // add +mx records
                $scope.additionalMXServers.forEach(function(item) {
                    newWorkingPreview.push("+mx:" + item);
                });

                // add all other ip4 addresses
                $scope.additionalIPv4Addresses.forEach(function(item) {
                    newWorkingPreview.push("+ip4:" + item);
                });

                // add all other ip6 addresses
                $scope.additionalIPv6Addresses.forEach(function(item) {
                    newWorkingPreview.push("+ip6:" + item);
                });

                // add all includes
                // these need to be last
                $scope.additionalINCLUDEItems.forEach(function(item) {
                    newWorkingPreview.push("+include:" + item);
                });

                // preserve non-pass mechanisms from current record
                // overridden ones will get collapsed away.
                var currentRecord = $scope.currentDomain.getCurrentRecord("spf");
                var currentRecordParts, mechanisms;
                if (currentRecord && currentRecord.value) {
                    currentRecordParts = SPFParser.parse(currentRecord.value);
                    mechanisms = currentRecordParts.mechanisms;
                    mechanisms.forEach(function(mechanism) {

                        if (["version", "all"].indexOf(mechanism.type) === -1 && mechanism.prefix !== "+") {

                            // non plus mechanisms
                            newWorkingPreview.push(mechanism.prefix + mechanism.type + ":" + mechanism.value);
                        }

                    });
                }

                // add ~all?
                if ($scope.excludeAllOtherDomains) {
                    newWorkingPreview.push("-all");
                } else {
                    newWorkingPreview.push("~all");
                }

                var newWorkingPreviewString = newWorkingPreview.join(" ");

                // v=spf1 +a +mx +ip4:10.215.218.115 +a:aaaaaaaaaa.com +mx:mxxxxxx.com +ip4:192.168.1.1 +include:include.com -all
                $scope.workingRecord = SPFRecordProcessor.combineRecords(newWorkingPreviewString, $scope.missingMechanisms);
            };

            /**
             *
             * Determine if current domain has nameserver authority
             *
             * @returns {Boolean} nameserver authority status
             */
            $scope.hasNSAuthority = function hasNSAuthority() {
                return $scope.currentDomain.hasNSAuthority;
            };

            /**
             *
             * Return the string message for a bad configuration
             *
             * @param {String} recordType record type to generate the message for
             * @returns {String} bad configuration message
             */
            $scope.badConfigurationMessage = function badConfigurationMessage(recordType) {
                return LOCALE.maketext("“[_1]” is [output,strong,not] properly configured for this domain.", recordType.toUpperCase());
            };

            /**
             *
             * Generate the string message for a user with no authority
             *
             * @param {String} recordType record type to generate the message for
             * @returns {String} the no authority message
             */
            $scope.noAuthorityMessage = function noAuthorityMessage(recordType) {
                return $domainsService.getNoAuthorityMessage($scope.currentDomain, recordType);
            };

            /**
             *
             * Toggle the visible help for the form
             *
             */
            $scope.toggleHelp = function toggleHelp() {
                $scope.showAllHelp = !$scope.showAllHelp;
                $scope.saveToComponentSettings();
            };

            /**
             *
             * Update the NVData saved aspects of this view
             *
             */
            $scope.saveToComponentSettings = function saveToComponentSettings() {
                $CSSS.set(CONTROLLER_NAME, {
                    showAllHelp: $scope.showAllHelp
                });
            };

            /**
             *
             * Repair the SPF record for the current domain
             *
             * @returns {Promise} repairRecord promise
             */
            $scope.update = function update() {
                return $domainsService.repairDomain($scope.currentDomain, ["spf"], [$scope.workingRecord]).finally(function() {
                    $scope.showConfirmDKIM = false;
                });
            };

            $scope.currentDomain = $domainsService.findDomainByName($routeParams["domain"]);

            angular.extend($scope, {
                getCurrentRecord: $scope.currentDomain.getCurrentRecord.bind($scope.currentDomain),
                resourcesPanelTemplate: ADD_RESOURCE_PANEL,
                showAllHelp: false,
                currentRecord: "",
                workingRecord: "",

                /* form fields */
                excludeAllOtherDomains: false,
                additionalHosts: [],
                additionalMXServers: [],
                additionalIPv4Addresses: [],
                additionalIPv6Addresses: [],
                additionalINCLUDEItems: []
            });

            return $scope.init();

        };

        CONTROLLER_INJECTABLES.push(CONTROLLER);

        var app = angular.module(MODULE_NAMESPACE, MODULE_REQUIREMENTS);
        app.controller(CONTROLLER_NAME, CONTROLLER_INJECTABLES);

        return {
            class: CONTROLLER,
            namespace: MODULE_NAMESPACE
        };

    }
);

/*
# email_deliverability/controller/manageDomainDKIM.js    Copyright 2018 cPanel, L.L.C.
#                                                               All rights Reserved.
# copyright@cpanel.net                                             http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

define(
    'shared/js/email_deliverability/views/manageDomainDKIM',[
        "angular",
        "lodash",
        "cjt/util/locale",
        "shared/js/email_deliverability/services/domains",
        "shared/js/email_deliverability/directives/copyField",
        "cjt/modules",
        "cjt/services/cpanel/componentSettingSaverService",
        "cjt/directives/callout",
        "cjt/directives/multiFieldEditorItem",
        "cjt/directives/multiFieldEditor",
        "cjt/directives/actionButtonDirective",
    ],
    function(angular, _, LOCALE, DomainsService, CopyField) {

        "use strict";

        /**
         * Controller for Managing a Domain
         *
         * @module ManageDomainController
         * @memberof cpanel.emailDeliverability
         *
         */

        var MODULE_NAMESPACE = "shared.emailDeliverability.views.manageDomainDKIM";
        var MODULE_REQUIREMENTS = [
            DomainsService.namespace,
            CopyField.namespace
        ];
        var CONTROLLER_NAME = "ManageDomainDKIMController";
        var CONTROLLER_INJECTABLES = ["$scope", "$location", "$routeParams", "DomainsService", "alertService", "componentSettingSaverService", "ADD_RESOURCE_PANEL"];

        var CONTROLLER = function($scope, $location, $routeParams, $domainsService, $alertService, $CSSS, ADD_RESOURCE_PANEL) {

            /**
             *
             * Update the scope with the working domain records
             *
             */
            $scope.getWorkingRecords = function getWorkingRecords() {
                $scope.suggestedRecord = $scope.currentDomain.getSuggestedRecord("spf");
                $scope.workingRecord = $scope.suggestedRecord;

                var dkimRecords = $scope.currentDomain.getRecords(["dkim"]);
                $scope.currentRecord = dkimRecords[0] ? dkimRecords[0].current : "";
            };

            /**
             *
             * Initate the view
             *
             */
            $scope.init = function init() {
                var domains = $domainsService.getAll();

                if (!$scope.currentDomain && domains.length > 1) {
                    $alertService.add({
                        "message": LOCALE.maketext("You did not specify a domain to manage."),
                        "type": "danger"
                    });

                    $location.path("/").search("");
                    return;
                } else if (domains.length === 1) {
                    $scope.currentDomain = domains[0];
                }

                $scope.getWorkingRecords();

                if (!$scope.suggestedRecord) {
                    $domainsService.validateAllRecords([$scope.currentDomain]).then($scope.getWorkingRecords);
                }


                $CSSS.get(CONTROLLER_NAME).then(function(response) {
                    if (typeof response !== "undefined" && response) {
                        $scope.showAllHelp = response.showAllHelp;
                    }
                });

                $CSSS.register(CONTROLLER_NAME);

                $scope.$on("$destroy", function() {
                    $CSSS.unregister(CONTROLLER_NAME);
                });

            };

            /**
             *
             * Toggle the visible help for the form
             *
             */
            $scope.toggleHelp = function toggleHelp() {
                $scope.showAllHelp = !$scope.showAllHelp;
                $scope.$broadcast("showHideAllChange", $scope.showAllHelp);
            };

            /**
             *
             * Update the NVData saved aspects of this view
             *
             */
            $scope.saveToComponentSettings = function saveToComponentSettings() {
                $CSSS.set(CONTROLLER_NAME, {
                    showAllHelp: $scope.showAllHelp
                });
            };

            /**
             *
             * Verify if a user has nameserver authority for the current domain
             *
             * @returns {Boolean} representative of nameserver authority
             */
            $scope.hasNSAuthority = function hasNSAuthority() {
                return $scope.currentDomain.hasNSAuthority;
            };

            /**
             *
             * Toggle the Confirm Download DKIM message
             *
             */
            $scope.requestConfirmDownloadDKIMKey = function requestConfirmDownloadDKIMKey() {
                $scope.confirmDKIMDownloadRequest = true;
            };

            /**
             *
             * Post API Processing Function for confirmRevealDKIMKey
             *
             * @private
             *
             * @param {Object} dkimKeyObj API result DKIM Key Object {pem:...}
             */
            $scope._getPrivateDKIMKeyLoaded = function _getPrivateDKIMKeyLoaded(dkimKeyObj) {
                $scope.dkimPrivateKey = dkimKeyObj.pem;
            };

            /**
             *
             * Download the DKIM Key and display it
             *
             * @returns {Promise} fetchPrivateDKIMKey promise
             */
            $scope.confirmRevealDKIMKey = function confirmRevealDKIMKey() {
                return $domainsService.fetchPrivateDKIMKey($scope.currentDomain)
                    .then($scope._getPrivateDKIMKeyLoaded)
                    .finally($scope.cancelRevealDKIMKey);
            };

            /**
             *
             * Close teh DKIMKey Download Confirmation
             *
             */
            $scope.cancelRevealDKIMKey = function cancelRevealDKIMKey() {
                $scope.confirmDKIMDownloadRequest = false;
            };

            angular.extend($scope, {
                currentDomain: $domainsService.findDomainByName($routeParams["domain"]),
                resourcesPanelTemplate: ADD_RESOURCE_PANEL,
                showAllHelp: false,
                currentRecord: "",
                workingRecord: ""
            });

            $scope.init();

        };

        CONTROLLER_INJECTABLES.push(CONTROLLER);

        var app = angular.module(MODULE_NAMESPACE, MODULE_REQUIREMENTS);
        app.controller(CONTROLLER_NAME, CONTROLLER_INJECTABLES);

        return {
            class: CONTROLLER,
            namespace: MODULE_NAMESPACE
        };

    }
);

/*
# email_deliverability/directives/recordStatus.js              Copyright 2018 cPanel, L.L.C.
#                                                                        All rights Reserved.
# copyright@cpanel.net                                                      http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'shared/js/email_deliverability/directives/recordStatus',[
        "angular",
        "cjt/util/locale",
        "cjt/core"
    ],
    function(angular, LOCALE, CJT) {

        "use strict";

        /**
         * Record Status
         *
         * @module record-status
         * @restrict EA
         *
         * @memberof cpanel.emailDeliverability
         *
         * @example
         * <td record-status
         *  domain="{domain:'domain.com'}"
         *  header="{field: 'headerField' label: 'Header'}" ></td>
         *
         */

        var RELATIVE_PATH = "shared/js/email_deliverability/directives/recordStatus.ptt";
        var TEMPLATE_PATH = CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : CJT.buildPath(RELATIVE_PATH);
        var MODULE_NAMESPACE = "cpanel.emailDeliverabilitty.recordStatus.directive";
        var MODULE_REQUIREMENTS = [];

        var CONTROLLER_INJECTABLES = ["$scope"];
        var CONTROLLER = function RecordStatusController($scope) {

            /**
             * Generates a status icon class based on record validity
             *
             * @method _getStatusIconClass
             * @private
             *
             * @memberof RecordStatusController
             *
             * @param  {String} valid boolean record validity
             *
             * @return {Boolean} returns a string of font awesome classes and colors
             *
             */

            $scope._getStatusIconClass = function _getStatusIconClass(valid) {
                if (valid) {
                    return "fa-check text-success";
                }
                return "fa-exclamation-triangle text-warning";
            };

            /**
             * Generates a status description based on record validity
             *
             * @method _getStatusDescription
             * @private
             *
             * @param  {String} valid boolean record validity
             *
             * @return {Boolean} returns a string description of the status
             *
             */

            $scope._getStatusDescription = function _getStatusDescription(valid) {
                if (valid) {
                    return LOCALE.maketext("No problems exist on this domain.");
                }
                return LOCALE.maketext("One or more problems exist on this domain.");
            };

            /**
             * Generates a status label based on record validity
             *
             * @method _getStatusLabel
             * @private
             *
             * @param  {String} valid boolean record validity
             *
             * @return {Boolean} returns a string label of the status
             *
             */

            $scope._getStatusLabel = function _getStatusLabel(valid) {
                if (valid) {
                    return LOCALE.maketext("Valid");
                }
                return LOCALE.maketext("Problems Exist");
            };

            /**
             * Update the status variables this record from the domain status
             * Called by the watcher.
             *
             * @method _getStatusLabel
             * @private
             *
             */

            $scope._updateStatus = function _updateStatus() {

                if (!$scope.domain || !$scope.domain.recordsLoaded) {
                    $scope.recordLoading = true;
                } else {
                    var someRecordsFail = $scope.records.some(function(record) {
                        return !$scope.domain.isRecordValid(record);
                    });

                    var recordsValid = !someRecordsFail;

                    angular.extend($scope, {
                        statusIconClass: $scope._getStatusIconClass(recordsValid),
                        statusLabel: $scope._getStatusLabel(recordsValid),
                        statusDescription: $scope._getStatusDescription(recordsValid),
                        recordLoading: false
                    });
                }
            };

            $scope.getLoadingMessage = function getLoadingMessage() {
                if (!$scope.domain) {
                    return "";
                }
                if ($scope.domain.reloadingIn) {
                    return LOCALE.maketext("Rechecking the server records in [quant,_1,second,seconds] …", $scope.domain.reloadingIn);
                } else {
                    return LOCALE.maketext("Loading …");
                }
            };

            var unwatch = $scope.$watch(function() {
                if (!$scope.domain) {
                    return false;
                }
                return $scope.domain.recordsLoaded;
            }, $scope._updateStatus);

            if ($scope.domain) {
                $scope._updateStatus();
            }

            $scope.$on("$destroy", function() {
                unwatch();
            });

        };

        var module = angular.module(MODULE_NAMESPACE, MODULE_REQUIREMENTS);

        var DIRECTIVE_LINK = function(scope, element, attrs) {
            scope.recordLoading = true;
        };
        module.directive("recordStatus", function itemListerItem() {

            return {
                templateUrl: TEMPLATE_PATH,
                scope: {
                    parentID: "@id",
                    records: "=",
                    domain: "="
                },
                restrict: "EA",
                replace: false,
                link: DIRECTIVE_LINK,
                controller: CONTROLLER_INJECTABLES.concat(CONTROLLER)

            };

        });

        return {
            "class": CONTROLLER,
            "namespace": MODULE_NAMESPACE,
            "link": DIRECTIVE_LINK,
            "template": TEMPLATE_PATH
        };
    }
);

/*
# email_deliverability/directives/domainListerViewDirective.js         Copyright 2018 cPanel, L.L.C.
#                                                                                All rights Reserved.
# copyright@cpanel.net                                                           http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'shared/js/email_deliverability/directives/edDomainListerViewDirective',[
        "angular",
        "lodash",
        "cjt/core",
        "cjt/util/locale",
        "shared/js/email_deliverability/directives/recordStatus",
        "shared/js/email_deliverability/filters/htmlSafeString",
        "shared/js/email_deliverability/services/domains"
    ],
    function(angular, _, CJT, LOCALE, RecordStatusDirective, SafeStringFilter, DomainsService) {

        "use strict";

        /**
         * Domain Lister View is a view that pairs with the item lister to
         * display domains and docroots as well as a manage link. It must
         * be nested within an item lister
         *
         * @module domain-lister-view
         * @restrict EA
         * @memberof cpanel.emailDeliverability
         *
         * @example
         * <item-lister>
         *     <domain-lister-view></domain-lister-view>
         * </item-lister>
         *
         */

        var MODULE_NAMESPACE = "cpanel.emailDeliverabilitty.domainListerView.directive";
        var MODULE_REQUIREMENTS = [ RecordStatusDirective.namespace, DomainsService.namespace, SafeStringFilter.namespace ];

        var RELATIVE_PATH = "shared/js/email_deliverability/directives/edDomainListerViewDirective.ptt";
        var TEMPLATE_PATH = CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : CJT.buildPath(RELATIVE_PATH);
        var CONTROLLER_INJECTABLES = ["$scope", "DomainsService", "ITEM_LISTER_CONSTANTS", "DOMAIN_TYPE_CONSTANTS", "PAGE"];
        var CONTROLLER = function DomainListViewController($scope, $domainsService, ITEM_LISTER_CONSTANTS, DOMAIN_TYPE_CONSTANTS, PAGE) {

            $scope.DOMAIN_TYPE_CONSTANTS = DOMAIN_TYPE_CONSTANTS;
            $scope.EMAIL_ACCOUNTS_APP_EXISTS = PAGE.EMAIL_ACCOUNTS_APP_EXISTS;
            $scope.webserverRoleAvailable = PAGE.hasWebServerRole;
            $scope.recordsToCheck = $domainsService.getSupportedRecordTypes();

            $scope._confirmingRepairDomains = {};

            /**
             * Get the list of domains
             *
             * @method getDomains
             *
             * @public
             *
             * @return {Array<Domain>} returns an array of Domain objects
             *
             */

            $scope.getDomains = function getDomains() {
                return $scope.domains;
            };

            $scope.escapeString = _.escape;

            /**
             *
             * Get the row class based on the records status for the domain
             *
             * @param {Domain} domain domain object to obtain the status from
             * @returns {String|Boolean} will return the status if applicable, or false if not
             */
            $scope.getDomainRowClasses = function getDomainRowClasses(domain) {
                if (domain.recordsLoaded) {
                    if (!domain.recordsValid) {
                        domain._rowClasses = "warning";
                    } else {
                        return false;
                    }
                }
                return domain._rowClasses;
            };

            /**
             *
             * Determine if a message should be shown that record types are filtered
             *
             * @param {Domain} domain Object to determine the status of
             * @returns {Boolean} value of whether some records are filtered from view
             */
            $scope.showRecordsFilteredMessage = function showRecordsFilteredMessage(domain) {
                if (!domain.recordsLoaded) {
                    return false;
                }
                if (!domain.recordsValid) {
                    return false;
                }
                var loadedRecords = domain.getRecordTypesLoaded();
                var supportedRecords = $domainsService.getSupportedRecordTypes();
                return loadedRecords.length !== supportedRecords.length;
            };

            /**
             *
             * Show the "Confirm Repair" dialog
             *
             * @param {Domain} domain Subject to display the dialog for
             */
            $scope.confirmRepair = function confirmRepair(domain) {
                $scope._confirmingRepairDomains[domain.domain] = true;
            };

            /**
             *
             * Cancel displaying the confirm repair dialog
             *
             * @param {Domain} domain Subject to cancel the dialog for
             */
            $scope.cancelConfirmRepair = function cancelConfirmRepair(domain) {
                $scope._confirmingRepairDomains[domain.domain] = false;
            };

            /**
             *
             * Determine if the Confirm Repair dialog is shown
             *
             * @param {Domain} domain Subject to check the status of the confirm dialog for
             * @returns {Boolean} is the dialog shown
             */
            $scope.isConfirmingRepair = function isConfirmingRepair(domain) {
                return $scope._confirmingRepairDomains[domain.domain];
            };

            function _getZoneLockDomain(domain) {
                var zoneObj = $domainsService.getDomainZoneObject(domain);
                return zoneObj && zoneObj.getLockDomain();
            }

            $scope.getDomainLockedMessage = function getDomainLockedMessage(domain) {

                if (domain.recordsLoaded && !domain.hasNSAuthority) {

                    // Not authoritative, return relevant message
                    if (domain.nameservers.length) {
                        return LOCALE.maketext("This system does not control [asis,DNS] for the “[_1]” domain. Contact the person responsible for the [list_and_quoted,_3] [numerate,_2,nameserver,nameservers] and request that they update the records.", domain.domain, domain.nameservers.length, domain.nameservers);
                    }

                    return LOCALE.maketext("This system does not control [asis,DNS] for the “[_1]” domain, and the system did not find any authoritative nameservers for this domain. Contact your domain registrar to verify this domain’s registration.", domain.domain);
                }

                if (!domain.recordsLoadingIn && _getZoneLockDomain(domain)) {

                    // Locked while updates are occuring, return relevant message

                    return LOCALE.maketext("You cannot modify this domain while a domain on the “[_1]” zone is updating.", domain.zone);
                }

                return false;

            };

            /**
             *
             * String to describe why this domain be auto-repaired.
             *
             * @param {Domain} domain Subject of the auto-repair inquiry
             * @returns {String} Localized description of why auto-repair isn’t possible, or undefined if auto-repair is indeed possible.
             */
            $scope.whyCannotAutoRepairDomain = function whyCannotAutoRepairDomain(domain) {
                var msg;

                if (!domain.recordsLoaded) {
                    msg = LOCALE.maketext("Loading …");
                } else if (!domain.hasNSAuthority) {
                    msg = LOCALE.maketext("Automatic repair is not available for this domain because this system is not authoritative for this domain.");
                } else {
                    var lockDomain = _getZoneLockDomain(domain);

                    if ( lockDomain ) {
                        msg = LOCALE.maketext("Automatic repair is currently unavailable for this domain. You must wait until “[_1]”’s operation completes because these two domains share the same [output,acronym,DNS,Domain Name System] zone.", lockDomain);
                    } else if ( domain.isRecordValid("spf") && domain.isRecordValid("dkim") ) {
                        msg = LOCALE.maketext("This domain’s [output,acronym,DKIM,Domain Keys Identified Mail] and [output,acronym,SPF,Sender Policy Framework] configurations are valid.");
                    }
                }

                return msg;
            };

            /**
             * dispatches a TABLE_ITEM_BUTTON_EVENT event
             *
             * @method actionButtonClicked
             *
             * @public
             *
             * @param  {String} type type of action taken
             * @param  {String} domain the domain on which the action occurred
             *
             * @return {Boolean} returns the result of the $scope.$emit function
             *
             */
            $scope.actionButtonClicked = function actionButtonClicked(type, domain) {
                return $scope.$emit(ITEM_LISTER_CONSTANTS.TABLE_ITEM_BUTTON_EVENT, { actionType: type, item: domain, interactionID: domain.domain });
            };

            var recordTypeOrder = ["dkim", "spf", "ptr"];

            /**
             *
             * Get a list of record types with issues
             *
             * @param {Domain} domain Subject of inquiry
             * @returns {Array<String>} list of record types with issues
             */
            $scope.getRecordTypesWithIssues = function getRecordTypesWithIssues(domain) {
                var recordsWithIssue = domain.getRecordTypesWithIssues();
                if (recordsWithIssue.length === 0) {
                    return false;
                }

                recordsWithIssue.sort( function(a, b) {
                    a = recordTypeOrder.indexOf(a);
                    b = recordTypeOrder.indexOf(b);

                    return ( a < b ? -1 : a > b ? 1 : 0 );
                } );

                recordsWithIssue = recordsWithIssue.map(function(record) {
                    record = record.toUpperCase();

                    if (record === "PTR") {
                        return LOCALE.maketext("Reverse [asis,DNS]");
                    }

                    return record.toUpperCase();
                });

                return LOCALE.list_and(recordsWithIssue);
            };

            $scope.localDKIMExists = function(domain) {
                return $domainsService.localDKIMExists(domain);
            };

            $scope.ensureLocalDKIMKeyExists = function(domain) {
                return $domainsService.ensureLocalDKIMKeyExists(domain);
            };

        };

        var module = angular.module(MODULE_NAMESPACE, MODULE_REQUIREMENTS);

        module.value("PAGE", PAGE);

        var DIRECTIVE_LINK = function($scope, $element, $attrs, $ctrl) {
            $scope.domains = [];
            $scope.headerItems = $ctrl.getHeaderItems();
            $scope.updateView = function updateView(viewData) {
                $scope.domains = viewData;
            };
            $ctrl.registerViewCallback($scope.updateView.bind($scope));

            $scope.$on("$destroy", function() {
                $ctrl.deregisterViewCallback($scope.updateView);
            });
        };
        module.directive("domainListerView", function itemListerItem() {

            return {
                templateUrl: TEMPLATE_PATH,

                restrict: "EA",
                replace: true,
                require: "^itemLister",
                link: DIRECTIVE_LINK,
                controller: CONTROLLER_INJECTABLES.concat(CONTROLLER)

            };

        });

        return {
            "class": CONTROLLER,
            "namespace": MODULE_NAMESPACE,
            "link": DIRECTIVE_LINK,
            "template": TEMPLATE_PATH
        };
    }
);

/*
# email_deliverability/directives/tableShowingDirecitve.js             Copyright 2018 cPanel, L.L.C.
#                                                                                All rights Reserved.
# copyright@cpanel.net                                                           http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'shared/js/email_deliverability/directives/tableShowingDirective',[
        "angular",
        "cjt/util/locale",
        "cjt/core"
    ],
    function(angular, LOCALE, CJT) {

        "use strict";

        /**
         * Directive to render the "Showing 1 - 4 of 10"
         *
         * @module table-showing
         * @memberof cpanel.emailDeliverability
         *
         * @param  {Number} start first number in range ([1]-4)
         * @param  {Number} limit second number in range (1-[4])
         * @param  {Number} total total number of items (10)
         *
         * @example
         * <table-showing start="1" limit="4" total="10"></table-showing>
         *
         */

        var RELATIVE_PATH = "shared/js/email_deliverability/directives/tableShowingDirective.ptt";
        var TEMPLATE_PATH = CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : CJT.buildPath(RELATIVE_PATH);
        var MODULE_NAMESPACE = "shared.emailDeliverability.tableShowing.directive";
        var module = angular.module(MODULE_NAMESPACE, []);

        var CONTROLLER = function($scope) {

            /**
             * Get the rendered string from LOCALE
             *
             * @method getShowingText
             * @public
             *
             * @return {String} localized string
             *
             */

            $scope.getShowingText = function getShowingText() {
                return LOCALE.maketext("[_1] - [_2] of [_3]", $scope.start, $scope.limit, $scope.total);
            };

        };

        module.directive("tableShowing", function tableShowing() {

            return {
                templateUrl: TEMPLATE_PATH,
                restrict: "EA",
                scope: {
                    start: "=",
                    limit: "=",
                    total: "="
                },
                transclude: true,
                controller: ["$scope", CONTROLLER]
            };

        });

        return {
            "class": CONTROLLER,
            "namespace": MODULE_NAMESPACE,
            "template": TEMPLATE_PATH
        };
    }
);

/*
# email_deliverability/directives/itemLister.js                        Copyright 2018 cPanel, L.L.C.
#                                                                                All rights Reserved.
# copyright@cpanel.net                                                           http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'shared/js/email_deliverability/directives/itemLister',[
        "angular",
        "lodash",
        "cjt/core",
        "shared/js/email_deliverability/directives/tableShowingDirective",
        "ngSanitize",
        "ngRoute",
        "cjt/modules",
        "cjt/directives/pageSizeButtonDirective",
        "cjt/services/cpanel/componentSettingSaverService",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/searchDirective",
        "cjt/directives/pageSizeDirective",
        "cjt/filters/startFromFilter",
        "cjt/decorators/paginationDecorator"
    ],
    function(angular, _, CJT, TableShowingDirective) {

        "use strict";

        /**
         * Item Lister combines the typical table functions, pageSize,
         * showing, paginator, search, and allows you to plug in multiple
         * views.
         *
         * @module item-lister
         * @memberof cpanel.emailDeliverability
         * @restrict EA
         *
         * @param  {String} id disseminated to other objects
         * @param  {Array} items Items that will be paginated, array of objs
         * @param  {Array} header-items represents the columns of the table
         *
         * @example
         * <item-lister
         *      id="MyItemLister"
         *      items="[a,b,c,d,e]"
         *      header-items="[{field:"blah",label:"Blah",sortable:false}]">
         *   <my-item-lister-view></my-item-lister-view>
         * </item-lister>
         *
         */

        var MODULE_REQUIREMENTS = [
            TableShowingDirective.namespace,
            "ngRoute",
            "ngSanitize",
            "cjt2.filters.startFrom"
        ];
        var MODULE_NAMESPACE = "shared.emailDeliverability.itemLister.directive";
        var CSSS_COMPONENT_NAME = "domainsItemLister";

        var CONTROLLER_INJECTABLES = ["$routeParams", "$scope", "$filter", "$log", "$window", "componentSettingSaverService", "ITEM_LISTER_CONSTANTS"];
        var CONTROLLER = function itemListerController($routeParams, $scope, $filter, $log, $window, $CSSS, ITEM_LISTER_CONSTANTS) {

            $scope.viewCallbacks = [];

            var filters = {
                filter: $filter("filter"),
                orderBy: $filter("orderBy"),
                startFrom: $filter("startFrom"),
                limitTo: $filter("limitTo")
            };

            /**
             *
             * Filter items based on filterValue
             *
             * @private
             *
             * @param {Array} filteredItems items to filter
             * @returns {Array} filtered items
             */
            $scope._filter = function _filter(filteredItems) {

                // filter list based on search text
                if ($scope.filterValue !== "") {
                    return filters.filter(filteredItems, { domain: $scope.filterValue }, false);
                }

                return filteredItems;
            };

            /**
             *
             * Sort items based on sort.sortDirection and sort.sortBy
             *
             * @private
             *
             * @param {Array} filteredItems items to sort
             * @returns {Array} sorted items
             */
            $scope._sort = function _sort(filteredItems) {

                // sort the filtered list
                if ($scope.sort.sortDirection !== "" && $scope.sort.sortBy !== "") {
                    return filters.orderBy(filteredItems, $scope.sort.sortBy, $scope.sort.sortDirection !== "asc");
                }

                return filteredItems;
            };

            /**
             *
             * Paginate the items based on pageSize and currentPage
             *
             * @private
             *
             * @param {Array} filteredItems items to paginate
             * @returns {Array} paginated items
             */
            $scope._paginate = function _paginate(filteredItems) {

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
            };

            /**
             *
             * Update the NVData stored settings for the directive
             *
             * @private
             *
             * @param {String} lastInteractedItem last item interacted with
             */
            $scope._updatedListerState = function _updatedListerState(lastInteractedItem) {

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

                $CSSS.set(CSSS_COMPONENT_NAME, storedSettings);
            };

            /**
             *
             * Event function called on interaction with an item
             *
             * @private
             *
             * @param {Object} event event object
             * @param {Object} parameters event parameters {interactionID:...}
             */
            $scope._itemInteracted = function _itemInteracted(event, parameters) {
                if (parameters.interactionID) {
                    $scope._updatedListerState(parameters.interactionID);
                }
            };

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
             * @return {Array} filtered items
             */
            $scope.fetch = function fetch() {

                var filteredItems = [];

                filteredItems = $scope._filter($scope.items);

                // update the total items after search
                $scope.totalItems = filteredItems.length;

                filteredItems = $scope._sort(filteredItems);
                filteredItems = $scope._paginate(filteredItems);

                $scope.filteredItems = filteredItems;

                $scope._updatedListerState();

                angular.forEach($scope.viewCallbacks, function updateCallback(viewCallback) {
                    viewCallback($scope.filteredItems);
                });

                $scope.$emit(ITEM_LISTER_CONSTANTS.ITEM_LISTER_UPDATED_EVENT, { meta: { filterValue: $scope.filterValue }, items: filteredItems });

                return filteredItems;

            };

            /**
             * Return the focus of the page to the search at the top and scroll to it
             *
             */
            $scope.focusSearch = function focusSearch() {
                angular.element(document).find("#" + $scope.parentID + "_search_input").focus();
                $window.scrollTop = 0;
            };

            /**
             *
             * Event function for a table configuration being clicked
             *
             * @param {Object} config which config was clicked
             */
            $scope.tableConfigurationClicked = function tableConfigurationClicked(config) {
                $scope.$emit(ITEM_LISTER_CONSTANTS.TABLE_ITEM_BUTTON_EVENT, { actionType: "tableConfigurationClicked", config: config });
            };

            $scope.$on(ITEM_LISTER_CONSTANTS.TABLE_ITEM_BUTTON_EVENT, $scope._itemInteracted);

            angular.extend($scope, {
                maxPages: 5,
                totalItems: $scope.items.length,
                filteredItems: [],
                currentPage: 1,
                pageSize: 20,
                pageSizes: [10, 20, 50],

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

            /**
             *
             * Initiate CSSS saved state is loaded
             *
             * @private
             *
             * @param {Object} initialState saved state for directive
             */
            $scope._savedStateLoaded = function _savedStateLoaded(initialState) {
                angular.extend($scope, initialState, {
                    filterValue: $routeParams["q"]
                });
            };

            var registerSuccess = $CSSS.register(CSSS_COMPONENT_NAME);
            if ( registerSuccess ) {
                $scope.loadingInitialState = true;
                registerSuccess.then($scope._savedStateLoaded, $log.error).finally(function() {
                    $scope.loadingInitialState = false;
                    $scope.fetch();
                });
            }

            $scope.$on("$destroy", function() {
                $CSSS.unregister(CSSS_COMPONENT_NAME);
            });

            $scope.fetch();
            $scope.$watch("items", $scope.fetch);

        };

        var RELATIVE_PATH = "shared/js/email_deliverability/directives/itemLister.ptt";
        var TEMPLATE_PATH = CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : CJT.buildPath(RELATIVE_PATH);
        var DIRECTIVE_INJECTABLES = ["$window", "$log", "componentSettingSaverService"];
        var DIRECTIVE_LINK = function(scope, element) {

            scope.controlsBlock = null;
            scope.contentBlock = null;

            /**
             *
             * Attach controls to the view
             *
             * @private
             *
             * @param {HTMLElement} elem html element to transclude as controls
             */
            scope._attachControls = function _attachControls(elem) {
                scope.controlsBlock.append(elem);
            };

            /**
             *
             * Attach Other items to view
             *
             * @private
             *
             * @param {HTMLElement} elem element to treat as the table body
             */
            scope._attachOthers = function _attachOthers(elem) {
                elem.setAttribute("id", scope.parentID + "_transcludePoint");
                elem.setAttribute("ng-if", "filteredItems.length");
                scope.contentBlock.replaceWith(elem);
            };

            /**
             *
             * Attach a transclude item
             *
             * @private
             *
             * @param {HTMLElement} elem html element to determine attachment point for
             */
            scope._attachTransclude = function _attachTransclude(elem) {
                if (angular.element(elem).hasClass("lister-controls")) {
                    scope._attachControls(elem);
                } else {
                    scope._attachOthers(elem);
                }
            };

            /**
             *
             * Find transclude items to attach to the view
             *
             */
            scope._findTranscludes = function _findTranscludes() {

                // *cackles maniacally*
                // *does a multi-transclude anyways*
                scope.controlsBlock = element.find("#" + scope.parentID + "_transcludedControls");
                scope.contentBlock = element.find("#" + scope.parentID + "_transcludePoint");
                var transcludedBlock = element.find("div.transcluded");
                var transcludedItems = transcludedBlock.children();
                angular.forEach(transcludedItems, scope._attachTransclude, scope);
                transcludedBlock.remove();
            };

            /* There is a dumb race condition here */
            /* So we have to delay to get the content transcluded */
            setTimeout(scope._findTranscludes, 2);
        };
        var DIRECTIVE = function itemLister($window, $log, $CSSS) {

            return {
                templateUrl: TEMPLATE_PATH,
                restrict: "EA",
                scope: {
                    parentID: "@id",
                    items: "=",
                    headerItems: "=",
                    tableConfigurations: "="
                },
                transclude: true,
                replace: true,
                link: DIRECTIVE_LINK,
                controller: CONTROLLER_INJECTABLES.concat(CONTROLLER)
            };

        };

        var module = angular.module(MODULE_NAMESPACE, MODULE_REQUIREMENTS);

        module.directive("itemLister", DIRECTIVE_INJECTABLES.concat(DIRECTIVE));

        return {
            "class": CONTROLLER,
            "namespace": MODULE_NAMESPACE,
            "link": DIRECTIVE_LINK,
            "template": TEMPLATE_PATH
        };
    }
);

/*
# email_deliverability/controllers/listDomains.js          Copyright 2018 cPanel, L.L.C.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

define(
    'shared/js/email_deliverability/views/listDomains',[
        "angular",
        "lodash",
        "cjt/util/locale",
        "shared/js/email_deliverability/directives/edDomainListerViewDirective",
        "shared/js/email_deliverability/directives/tableShowingDirective",
        "shared/js/email_deliverability/directives/itemLister",
        "shared/js/email_deliverability/services/domains",
        "cjt/modules"
    ],
    function(angular, _, LOCALE, DomainListerViewDirective, TableShowingDirective, ItemListerDirective, DomainsService) {

        "use strict";

        /**
         * Controller for Listing Domains
         *
         * @module ListDomainsController
         * @memberof cpanel.emailDeliverability
         *
         */

        /**
         * @class TableHeader
         * @memberof cpanel.emailDeliverability
         *
         * @property {String} field which field the column will sort by
         * @property {String} label Label descriptor of the column
         * @property {boolean} sortable is this column sortable
         */
        var TableHeader = function() {
            this.field = "";
            this.label = "";
            this.sortable = false;
        };

        /**
         * Factory to create a TableHeader
         *
         * @module TableHeaderFactory
         * @memberof cpanel.emailDeliverability
         *
         */
        function createTableHeader(field, sortable, label, description, hiddenOnMobile) {
            function _makeLabel() {
                if (!description) {
                    return label;
                }
                return label + " <span class='thead-desc'>" + description + "</span>";
            }
            var tableHeader = new TableHeader();
            tableHeader.field = field;
            tableHeader.label = _makeLabel();
            tableHeader.sortable = sortable;
            tableHeader.hiddenOnMobile = hiddenOnMobile;
            return tableHeader;
        }

        var MODULE_NAMESPACE = "shared.emailDeliverability.views.listDomains";
        var MODULE_REQUIREMENTS = [
            TableShowingDirective.namespace,
            ItemListerDirective.namespace,
            DomainListerViewDirective.namespace,
            DomainsService.namespace
        ];
        var CONTROLLER_NAME = "ListDomainsController";
        var CONTROLLER_INJECTABLES = ["$scope", "$timeout", "$location", "$log", "$q", "alertService", "DomainsService", "initialDomains", "ITEM_LISTER_CONSTANTS", "PAGE"];

        var CONTROLLER = function ListDomainsController($scope, $timeout, $location, $log, $q, $alertService, $domainsService, initialDomains, ITEM_LISTER_CONSTANTS, PAGE) {

            /**
             * Called when a ITEM_LISTER_CONSTANTS.TABLE_ITEM_BUTTON_EVENT is $emit'd
             *
             * @method
             * @param {Object} event even object emitted
             * @param {Object} parameters parameters object emitted by the source
             *
             */
            $scope.itemChangeRequested = function _itemChangeRequested(event, parameters) {
                switch (parameters.actionType) {
                    case "manage":
                        $scope.manageDomain(parameters.item.domain);
                        break;
                    case "repair":
                        $scope.repairDomain(parameters.item.domain);
                        break;
                    case "repairAll":
                        $scope.repairAllDomainRecords(parameters.domain);
                        break;
                }
            };

            /**
             *
             * Function that when called moves the user to the manage view for a domain
             *
             * @public
             *
             * @param {String} domain string domain name
             */
            $scope.manageDomain = function _manageDomain(domain) {
                $domainsService.markViewLoad();
                $location.path("manage").search("domain", domain);
            };

            /**
             *
             * Get the suggested for a record type for a specific domain
             *
             * @public
             *
             * @param {Domain} domainObj domain from which to get the suggested record
             * @param {string} recordType type of record to fetch
             * @returns {String} string suggested record for the domain
             */
            $scope.getSuggestedRecord = function getSuggestedRecord(domainObj, recordType) {
                return domainObj.getSuggestedRecord(recordType);
            };

            /**
             *
             * Repair all repairable records for a specific domain
             *
             * @param {Domain} domain domain to repair
             * @returns {Promise} returns the repair promise
             */
            $scope.repairDomain = function repairDomain(domain) {

                var domainObj = $domainsService.findDomainByName(domain);
                $alertService.clear();

                var recordTypes = $scope.getDisplayedRecordTypes();
                recordTypes = recordTypes.filter(function(recordType) {
                    if (recordType !== "ptr" && !domainObj.isRecordValid(recordType)) {
                        return true;
                    }
                    return false;
                });

                var records = recordTypes.map(function(recordType) {
                    var newRecord = $scope.getSuggestedRecord(domainObj, recordType);
                    return newRecord.value;
                });

                return $domainsService.repairDomain(domain, recordTypes, records);
            };

            /**
             *
             * Get the record types that are not disabled in this view
             *
             * @returns {Array<String>} array of record types
             */
            $scope.getDisplayedRecordTypes = function getDisplayedRecordTypes() {
                return $domainsService.getSupportedRecordTypes();
            };


            /**
             *
             * Fetch the validation data for the displayed domains
             *
             * @private
             *
             * @param {Array<Domain>} domains array of domains to update
             * @returns {Promise} promise for the validateAllRecords call
             */
            $scope._fetchTableData = function _fetchTableData(domains) {
                var recordTypes = $scope.getDisplayedRecordTypes();
                return $domainsService.validateAllRecords(domains, recordTypes);
            };

            /**
             *
             * Debounce call for fetching domains (prevents doubling up of fetch calls)
             *
             * @private
             *
             */
            $scope._beginDelayedFetch = function _beginDelayedFetch() {
                if ($scope.currentTimeout) {
                    $timeout.cancel($scope.currentTimeout);
                    $scope.currentTimeout = null;
                }

                $scope.currentTimeout = $timeout($scope._fetchTableData, 500, true, $scope.pageDomains);
            };


            /**
             *
             * Event capture call for emitted ITEM_LISTER_CONSTANTS.ITEM_LISTER_UPDATED_EVENT events
             *
             * @private
             *
             * @param {Object} event event object
             * @param {Object} parameters event parameters {meta:{filterValue:...},items:...}
             */
            $scope._itemListerUpdated = function _itemListerUpdated(event, parameters) {

                $scope.itemListerMeta = parameters.meta;
                $scope.currentSearchFilterValue = $scope.itemListerMeta.filterValue;
                $scope.pageDomains = parameters.items;

                $scope._beginDelayedFetch();

            };


            /**
             *
             * Build the table headers for the lister
             *
             * @private
             *
             * @returns {Array<TableHeader>} array of table headers
             */
            $scope._buildTableHeaders = function _buildTableHeaders() {
                var tableHeaderItems = [];
                tableHeaderItems.push( createTableHeader( "domain", true, LOCALE.maketext("Domain"), false, false ) );
                tableHeaderItems.push( createTableHeader( "status", false, LOCALE.maketext("Email Deliverability Status"), false, true ) );
                tableHeaderItems.push( createTableHeader( "actions", false, "", false )  );
                return tableHeaderItems;
            };

            /**
             *
             * Get a list of filtered domains
             *
             * @returns {Array<Domain>} list of domains to display
             */
            $scope.getFilteredDomains = function getFilteredDomains() {
                return $scope.filteredDomains;
            };

            /**
             *
             * Function called upon completion of the CSSS load
             *
             * @private
             *
             */
            $scope._readyToDisplay = function _readyToDisplay() {
                $scope.$on(ITEM_LISTER_CONSTANTS.TABLE_ITEM_BUTTON_EVENT, $scope.itemChangeRequested);
                $scope.$on(ITEM_LISTER_CONSTANTS.ITEM_LISTER_UPDATED_EVENT, $scope._itemListerUpdated);
            };

            /**
             *
             * Initate the view
             *
             */
            $scope.init = function init() {

                if (initialDomains.length === 1 && PAGE.CAN_SKIP_LISTER) {
                    $location.path("/manage").search("domain", initialDomains[0].domain);
                } else {
                    $scope.domains = initialDomains;
                    $scope.filteredDomains = initialDomains;
                    $scope.tableHeaderItems = $scope._buildTableHeaders();

                    $scope._readyToDisplay();
                }

            };

            $scope.init();

        };

        CONTROLLER_INJECTABLES.push(CONTROLLER);

        var app = angular.module(MODULE_NAMESPACE, MODULE_REQUIREMENTS);
        app.controller(CONTROLLER_NAME, CONTROLLER_INJECTABLES);

        return {
            class: CONTROLLER,
            namespace: MODULE_NAMESPACE
        };
    }
);

/*
# email_deliverability/index.js                      Copyright 2018 cPanel, L.L.C.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/
/* global require, define, PAGE */

/** @namespace cpanel.emailDeliverability */

define(
    'app/index',[
        "angular",
        "lodash",
        "cjt/core",
        "app/controllers/ROUTES",
        "app/controllers/route",
        "shared/js/email_deliverability/services/domains",
        "shared/js/email_deliverability/filters/htmlSafeString",
        "app/decorators/paginationDecorator",
        "cjt/io/uapi-request",
        "ngRoute",
        "ngAnimate",
        "angular-chosen",
        "cjt/modules",
        "cjt/io/uapi",
        "cjt/directives/breadcrumbs",
        "cjt/services/alertService",
        "cjt/directives/loadingPanel",
        "shared/js/email_deliverability/views/manageDomain",
        "shared/js/email_deliverability/views/manageDomainSPF",
        "shared/js/email_deliverability/views/manageDomainDKIM",
        "shared/js/email_deliverability/views/listDomains",
    ],
    function(angular, _, CJT, ROUTES, RouteController, DomainsService, SafeStringFilter, PaginationDecorator, APIRequest) {

        "use strict";

        /**
         * App Controller for Email Deliverability
         *
         * @module index
         *
         * @memberof cpanel.emailDeliverability
         *
         */

        return function() {

            var APP_MODULE_NAME = "cpanel.emailDeliverability";

            var appModules = [
                "ngRoute",
                "ngAnimate",
                "cjt2.cpanel",
                "cjt2.directives.loadingPanel",
                "cjt2.services.alert",
                DomainsService.namespace,
                SafeStringFilter.namespace,
                RouteController.namespace,
                PaginationDecorator.namespace
            ];

            var cjtDependentModules = [
                "cjt/bootstrap"
            ];

            ROUTES.forEach(function(route) {
                appModules.push("shared.emailDeliverability.views." + route.controllerAs);
                cjtDependentModules.push("shared/js/email_deliverability/views/" + route.controllerAs);
            });

            // First create the application
            angular.module(APP_MODULE_NAME, appModules);

            // Then load the application dependencies
            var app = require(cjtDependentModules, function(BOOTSTRAP) {

                var app = angular.module(APP_MODULE_NAME);
                app.value("PAGE", PAGE);
                app.value("ADD_RESOURCE_PANEL", "views/additionalResourcesPanel.ptt");

                app.factory("APIInitializer", function() {

                    var APIInitializer = function() {

                        function _initialize(module, func) {

                            var apiCall = new APIRequest.Class();
                            return apiCall.initialize(module, func);

                        }

                        function _buildBatchCommandItem(module, func, paramsObj) {
                            return JSON.stringify([module, func, paramsObj]);
                        }

                        function _normalizeBatchResult(result) {
                            return result;
                        }

                        this.normalizeBatchResults = _normalizeBatchResult.bind(this);
                        this.init = _initialize.bind(this);
                        this.buildBatchCommandItem = _buildBatchCommandItem.bind(this);

                    };

                    return new APIInitializer();

                });

                app.value("ITEM_LISTER_CONSTANTS", {
                    TABLE_ITEM_BUTTON_EVENT: "TableItemActionButtonEmitted",
                    ITEM_LISTER_UPDATED_EVENT: "ItemListerUpdatedEvent"
                });

                app.value("RECORD_STATUS_CONSTANTS", {
                    VALID: "validRecordStatus",
                    OUT_OF_SYNC: "outOfSyncRecordStatus",
                    MISSING: "missingRecordStatus",
                    TOO_MANY: "tooManyRecordStatus",
                    LOADING: null
                });

                app.config([
                    "$routeProvider",
                    "$animateProvider",
                    function($routeProvider, $animateProvider) {

                        $animateProvider.classNameFilter(/^((?!no-animate).)*$/);

                        ROUTES.forEach(function(route) {
                            $routeProvider.when(route.route, route);
                        });

                        $routeProvider.otherwise({
                            "redirectTo": "/"
                        });

                    }
                ]);

                BOOTSTRAP("#content", APP_MODULE_NAME);

            });

            return app;
        };
    }
);

