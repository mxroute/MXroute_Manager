/*
 * user_manager/directives/issueList.js            Copyright(c) 2015 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false */

define(
    'app/directives/issueList',[
        "angular",
        "cjt/util/locale"
    ],
    function(angular, LOCALE) {

        /**
         * This directive renders a list of issues using a common template.
         * Use the "issues" attribute to bind to an array of issue objects.
         *
         * Example:
         * <cp-issue-list issues="user.issues"></cp-issue-list>
         *
         * Example with an id prefix:
         * <li ng-repeat="user in users">
         *     <span>user.name</span>
         *     <cp-issue-list issues="user.issues" id-prefix="{{ $index }}"></cp-issue-list>
         * </li>
         */
        angular.module("App").directive("cpIssueList", [
            function() {
                var counter = 0;

                return {
                    templateUrl: "directives/issueList.phtml",
                    scope: {
                        issues: "=",  // The model. An array of issue objects.
                        idPrefix: "@" // Optional prefix for the generated IDs.
                    },
                    link: function(scope, elem, attrs) {
                        if (angular.isDefined(scope.issues) && !angular.isArray(scope.issues)) {
                            throw new TypeError("The issues attribute should evaluate to an array of issue objects.");
                        }

                        // Provide an automatically generated prefix if one is not provided.
                        scope.$watch("idPrefix", function(newVal) {
                            if (!newVal && newVal !== 0) {
                                scope.idPrefix = counter++;
                            }
                        });

                        /**
                         * Gets the best title for an issue.
                         * @param  {Object} issue   The issue object.
                         * @return {String}         The full title string for the issue.
                         */
                        scope.getIssueTitle = function(issue) {
                            if (issue.title) {
                                return issue.title;
                            }

                            if (issue.area === "quota") {
                                switch (issue.service) {
                                    case "email":
                                        return (issue.type === "error") ? LOCALE.maketext("Mail Quota Reached:") : LOCALE.maketext("Mail Quota Warning:");
                                    case "ftp":
                                        return (issue.type === "error") ? LOCALE.maketext("[asis,FTP] Quota Reached:") : LOCALE.maketext("[asis,FTP] Quota Warning:");
                                }
                            } else {
                                return (issue.type === "error") ? LOCALE.maketext("Error:") : LOCALE.maketext("Warning:");
                            }
                        };
                    }

                };
            }
        ]);
    }
);

/*
 * user_manager/directives/modelToLowerCase.js     Copyright(c) 2015 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false */

define(
    'app/directives/modelToLowerCase',[
        "angular",
    ],
    function(angular) {

        /**
         * This directive simply adds a parser to transform input into lowercase before saving it to the model.
         *
         * Example: <input ng-model="myModel" model-to-lower-case>
         */
        angular.module("App").directive("modelToLowerCase", [
            function() {

                return {
                    restrict: "A",
                    require: "ngModel",
                    link: function(scope, elem, attrs, ngModel) {
                        ngModel.$parsers.unshift(function(viewVal) {
                            return viewVal.toLocaleLowerCase();
                        });
                    }
                };
            }
        ]);
    }
);

/* global define: false */

define(
    'app/services/userService',[

        // Libraries
        "angular",
        "lodash",
        "jquery",

        // CJT
        "cjt/util/locale",
        "cjt/io/api",
        "cjt/io/uapi-request",
        "cjt/io/uapi", // IMPORTANT: Load the driver so its ready
        "cjt/util/parse",
        "cjt/util/flatObject",

        // Angular components
        "cjt/services/APIService"
    ],
    function(angular, _, $, LOCALE, API, APIREQUEST, APIDRIVER, PARSER, FLAT) {

        // Fetch the current application
        var app = angular.module("App");

        var lastRequest_jqXHR;

        /**
         * Setup the domainlist models API service
         */
        app.factory("userService", [
            "$q",
            "APIService",
            "emailDaemonInfo",
            "ftpDaemonInfo",
            "webdiskDaemonInfo",
            "features",
            "defaultInfo",
            function(
                $q,
                APIService,
                emailDaemonInfo,
                ftpDaemonInfo,
                webdiskDaemonInfo,
                features,
                defaultInfo
            ) {

                /**
                 * Metadata, including a quick lookup of what actions are supported on specific services.
                 */
                var modifiers = {
                    email: {
                        supports: {
                            serviceRunning: emailDaemonInfo.enabled,
                            allowed: features.email,
                            createable: features.email && emailDaemonInfo.enabled,
                            editable: features.email,
                            deletable: features.email,
                            viewable: true
                        },
                        name: "email"
                    },
                    ftp: {
                        supports: {
                            serviceRunning: ftpDaemonInfo.enabled,
                            allowed: features.ftp,
                            createable: features.ftp && ftpDaemonInfo.enabled,
                            editable: features.ftp,
                            deletable: features.ftp,
                            viewable: true
                        },
                        name: "ftp"
                    },
                    webdisk: {
                        supports: {
                            serviceRunning: webdiskDaemonInfo.enabled,
                            allowed: features.webdisk,
                            createable: features.webdisk && webdiskDaemonInfo.enabled,
                            editable: features.webdisk,
                            deletable: features.webdisk,
                            viewable: true
                        },
                        name: "webdisk"
                    }
                };

                /**
                 * Helper method to make adjustment to the user for the application
                 * @param  {Object} user User or Candidate User
                 */
                function decorateUser(user) {
                    user.ui = {};

                    // Set the typeLabel
                    user.typeLabel = typeLabels[user.type];
                }

                /**
                 * Documentation-approved terminology for the different account types.
                 */
                var typeLabels = {
                    service: LOCALE.maketext("Service Account"),
                    hypothetical: LOCALE.maketext("Hypothetical Subaccount"),
                    sub: LOCALE.maketext("Subaccount"),
                    cpanel: LOCALE.maketext("cPanel Account")
                };

                /**
                 * Proper names for the various services.
                 */
                var serviceLabels = {
                    ftp: LOCALE.maketext("FTP"),
                    email: LOCALE.maketext("Email"),
                    webdisk: LOCALE.maketext("Web Disk")
                };

                /**
                 * Build the search keys field from the nested services field.
                 * @param  {Object} user
                 * @return {String}
                 */
                function buildServiceSearchField(user) {
                    var search = [];
                    if (user.services.email.enabled) {
                        search.push("email");
                    }

                    if (user.services.ftp.enabled) {
                        search.push("ftp");
                    }

                    if (user.services.webdisk.enabled) {
                        search.push("webdisk webdav");
                    }
                    return search.join(" ");
                }

                /**
                 * Some account types don't have GUIDs, so we need to make a unique identifier for them.
                 * @param  {Object} user   A user object.
                 * @return {String}        The unique string to be used as the GUID.
                 */
                function _generateGuid(user) {
                    if (user.service) {

                        // Service accounts and merge candidates have this set
                        return (user.full_username + ":" + user.service);
                    } else {
                        return (user.full_username + ":" + user.type);
                    }
                }

                /**
                 * Clean up the service object
                 * @param  {Object} service     Raw server service object.
                 * @param  {Object} modifiers   Additional metadata to be added for this service type.
                 * @return {Object}             Cleanded up and decorated service ready for use in the application.
                 */
                function adjustService(service, modifiers) {
                    service.enabled = PARSER.parsePerlBoolean(service.enabled);
                    service.isNew = !service.enabled;
                    _.extend(service, _.cloneDeep(modifiers));

                    if (angular.isString(service.quota)) {
                        service.quota = PARSER.parseInteger(service.quota);
                    }

                    if (!angular.isUndefined(service.enabledigest)) {
                        service.enabledigest = PARSER.parsePerlBoolean(service.enabledigest);
                    }
                }

                /**
                 * Clean up the user
                 * @param  {Object} user Raw server user object
                 * @return {Object}      Cleaned up user object ready for use in the application.
                 */
                function adjustUser(user) {

                    // Normalize the booleans
                    var services = _.keys(user.services);
                    _.each(services, function(serviceName) {
                        adjustService(user.services[serviceName], modifiers[serviceName]);
                    });

                    user.can_delete         = PARSER.parsePerlBoolean(user.can_delete);
                    user.can_set_quota      = PARSER.parsePerlBoolean(user.can_set_quota);
                    user.can_set_password   = PARSER.parsePerlBoolean(user.can_set_password);
                    user.special            = PARSER.parsePerlBoolean(user.special);
                    user.synced_password    = PARSER.parsePerlBoolean(user.synced_password);
                    user.sub_account_exists = PARSER.parsePerlBoolean(user.sub_account_exists);
                    user.has_siblings       = PARSER.parsePerlBoolean(user.has_siblings);
                    user.dismissed          = PARSER.parsePerlBoolean(user.dismissed);
                    user.has_invite         = PARSER.parsePerlBoolean(user.has_invite);
                    user.has_expired_invite = PARSER.parsePerlBoolean(user.has_expired_invite);

                    // Set the formatted type label
                    user.typeLabel = typeLabels[user.type];

                    // Clean up the candidates
                    if (user.type === "hypothetical" || user.type === "sub") {
                        user.candidate_issues_count = 0;
                        user.serviceSearch = [];

                        if (user.dismissed_merge_candidates) {
                            user.dismissed_merge_candidates.forEach(function(candidate) {
                                angular.forEach(candidate.services, function(service, serviceName) {
                                    adjustService(service, modifiers[serviceName]);
                                    if (service.enabled) {
                                        candidate.service = serviceName;
                                    }
                                });
                            });
                        }

                        for (var j = 0, jl = user.merge_candidates.length; j < jl; j++) {
                            var candidate = user.merge_candidates[j];

                            // Normalize the booleans
                            candidate.can_delete         = PARSER.parsePerlBoolean(candidate.can_delete);
                            candidate.can_set_quota      = PARSER.parsePerlBoolean(candidate.can_set_quota);
                            candidate.can_set_password   = PARSER.parsePerlBoolean(candidate.can_set_password);
                            candidate.sub_account_exists = PARSER.parsePerlBoolean(candidate.sub_account_exists);
                            candidate.has_siblings       = PARSER.parsePerlBoolean(candidate.has_siblings);
                            candidate.dismissed          = PARSER.parsePerlBoolean(candidate.dismissed);

                            for (var serviceName in candidate.services) {
                                if (candidate.services.hasOwnProperty(serviceName)) {
                                    adjustService(candidate.services[serviceName], modifiers[serviceName]);

                                    // Annotate the hypothetical/sub services to match the collected child
                                    // services state to make search easier at the top level.
                                    if (candidate.services[serviceName].enabled) {
                                        user.services[serviceName].enabledInCandidate = true;
                                        candidate.service = serviceName;
                                    }
                                }
                            }

                            if (candidate.issues.length > 0) {
                                user.candidate_issues_count++;
                            }

                            // Set the formatted labels
                            candidate.typeLabel = typeLabels[candidate.type];
                            candidate.serviceLabel = serviceLabels[candidate.service];

                            // Create a synthetic field to make search
                            // by service string work.
                            candidate.serviceSearch = buildServiceSearchField(candidate);
                            user.serviceSearch.push(candidate.serviceSearch);

                            // Candidates are independent service accounts, so they won't have GUIDs
                            candidate.guid = _generateGuid(candidate);
                        }
                    } else if (user.type === "service") {

                        // Provide an easy lookup for the type of service like we do for merge candidates
                        services.some(function(service) {
                            if (user.services[service].enabled) {
                                user.service = service;
                                return true;
                            }
                        });
                    }

                    if (user.guid === null) {
                        user.guid = _generateGuid(user);
                    }

                    // Create a synthetic top level field to make search
                    // by service string work.
                    if (user.serviceSearch) {
                        user.serviceSearch.push( buildServiceSearchField(user) );
                        user.serviceSearch = user.serviceSearch.join(" ");
                    } else {
                        user.serviceSearch = buildServiceSearchField(user);
                    }

                    decorateUser(user);
                    if (user.merge_candidates) {
                        user.merge_candidates.forEach(decorateUser);
                    }

                    return user;
                }

                /**
                 * Extends a consolidated service object and adds additional services from a services
                 * object. These usually come from a user.services property.
                 *
                 * @method _extendConsolidatedServices
                 * @private
                 * @param  {Object}  destination   The consolidated object to extend.
                 * @param  {Object}  source        The services object to incorporate into the destination object.
                 * @param  {Boolean} isDismissed   Set to true if the services object comes from a dismissed merge candidate.
                 * @return {Object}                The destination object.
                 */
                function _extendConsolidatedServices(destination, source, isDismissed) {
                    var services = Object.keys(source);
                    services.some(function(service) {
                        if (source[service].enabled) {
                            destination[service] = source[service];
                            destination[service].isCandidate = true;
                            if (isDismissed) {
                                destination[service].isDismissed = true;
                            }
                            return true;
                        }
                    });
                    return destination;
                }

                /**
                 * Takes the merge_candidates and dismissed_merge_candidates from a user and returns
                 * a consolidated service object with all of the relevant candidate services.
                 *
                 * @method consolidateCandidateServices
                 * @param  {Object} user                The user object to process.
                 * @param  {Boolean} includeDismissed   If true, dismissed_merge_candidates will also be included.
                 * @return {Object}                     The consolidated services object. The object only contains keys for
                 *                                      services that are enabled on the merge candidates, so if there are
                 *                                      no candidates (dismissed or otherwise) with FTP enabled the "ftp"
                 *                                      will not exist at all.
                 */
                function consolidateCandidateServices(user, includeDismissed) {
                    var consolidatedCandidateServices = {};

                    user.merge_candidates.forEach(function(candidate) {
                        _extendConsolidatedServices(consolidatedCandidateServices, candidate.services);
                    });

                    if (includeDismissed) {
                        user.dismissed_merge_candidates.forEach(function(candidate) {
                            _extendConsolidatedServices(consolidatedCandidateServices, candidate.services, true);
                        });
                    }

                    return consolidatedCandidateServices;
                }

                /**
                 * Converts the response to our application data structure
                 * @param  {Object} response
                 * @return {Object} Sanitized data structure.
                 */
                function convertResponseToList(response) {
                    var items = [];
                    if (response.data) {
                        var data = response.data;
                        for (var i = 0, length = data.length; i < length; i++) {
                            var user = adjustUser(data[i]);
                            items.push(user);
                        }

                        var totalItems = response.meta && response.meta.paginate && response.meta.paginate.is_paged ? response.meta.paginate.total_records : data.length;

                        return {
                            items: items,
                            totalItems: totalItems,
                        };
                    } else {
                        return {
                            items: [],
                            totalItems: 0,
                        };
                    }
                }

                // Fields to remove from the user
                // before posting for edit call.
                var NOT_FOR_POST_USER = [
                    "can_delete",
                    "can_set_quota",
                    "can_set_password",
                    "candidate_issues_count",
                    "issues",
                    "serviceSearch",
                    "merge_candidates",
                    "special",
                    "synced_password",
                    "sub_account_exists",
                    "has_siblings",
                    "parent_type",
                    "dismissed",
                    "dismissed_merge_candidates",
                    "has_invite",
                    "has_expired_invite",
                    "name",
                    "isNew"
                ];

                /**
                 * Clean up the user so it can be posted back to the server.
                 * @param  {Object} user
                 * @return {Object}       Cleaned up user.
                 */
                function cleanUserForPost(user) {
                    var tmp = JSON.parse(JSON.stringify(user));
                    NOT_FOR_POST_USER.forEach(function(name) {
                        delete tmp[name];
                    });
                    var services = _.keys(tmp.services);
                    _.each(services, function(service) {
                        if (tmp.services[service].isCandidate) {
                            delete tmp.services[service];
                        } else {
                            tmp.services[service].enabled  = tmp.services[service].enabled ? 1 : 0;
                            if (!angular.isUndefined(tmp.services[service].enabledigest)) {
                                tmp.services[service].enabledigest = tmp.services[service].enabledigest ? 1 : 0;
                            }
                            delete tmp.services[service].supports;
                        }
                    });

                    return FLAT.flatten(tmp);
                }

                /**
                 * Generates an empty user data structure.
                 * @return {Object}
                */
                function _emptyUser() {
                    return {
                        username: "",
                        domain: "",
                        real_name: "",
                        alternate_email: "",
                        phone_number: "",
                        avatar_url: "",
                        services: {
                            email: {
                                name: modifiers.name,
                                enabled: false,
                                isNew: true,
                                quota: defaultInfo.email.default_value,
                                quotaUnit: "MB",
                                supports: modifiers.email.supports
                            },
                            ftp: {
                                name: modifiers.name,
                                enabled: false,
                                isNew: true,
                                quota: defaultInfo.ftp.default_value,
                                quotaUnit: "MB",
                                homedir: "public_html/",
                                supports: modifiers.ftp.supports
                            },
                            webdisk: {
                                name: modifiers.name,
                                enabled: false,
                                isNew: true,
                                homedir: "public_html/",
                                perms: "rw",
                                supports: modifiers.webdisk.supports,
                                enabledigest: false
                            }
                        }
                    };
                }


                /**
                 * Back fill the missing components for the user.
                 *
                 * @param  {Object} user User as it exists on the backend.
                 * @return {Object}      User with missing fields added and updated as needed.
                 */
                function _backfillUser(user) {
                    var u = _emptyUser();
                    $.extend(true, u, user);

                    if (!u.services.ftp.enabled) {
                        u.services.ftp.homedir += u.domain + "/" + u.username;
                    }
                    if (!u.services.webdisk.enabled) {
                        u.services.webdisk.homedir += u.domain + "/" + u.username;
                    }
                    return u;
                }

                // Set up the service's constructor and parent
                var UserListService = function() {};
                UserListService.prototype = new APIService();

                // Extend the prototype with any class-specific functionality
                angular.extend(UserListService.prototype, {

                    /**
                     * Generates an empty user data structure.
                     * @return {Object}
                     *    {string} username
                     *    {string} domain
                     *    {string} real_name
                     *    {string} alternate_email
                     *    {string} phone_number
                     *    {string} avatar_url
                     *    {Object} services
                     *        {Object} email
                     *            {Boolean} enabled - true if the user has an email account associated, false otherwise
                     *            {Number}  quota   - 0 for unlimited, otherwise in megabytes
                     *        {Object} ftp
                     *            {Boolean} enabled - true if the user has an ftp account associated, false otherwise
                     *            {Number}  quota   - 0 for unlimited, otherwise in megabytes
                     *            {String}  homedir - directory where ftp user files are stored.
                     *        {Object} webdisk
                     *            {Boolean} enabled - true if the user has an webdisk account associated, false otherwise
                     *            {String}  homedir - directory where webdisk user files are stored.
                     *            {???}     perms   - ??? RO, RW ???
                     */
                    emptyUser: _emptyUser,

                    /**
                     * Back fill the missing components for the user.
                     *
                     * @param  {Object} user User as it exists on the backend.
                     * @return {Object}      User with missing fields added and updated as needed.
                     */
                    backfillUser: _backfillUser,

                    /**
                     * Get a list domains that match the selection criteria passed in meta parameter
                     *
                     * @param {boolean} flat if true will flatten hypothetical users, if false will render hypothetical users.
                     * @param {object} meta Optional meta data to control sorting, filtering and paging
                     *   @param {string} meta.sortBy Name of the field to sort by
                     *   @param {string} meta.sortDirection asc or desc
                     *   @param {string} meta.sortType Optional name of the sort rule to apply to the sorting
                     *   @param {string} meta.filterBy Name of the filed to filter by
                     *   @param {string} meta.filterCompare Optional comparator to use when comparing for filter.
                     *   If not provided, will default to ???.
                     *   May be one of:
                     *       TODO: Need a list of valid filter types.
                     *   @param {string} meta.filterValue  Expression/argument to pass to the compare method.
                     *   @param {string} meta.pageNumber Page number to fetch.
                     *   @param {string} meta.pageSize Size of a page, will default to 10 if not provided.
                     * @return {Promise} Promise that will fulfill the request.
                     */
                    fetchList: function(flat, meta) {
                        meta = meta || {};


                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("UserManager", "list_users");
                        apiCall.addArgument("flat", flat ? 1 : 0);

                        if (meta.sortBy) {
                            meta.sortDirection = meta.sortDirection || "asc";
                            apiCall.addSorting(meta.sortBy, meta.sortDirection, meta.sortType);
                        }

                        var deferred = this.deferred(apiCall, {
                            transformAPISuccess: convertResponseToList
                        });

                        // pass the promise back to the controller
                        return deferred.promise;
                    },

                    /**
                     * Fetch a single user by its guid.
                     *
                     * @param  {String} guid Unique identifier for the user
                     * @return {Promise}     Promise that will fulfill the request for this user.
                     */
                    fetchUser: function(guid) {
                        var apiCall = new APIREQUEST.Class();

                        // TODO: Replace with a more efficient single lookup call.
                        apiCall.initialize("UserManager", "lookup_user");
                        apiCall.addArgument("guid", guid);

                        var deferred = this.deferred(apiCall, {
                            transformAPISuccess: function(response) {

                                // The lookup_user api returns the matching user in the response, so we can
                                // clean it up and send it back to the promise handlers.
                                response.data = _backfillUser(adjustUser(response.data));
                                response.data.candidate_services = consolidateCandidateServices(response.data, true);
                                return response.data;
                            }
                        });

                        // pass the promise back to the controller
                        return deferred.promise;
                    },

                    /**
                     * Fetch a single service account by its type and full username (user@domain)
                     * @param  {String} type          email, ftp, webdisk
                     * @param  {String} full_username user@domain
                     * @return {Promise}              Promise that will fulfill the request for the service account.
                     */
                    fetchService: function(type, full_username) {
                        var apiCall = new APIREQUEST.Class();

                        // TODO: Replace with a more efficient single lookup call.
                        apiCall.initialize("UserManager", "lookup_service_account");
                        apiCall.addArgument("type", type);
                        apiCall.addArgument("full_username", full_username);

                        var deferred = this.deferred(apiCall, {
                            transformAPISuccess: function(response) {

                                // The lookup_user api returns the matching user in the response, so we can
                                // clean it up and send it back to the promise handlers.
                                return _backfillUser(adjustUser(response.data));
                            }
                        });

                        // pass the promise back to the controller
                        return deferred.promise;
                    },

                    /**
                     * Delete a user/service account from the system.
                     * @param  {Object} user As returned by the fetchList() api.
                     * @return {Promise}     Promise that will fulfill the request.
                     */
                    delete: function(user) {
                        var apiCall;
                        var promise;

                        if ("sub" === user.type) {
                            apiCall = new APIREQUEST.Class();
                            apiCall.initialize("UserManager", "delete_user");
                            apiCall.addArgument("username", user.username);
                            apiCall.addArgument("domain", user.domain);
                            var deferred = this.deferred(apiCall, {
                                transformAPISuccess: function(response) {
                                    if (response.data) {
                                        response.data = adjustUser(response.data);
                                    }
                                    return response;
                                }
                            } );
                            promise = deferred.promise;

                        } else if ("service" === user.type) {
                            if (user.services.email.enabled) {
                                apiCall = new APIREQUEST.Class();
                                apiCall.initialize("Email", "delete_pop");
                                apiCall.addArgument("email", user.full_username);
                                promise = this.deferred(apiCall).promise;

                            } else if (user.services.ftp.enabled) {
                                apiCall = new APIREQUEST.Class();
                                apiCall.initialize("Ftp", "delete_ftp");
                                apiCall.addArgument("user", user.full_username);
                                apiCall.addArgument("destroy", 0);
                                promise = this.deferred(apiCall).promise;
                            } else if (user.services.webdisk.enabled) {
                                apiCall = new APIREQUEST.Class();
                                apiCall.initialize("WebDisk", "delete_user");
                                apiCall.addArgument("user", user.full_username);
                                apiCall.addArgument("destroy", 0);
                                promise = this.deferred(apiCall).promise;
                            } else {
                                promise = $q(function(resolve, reject) {
                                    reject(LOCALE.maketext("The system could not determine the service type for the “[_1]” service account.", user.full_username));
                                });
                            }
                        } else {
                            promise = $q(function(resolve, reject) {
                                reject(LOCALE.maketext("The system could not delete the “[_1]” account. You cannot delete the “[_2]” account type.", user.full_username, user.type));
                            });
                        }

                        // pass the promise back to the controller
                        return promise;

                    },

                    /**
                     * Performs the link and dismiss operations on any merge candidate services
                     * that have been flagged with willLink or willDismiss.
                     *
                     * @method linkAndDismiss
                     * @param  {Object} user         The user whose candidate services will be processed.
                     * @param  {Object} [services]   Optional. Alternative services object to use instead of
                     *                               user.services for the case where you want to link and
                     *                               dismiss based on the services object from a view model
                     *                               instead of an actual user model returned from the server.
                     * @return {Promise}             Resolves with the user as returned from the server.
                     *                               Rejects with an object instead of just the error message to
                     *                               provide context as to which call (link or dismiss) failed.
                     */
                    linkAndDismiss: function(user, services) {

                        // Gather lists of all services to be linked/dismissed
                        var dismissedServices = [];
                        var linkedServices = [];

                        angular.forEach((services || user.services), function(service, serviceName) {
                            if (!service.isCandidate) {
                                return;
                            } else if (service.willLink && service.willDismiss) {
                                throw "Developer Error: You cannot link and dismiss the same service account.";
                            } else if (service.willLink) {
                                linkedServices.push(serviceName);
                            } else if (service.willDismiss) {
                                dismissedServices.push(serviceName);
                            }
                        });

                        // Multiple links can be combined, as can multiple dismissals, so we'll have a max of 2 discrete API calls.
                        var apiCall, promise;
                        var promises = [];

                        // Dispatch the link API call
                        if (linkedServices.length) {
                            apiCall = new APIREQUEST.Class();
                            apiCall.initialize("UserManager", "merge_service_account");
                            apiCall.addArgument("username", user.username);
                            apiCall.addArgument("domain", user.domain);
                            linkedServices.forEach(function(serviceName) {
                                apiCall.addArgument("services." + serviceName + ".merge", 1);
                            });

                            promise = this.deferred(apiCall, {
                                transformAPISuccess: function(response) {
                                    return adjustUser(response.data);
                                },
                                transformAPIFailure: function(response) {
                                    return {
                                        error: response.error,
                                        call: "link"
                                    };
                                }
                            }).promise;
                            promises.push(promise);
                        }

                        // Dispatch the dismiss API call
                        if (dismissedServices.length) {
                            apiCall = new APIREQUEST.Class();
                            apiCall.initialize("UserManager", "dismiss_merge");
                            apiCall.addArgument("username", user.username);
                            apiCall.addArgument("domain", user.domain);
                            dismissedServices.forEach(function(serviceName) {
                                apiCall.addArgument("services." + serviceName + ".dismiss", 1);
                            });

                            promise = this.deferred(apiCall, {
                                transformAPISuccess: function(response) {
                                    return response.data;
                                },
                                transformAPIFailure: function(response) {
                                    return {
                                        error: response.error,
                                        call: "link"
                                    };
                                }
                            }).promise;
                            promises.push(promise);
                        }

                        var self = this;
                        return $q.all(promises).then(function(results) {
                            if (!results.length) {

                                // Nothing was done, so just return the original user.
                                return user;
                            } else {

                                // We can't be sure which user is the most up to date, so we'll just fetch it again.
                                return self.fetchUser(user.guid).then(function(fetchedUser) {
                                    fetchedUser.dismissed_services = dismissedServices;
                                    fetchedUser.linked_services = linkedServices;
                                    return fetchedUser;
                                });
                            }
                        }).catch(function(error) {
                            return $q(function(resolve, reject) {
                                self.fetchUser(user.guid).then(function(fetchedUser) {
                                    error.user = fetchedUser;
                                    reject(error);
                                });
                            });
                        });
                    },

                    /**
                     * Create a user on the backend.
                     * @param  {Object} user Definition of the user to be created.
                     * @return {Promise}     When fulfilled, will have created the user or returned an error.
                     */
                    create: function(user) {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("UserManager", "create_user");
                        apiCall.addArgument("username", user.username);
                        apiCall.addArgument("domain", user.domain);
                        apiCall.addArgument("real_name", user.fullName);
                        apiCall.addArgument("alternate_email", user.recoveryEmail);

                        // If we're using the invite system, there's no need for a password. And vice-versa.
                        if (user.sendInvite) {
                            apiCall.addArgument("send_invite", 1);
                        } else {
                            apiCall.addArgument("password", user.password);
                        }

                        if (features.email && !user.services.email.isCandidate) {
                            apiCall.addArgument("services.email.enabled", user.services.email.enabled ? 1 : 0);
                            apiCall.addArgument("services.email.quota", user.services.email.quota);
                        }

                        if (features.ftp && !user.services.ftp.isCandidate) {
                            apiCall.addArgument("services.ftp.enabled", user.services.ftp.enabled ? 1 : 0);
                            if (ftpDaemonInfo.supports.quota) {
                                apiCall.addArgument("services.ftp.quota", user.services.ftp.quota);
                            }
                            apiCall.addArgument("services.ftp.homedir", user.services.ftp.homedir);
                        }

                        if (features.webdisk && !user.services.webdisk.isCandidate) {
                            apiCall.addArgument("services.webdisk.enabled", user.services.webdisk.enabled ? 1 : 0);
                            apiCall.addArgument("services.webdisk.homedir", user.services.webdisk.homedir);
                            apiCall.addArgument("services.webdisk.perms", user.services.webdisk.perms);
                            apiCall.addArgument("services.webdisk.enabledigest", user.services.webdisk.enabledigest ? 1 : 0);
                        }

                        var self = this;
                        return this.deferred(apiCall, {
                            transformAPISuccess: function(response) {

                                // The create api returns the new user in the response, so we can
                                // clean it up and send it back to the promise handlers.
                                return adjustUser(response.data);
                            }
                        }).promise.then(function(createResponse) {
                            return self.linkAndDismiss(createResponse, user.services);
                        });
                    },

                    /**
                     * Edit an existing user.
                     * @param  {Object} user Definition of the user to be modified.
                     * @return {Promise}     When fulfilled, will have modified the user or returned an error.
                     */
                    edit: function(user) {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("UserManager", "edit_user");
                        var cleanUser = cleanUserForPost(user);
                        for (var attribute in cleanUser) {
                            if (cleanUser.hasOwnProperty(attribute)) {
                                apiCall.addArgument(attribute, cleanUser[attribute]);
                            }
                        }

                        var deferred = this.deferred(apiCall, {
                            transformAPISuccess: function(response) {

                                // The edit api returns the new user in the response, so we can
                                // clean it up and send it back to the promise handlers.
                                return adjustUser(response.data);
                            }
                        });

                        return deferred.promise;
                    },

                    /**
                     * Edit the settings for an independent service account.
                     * @param  {Object} user              The desired end state of the account.
                     * @param  {Object} originalService   The original service configuration.
                     * @return {Promise}                  Resolves when the edit is succuessful. Rejects otherwise.
                     */
                    editService: function(user, originalService) {
                        var apiCall,
                            promise,
                            promises = [];

                        // Email
                        if (user.services.email.enabled) {
                            if (user.services.email.quota !== originalService.quota) {
                                apiCall = new APIREQUEST.Class();
                                apiCall.initialize("Email", "edit_pop_quota");
                                apiCall.addArgument("email", user.username);
                                apiCall.addArgument("domain", user.domain);
                                apiCall.addArgument("quota", user.services.email.quota);
                                promise = this.deferred(apiCall).promise;
                                promises.push(promise);
                            }
                            if (user.password) {
                                apiCall = new APIREQUEST.Class();
                                apiCall.initialize("Email", "passwd_pop");
                                apiCall.addArgument("email", user.username);
                                apiCall.addArgument("domain", user.domain);
                                apiCall.addArgument("password", user.password);
                                promise = this.deferred(apiCall).promise;
                                promises.push(promise);
                            }
                        } else if (user.services.ftp.enabled) { // Ftp
                            if (user.services.ftp.quota !== originalService.quota) {
                                apiCall = new APIREQUEST.Class();
                                apiCall.initialize("Ftp", "set_quota");
                                apiCall.addArgument("user", user.username);
                                apiCall.addArgument("domain", user.domain);
                                apiCall.addArgument("quota", user.services.ftp.quota);
                                promise = this.deferred(apiCall).promise;
                                promises.push(promise);
                            }
                            if (user.services.ftp.homedir !== originalService.homedir) {
                                apiCall = new APIREQUEST.Class();
                                apiCall.initialize("Ftp", "set_homedir");
                                apiCall.addArgument("user", user.username);
                                apiCall.addArgument("domain", user.domain);
                                apiCall.addArgument("homedir", user.services.ftp.homedir);
                                promise = this.deferred(apiCall).promise;
                                promises.push(promise);
                            }
                            if (user.password) {
                                apiCall = new APIREQUEST.Class();
                                apiCall.initialize("Ftp", "passwd");
                                apiCall.addArgument("user", user.username);
                                apiCall.addArgument("domain", user.domain);
                                apiCall.addArgument("pass", user.password);
                                promise = this.deferred(apiCall).promise;
                                promises.push(promise);
                            }
                        } else if (user.services.webdisk.enabled) { // Web Disk
                            if (user.services.webdisk.homedir !== originalService.homedir) {
                                apiCall = new APIREQUEST.Class();
                                apiCall.initialize("WebDisk", "set_homedir");
                                apiCall.addArgument("user", user.full_username);
                                apiCall.addArgument("homedir", user.services.webdisk.homedir);
                                promise = this.deferred(apiCall).promise;
                                promises.push(promise);
                            }
                            if (user.services.webdisk.perms !== originalService.perms) {
                                apiCall = new APIREQUEST.Class();
                                apiCall.initialize("WebDisk", "set_permissions");
                                apiCall.addArgument("user", user.full_username);
                                apiCall.addArgument("perms", user.services.webdisk.perms);
                                promise = this.deferred(apiCall).promise;
                                promises.push(promise);
                            }
                            if (user.password) {
                                apiCall = new APIREQUEST.Class();
                                apiCall.initialize("WebDisk", "set_password");
                                apiCall.addArgument("user", user.full_username);
                                apiCall.addArgument("password", user.password);
                                apiCall.addArgument("enabledigest", user.services.webdisk.enabledigest ? 1 : 0);
                                promise = this.deferred(apiCall).promise;
                                promises.push(promise);
                            }
                            if (!user.password && (user.services.webdisk.enabledigest !== originalService.enabledigest)) {

                                // TODO: We don't have a way to do this at this time without the password.
                                apiCall = new APIREQUEST.Class();

                                // promise = this.deferred(apiCall).promise;
                                // promises.push(promise);
                            }
                        } else { // Fallback
                            promise = $q(function(resolve, reject) {
                                reject(LOCALE.maketext("The system detected an unknown service for the “[_1]” service account.", user.full_username));
                            });
                            promises.push(promise);
                        }

                        return $q.all(promises);
                    },

                    /**
                     *  Helper method that calls convertResponseToList to prepare the data structure
                     * @param  {Object} response
                     * @return {Object} Sanitized data structure.
                     */
                    prepareList: function(response) {
                        if (response.status) {
                            return convertResponseToList(response);
                        } else {
                            throw response.errors;
                        }
                    },

                    /**
                     * Link a service account to a sub-account of the same name.
                     * @param  {Object}  user          Definition of the service account to be linked.
                     * @param  {String}  [type]        Name of the one service we want. If missing will link all enabled services.
                     * @param  {Boolean} [forceLink]   Forces a link, even if the service is not enabled on the user object. You
                     *                                 must provide a type to use this.
                     * @return {Promise}               When fulfilled, will have linked the service account or returned an error.
                     */
                    link: function(user, type, forceLink) {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("UserManager", "merge_service_account");
                        apiCall.addArgument("username", user.username);
                        apiCall.addArgument("domain", user.domain);
                        if (type) {
                            if (user.services[type].enabled || forceLink) {
                                apiCall.addArgument("services." + type + ".merge", 1);
                            }
                        } else {
                            for (var serviceName in user.services) {
                                if ( user.services.hasOwnProperty(serviceName) &&
                                     user.services[serviceName].enabled
                                ) {
                                    apiCall.addArgument("services." + serviceName + ".merge", 1);
                                }
                            }
                        }

                        var deferred = this.deferred(apiCall, {
                            transformAPISuccess: function(response) {
                                return adjustUser(response.data);
                            }
                        });

                        return deferred.promise;
                    },

                    /**
                     * Unlink a service account from a sub-account.
                     *
                     * @method unlink
                     * @param  {Object} user Definition of the subaccount from which to unlink a service
                     * @param  {String} serviceType The name of the service to unlink
                     * @return {Promise}     When fulfilled, will have linked the service account or returned an error.
                     */
                    unlink: function(user, serviceType) {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("UserManager", "unlink_service_account");
                        apiCall.addArgument("username", user.username);
                        apiCall.addArgument("domain", user.domain);
                        apiCall.addArgument("service", serviceType);
                        apiCall.addArgument("dismiss", true);

                        // NOTE: This api needs to return a list including both the modified user and
                        // the now independent service as if it were dismissed.
                        var deferred = this.deferred(apiCall, {
                            transformAPISuccess: convertResponseToList
                        });

                        return deferred.promise;
                    },


                    /**
                     * Link all merge candidate service accounts of a sub-account (real or hypothetical).
                     * @param  {Object} subAccount Definition of the sub-account whose merge candidates should be linked.
                     * @return {Promise}           When fulfilled, will have linked the service account(s) or returned an error.
                     */
                    linkAll: function(subAccount) {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("UserManager", "merge_service_account");
                        apiCall.addArgument("username", subAccount.username);
                        apiCall.addArgument("domain", subAccount.domain);

                        for (var i = 0, l = subAccount.merge_candidates.length; i < l; i++) {
                            var serviceAccount = subAccount.merge_candidates[i];
                            for (var serviceName in serviceAccount.services) {
                                if ( serviceAccount.services.hasOwnProperty(serviceName) &&
                                     serviceAccount.services[serviceName].enabled
                                ) {
                                    var arg = "services." + serviceName + ".merge";
                                    apiCall.addArgument(arg, true);
                                }
                            }
                        }

                        var deferred = this.deferred(apiCall, {
                            transformAPISuccess: function(response) {
                                return adjustUser(response.data);
                            }
                        });

                        return deferred.promise;
                    },

                    /**
                     * Dismiss a link operation for an individual service account.
                     * @param  {Object} user Definition of the service account to be linked.
                     * @return {Promise}     When fulfilled, will have dismissed the service account from the merge candidates list.
                     */
                    dismissLink: function(user) {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("UserManager", "dismiss_merge");
                        apiCall.addArgument("username", user.username);
                        apiCall.addArgument("domain", user.domain);
                        for (var serviceName in user.services) {
                            if ( user.services.hasOwnProperty(serviceName) &&
                                 user.services[serviceName].enabled
                            ) {
                                var arg = "services." + serviceName + ".dismiss";
                                apiCall.addArgument(arg, true);
                            }
                        }

                        var deferred = this.deferred(apiCall, {
                            transformAPISuccess: function(response) {
                                return response.data;
                            }
                        });

                        return deferred.promise;
                    },

                    /**
                     * Dismiss all merge candidate service accounts of a sub-account (real or hypothetical).
                     * @param  {Object} subAccount Definition of the sub-account whose merge candidates should be dismissed.
                     * @return {Promise}           When fulfilled, will have dismissed the service account(s) or returned an error.
                     */
                    dismissAll: function(subAccount) {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("UserManager", "dismiss_merge");
                        apiCall.addArgument("username", subAccount.username);
                        apiCall.addArgument("domain", subAccount.domain);

                        for (var i = 0, l = subAccount.merge_candidates.length; i < l; i++) {
                            var serviceAccount = subAccount.merge_candidates[i];
                            for (var serviceName in serviceAccount.services) {
                                if ( serviceAccount.services.hasOwnProperty(serviceName) &&
                                     serviceAccount.services[serviceName].enabled
                                ) {
                                    var arg = "services." + serviceName + ".dismiss";
                                    apiCall.addArgument(arg, true);
                                }
                            }
                        }

                        var deferred = this.deferred(apiCall, {
                            transformAPISuccess: function(response) {
                                return response.data;
                            }
                        });

                        return deferred.promise;
                    },

                    /**
                     * Check for the presence of any existing accounts with the same name.
                     * The data returned when the promise is fulfilled matches the structure
                     * returned by UAPI UserManager::check_account_conflicts (see API documentation).
                     *
                     * @param  {String} fullUsername The full user@domain name to check for.
                     * @return {Promise}             When fulfilled, will have a response about whether a conflicting user exists.
                     */
                    checkAccountConflicts: function(fullUsername) {

                        /* If the user continues typing in the box before an existing query has finished,
                         * abort it before starting a new one. */
                        if (lastRequest_jqXHR) {
                            lastRequest_jqXHR.abort();
                        }

                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("UserManager", "check_account_conflicts");
                        apiCall.addArgument("full_username", fullUsername);

                        var deferred = this.deferred(apiCall, {
                            transformAPISuccess: function(response) {
                                if (response.data.accounts) {
                                    response.data.accounts = adjustUser(response.data.accounts);
                                    response.data.accounts.candidate_services = consolidateCandidateServices(response.data.accounts, true);
                                }
                                return response.data;
                            }
                        });

                        return $q(function(resolve, reject) {
                            deferred.promise.then(
                                function(data) {
                                    if (data.conflict) { // convert the API true/false response into a promise compatible with async validation
                                        reject( LOCALE.maketext("The username is not available.") );
                                    } else {
                                        resolve(data);
                                    }
                                },
                                function(error) {
                                    reject( LOCALE.maketext("The system failed to determine whether the username is available: [_1]", error ) );
                                }
                            );
                        });
                    },

                    /**
                     * Integrates the candidate_services values from one user into another user's actual services key.
                     *
                     * @method integrateCandidateServices
                     * @param  {Object} dest   The destination user object whose services property will be populated with
                     *                         the candidate services from the source user.
                     * @param  {Object} src    The source user object whose candidate_services property value will be
                     *                         assimilated into the appropriate service objects of the destination user.
                     * @return {Object}        The processed destination user.
                     */
                    integrateCandidateServices: function(dest, src) {
                        var candidateServices = (src && src.candidate_services) || {};
                        var services = dest.services;
                        var self = this;

                        angular.forEach(services, function(service, serviceName) {
                            if (candidateServices[serviceName]) {
                                services[serviceName] = candidateServices[serviceName];
                            } else if (services[serviceName].isCandidate) {

                                // If the previous service model was from a merge candidate, then
                                // it would be nice to start with a fresh set of defaults.
                                services[serviceName] = self.emptyUser().services[serviceName];
                            }
                        });

                        return dest;
                    },

                    /**
                     * Takes a subaccount user object and returns an array representing all of the user items for
                     * that particular full_username that would be included in the entire nested list of users.
                     *
                     * @method expandDismissed
                     * @param  {Object} user             The subaccount user object to process.
                     * @param  {Boolean} onlyDismissed   If true, only the dismissed accounts will be included in
                     *                                   the returned array.
                     * @return {Array}                   An array of all dismissed service account user objects and,
                     *                                   optionally, the subaccount user.
                     */
                    expandDismissed: function(user, onlyDismissed) {
                        var ret = onlyDismissed ? [] : [user];

                        if (angular.isArray(user.dismissed_merge_candidates)) {
                            return ret.concat( user.dismissed_merge_candidates.map(adjustUser) );
                        } else {
                            throw new TypeError("Developer Error: dismissed_merge_candidates must be an array.");
                        }
                    },

                    /* override sendRequest from APIService to also save our last jqXHR object */
                    sendRequest: function(apiCall, handlers, deferred) {
                        apiCall = new APIService.AngularAPICall(apiCall, handlers, deferred);

                        lastRequest_jqXHR = apiCall.jqXHR;

                        return apiCall.deferred;
                    },

                    addInvitationIssues: function(user) {
                        if (user.has_invite) {
                            if (user.has_expired_invite) {
                                user.issues.unshift({
                                    type: "error",
                                    title: LOCALE.maketext("Invite Expired") + ":",
                                    message: LOCALE.maketext("This user did not respond to the invitation before it expired. Please delete and re-create the user to send another invitation or set the user’s password yourself.")
                                });
                            } else {
                                user.issues.unshift({
                                    type: "info",
                                    title: LOCALE.maketext("Invite Pending") + ":",
                                    message: LOCALE.maketext("This user has not used the invitation to set a password.")
                                });
                            }
                        }
                    }
                });

                return new UserListService();
            }
        ]);
    }
);

/*
# security/mod_security/views/domainlistController.js Copyright(c) 2014 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false, PAGE: true */
/* jshint -W100 */

define(
    'app/views/listController',[
        "angular",
        "lodash",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/directives/alertList",
        "cjt/services/alertService",
        "cjt/directives/disableAnimations",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/validationItemDirective",
        "cjt/directives/spinnerDirective",
        "cjt/directives/autoFocus",
        "cjt/directives/lastItem",
        "cjt/filters/wrapFilter",
        "cjt/filters/breakFilter",
        "cjt/services/dataCacheService",
        "app/directives/issueList",
        "app/directives/modelToLowerCase",
        "app/services/userService"
    ],
    function(angular, _, LOCALE) {

        // Retrieve the current application
        var app = angular.module("App");

        // Setup the controller
        var controller = app.controller(
            "listController", [
                "$scope",
                "$routeParams",
                "$q",
                "$location",
                "$filter",
                "$timeout",
                "userService",
                "spinnerAPI",
                "alertService",
                "wrapFilter",
                "dataCache",
                "features",
                "quotaInfo",
                function(
                    $scope,
                    $routeParams,
                    $q,
                    $location,
                    $filter,
                    $timeout,
                    userService,
                    spinnerAPI,
                    alertService,
                    wrapFilter,
                    dataCache,
                    features,
                    quotaInfo
                ) {

                    /**
                     * Initialize the scope variables
                     *
                     * @private
                     * @method _initializeScope
                     */
                    var _initializeScope = function() {
                        $scope.showAdvancedSettings = false;
                        $scope.alerts = alertService.getAlerts();
                        $scope.isOverQuota = !quotaInfo.under_quota_overall;

                        $scope.openConfirmation = null;

                        $scope.advancedFilters = {
                            services: "all",
                            issues: "both",
                            showLinkable: true // Linkable service accounts shown in hypothetical users.
                        };

                        // Setup the installed bit...
                        $scope.hasFeature  = PAGE.hasFeature;

                        if (!$scope.hasFeature) {
                            return;
                        }

                        // setup data structures for the view
                        $scope.userList = [];
                        $scope.filteredUserList = [];
                        $scope.totalItems = 0;
                        $scope.meta = {
                            sortDirection: $routeParams.sortDirection || "asc",
                            sortBy: $routeParams.sortBy || "full_username",
                            sortType: $routeParams.sortType,

                            // NOTE: We don't want to use server side paging so, don't
                            // use these in the to the service layers list calls...
                            pageSize: $routeParams.pageSize || 50,
                            pageNumber: $routeParams.pageNumber || 1,
                            pageSizes: [10, 50, 100, 200],
                        };

                        $scope.features = features;

                        $scope.filteredTotalItems = 0;
                        $scope.filteredUsers = [];
                    };

                    /**
                     * Initialize the view
                     *
                     * @private
                     * @method _initializeView
                     */
                    var _initializeView = function() {
                        var results;

                        if ($scope.isOverQuota) {
                            alertService.clear();
                            alertService.add({
                                message: LOCALE.maketext("Your [asis,cPanel] account exceeds its disk quota. You cannot add or edit users."),
                                type: "danger",
                                id: "over-quota-warning",
                                replace: false,
                                counter: false
                            });
                        }

                        // check for page data in the template if this is a first load
                        if (app.firstLoad.userList && PAGE.userList) {
                            app.firstLoad.userList = false;
                            try {

                                // Repackage the prefetch data
                                results = userService.prepareList(PAGE.userList);

                                // Allow the original list to garbage collect since
                                // we have already got what we need from it.
                                PAGE.userList = null;

                                // Stash a reference to the full list for later
                                dataCache.set("userList", results.items);

                                // Save it in scope
                                $scope.userList = dataCache.get("userList");
                                $scope.totalItems = $scope.userList.length;
                            } catch (e) {
                                alertService.clear();
                                var errors = e;
                                if (!angular.isArray(errors)) {
                                    errors = [errors];
                                }
                                errors.forEach(function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error.toString(),
                                        id: "fetchError"
                                    });
                                });
                            }
                        } else {

                            // Check to see if the other view asked to suppress the fetch (and if the cache is actually available).
                            if ($location.search().loadFromCache && ( $scope.userList = dataCache.get("userList") ) ) {
                                $scope.totalItems = $scope.userList.length;
                                $scope.filteredTotalItems = $scope.userList.length; // since no filter yet
                            } else {

                                // Otherwise, retrieve it via ajax
                                $scope.fetch(!$scope.advancedFilters.showLinkable);
                            }
                        }

                        $scope.filteredData = false;

                        // Run anything chained in a separate cycle so it does
                        // not hold up page drawing.
                        return $timeout(function() {
                            updateUI(true);
                        }, 5);
                    };

                    /**
                     * Generate the viewable list of users by processing all the filtering
                     * and sorting in an unobserved set of arrays.
                     *
                     * @private
                     * @method updateUI
                     * @param  {Boolean} shouldRunFilters   If true, the user's filters will be processed,
                     *                                      otherwise it's just pagination processing.
                     */
                    function updateUI(shouldRunFilters) {

                        if (!$scope.userList) {
                            return;
                        }

                        spinnerAPI.start("loadingSpinner");

                        // Run this in a separate cycle so the UI can actually start
                        // the spinner.
                        $timeout(function() {
                            $scope.totalItems = $scope.userList.length;

                            // First filter the records down to the ones needed for this view.
                            var filteredUsers;
                            if (!shouldRunFilters) {
                                if ($scope.filteredData) {
                                    filteredUsers = $scope.filteredUsers;
                                } else {
                                    filteredUsers = $scope.userList;
                                }
                            } else {
                                var filterFilter = $filter("filter");
                                filteredUsers = filterFilter($scope.userList, $scope.filterText);
                                filteredUsers = filterFilter(filteredUsers, $scope.filterAdvanced);
                                $scope.filteredData = true;
                            }

                            // Now calculate the pagination
                            var startIndex = $scope.meta.pageSize * ($scope.meta.pageNumber - 1);
                            var endIndex   = ($scope.meta.pageSize * $scope.meta.pageNumber);
                            var lastPage   = false;
                            if (endIndex > filteredUsers.length) {
                                lastPage = true;
                            }

                            // Now attach to the view
                            $scope.filteredTotalItems = filteredUsers.length;
                            $scope.filteredUsers = filteredUsers;

                            if (filteredUsers.length < $scope.meta.pageSize) {
                                $scope.pagedFilteredUser = filteredUsers;
                            } else {
                                if (!lastPage) {

                                    // Just the page we are looking for
                                    $scope.pagedFilteredUser = filteredUsers.slice(startIndex, endIndex);
                                } else {

                                    // Everything else
                                    $scope.pagedFilteredUser = filteredUsers.slice(startIndex);
                                }
                            }

                            var lastPageTotalItems = $scope.pageTotalItems;
                            $scope.pageTotalItems = filteredUsers.length;
                            if ($scope.pageTotalItems === 0 ||                  // No records
                                lastPageTotalItems === filteredUsers.length) {  // No change in count
                                spinnerAPI.stop("loadingSpinner");
                            }

                            // Hide the initial loading panel if its still showing
                            $scope.hideViewLoadingPanel();
                        }, 5);
                    }

                    /**
                     * Called when the last row is inserted to stop the loading spinner
                     *
                     * @scope
                     * @method doneRendering
                     * @param  {Object} user Just for debugging
                     */
                    $scope.doneRendering = function(user) {
                        spinnerAPI.stop("loadingSpinner");
                    };

                    /**
                     * Navigate to the edit screen for the specified user or service
                     *
                     * @scope
                     * @method edit
                     * @param  {Object} user
                     */
                    $scope.edit = function(user) {
                        if ($scope.isOverQuota) {
                            return false;
                        }

                        if (user.type === "sub") {
                            $scope.loadView("edit/subaccount/" + user.guid, {}, { clearAlerts: true });
                        } else if (user.type === "service") {
                            var serviceType;
                            if (user.services.email && user.services.email.enabled) {
                                serviceType = "email";
                            } else if (user.services.ftp && user.services.ftp.enabled) {
                                serviceType = "ftp";
                            } else if (user.services.webdisk &&  user.services.webdisk.enabled) {
                                serviceType = "webdisk";
                            } else {
                                alertService.clear();
                                alertService.add({
                                    type: "danger",
                                    message: LOCALE.maketext("The service account is invalid."),
                                    id: "errorServiceAccountNotValid"
                                });
                                return;
                            }
                            $scope.loadView("edit/service/" + serviceType + "/" + user.full_username, {}, { clearAlerts: true });
                        } else {
                            alertService.clear();
                            alertService.add({
                                type: "danger",
                                message: LOCALE.maketext("You cannot edit the account."),
                                id: "errorAccountNotValid"
                            });
                            return;
                        }
                    };


                    /**
                     * Filter method to test if the user should be filtered by a string value.
                     *
                     * @scope
                     * @method filterText
                     * @param  {Object} user
                     * @return {Boolean}      true if the user should be shown, false otherwise.
                     */
                    $scope.filterText = function(user) {
                        if (!$scope.meta.filterValue) {
                            return true;
                        }

                        return [
                            "full_username",
                            "real_name",
                            "alternate_email",
                            "type",
                            "typeLabel",
                            "serviceSearch"
                        ].some(function(key) {
                            var propVal = user[key];
                            if (propVal && propVal.toLocaleLowerCase().indexOf($scope.meta.filterValue) !== -1) {
                                return true;
                            }
                        });
                    };

                    /**
                     * Test if there is an active advanced search.
                     *
                     * @scope
                     * @method hasAdvancedSearch
                     * @return {Boolean} true if there is an advanced search option
                     *                        selected, false otherwise.
                     */
                    $scope.hasAdvancedSearch = function() {
                        if ($scope.advancedFilters.services !== "all" ||
                            $scope.advancedFilters.issues !== "both") {
                            return true;
                        } else {
                            return false;
                        }
                    };


                    /**
                     * Filter method to test if the user should be filtered based on the various
                     * advanced search options.
                     *
                     * @scope
                     * @method filterAdvanced
                     * @param  {Object} user
                     * @return {Boolean}      true if the user should be shown, false otherwise.
                     */
                    $scope.filterAdvanced = function(user) {

                        /**
                         * Filter the merge candidates the same way we filter them in the UI.
                         *
                         * @private
                         * @method areMergeCandidatesVisible
                         * @param  {Object} user [description]
                         * @return {Boolean}     true if there are merge candidates visible, false otherwise.
                         */
                        var areMergeCandidatesVisible = function(user) {
                            var list = user.merge_candidates;
                            if ($scope.meta.filterValue) {
                                list = $filter("filter")(list, $scope.filterText);
                            }
                            list = $filter("filter")(list, $scope.filterAdvanced);
                            return !!list.length;
                        };

                        if ($scope.advancedFilters.issues === "noissues") {
                            switch (user.type) {
                                case "hypothetical":
                                    if (!areMergeCandidatesVisible(user)) {
                                        return false;
                                    } else if (user.candidate_issues_count === user.merge_candidates.length) {

                                    // Only hide this if the number of services and number of
                                    // single service merge candidates are the same.
                                        return false;
                                    }
                                    break;
                                case "sub":
                                    if (user.issues.length > 0 ||
                                    user.has_expired_invite ||
                                    (areMergeCandidatesVisible(user) && user.candidate_issues_count)) {
                                        return false;
                                    }
                                    break;
                                default:
                                    if (user.issues.length > 0) {
                                        return false;
                                    }
                            }
                        }

                        if ($scope.advancedFilters.issues === "issues") {

                            switch (user.type) {
                                case "hypothetical":

                                    if (!areMergeCandidatesVisible(user)) {
                                        return false;
                                    } else if (!user.candidate_issues_count) {
                                        return false;
                                    }
                                    break;
                                case "sub":
                                    if (user.issues.length === 0 &&
                                    !user.has_expired_invite &&
                                    (!areMergeCandidatesVisible(user) || !user.candidate_issues_count)) {
                                        return false;
                                    }
                                    break;
                                default:
                                    if (user.issues.length === 0) {
                                        return false;
                                    }
                            }
                        }

                        if ($scope.advancedFilters.services === "all") {
                            return true;
                        }

                        if ($scope.advancedFilters.services === "email" &&
                            (user.services.email.enabled || user.services.email.enabledInCandidate)) {
                            return true;
                        }

                        if ($scope.advancedFilters.services === "ftp" &&
                            (user.services.ftp.enabled || user.services.ftp.enabledInCandidate)) {
                            return true;
                        }

                        if ($scope.advancedFilters.services === "webdisk" &&
                            (user.services.webdisk.enabled || user.services.webdisk.enabledInCandidate)) {
                            return true;
                        }

                        return false;
                    };

                    /**
                     * Sort the list of sub-accounts and service accounts
                     *
                     * @scope
                     * @method sortList
                     * @param {Object} meta             An object with metadata properties of sortBy, sortDirection, and sortType.
                     * @param {Boolean} [defaultSort]   If true, this sort was not initiated by the user.
                     */
                    $scope.sortList = function(meta, defaultSort) {

                        // clear the selected row
                        $scope.selectedRow = -1;

                        if (!defaultSort) {
                            var flat = !$scope.advancedFilters.showLinkable;
                            $scope.fetch(flat);
                        }
                    };

                    /**
                     * Clears the search term when the Esc key
                     * is pressed.
                     *
                     * @scope
                     * @method triggerClearSearch
                     * @param {Event} event - The event object
                     */
                    $scope.triggerClearSearch = function(event) {
                        if (event.keyCode === 27) {
                            $scope.clearSearch();
                        }
                    };

                    /**
                     * Clears the search term
                     *
                     * @scope
                     * @method clearSearch
                     */
                    $scope.clearSearch = function() {
                        $scope.meta.filterValue = "";
                    };

                    /**
                     * Fetch the list of sub-accounts and service accounts from the server.
                     *
                     * @scope
                     * @method fetch
                     * @return {Promise} Promise that when fulfilled will result in the list being loaded with the new criteria.
                     */
                    $scope.fetch = function() {

                        // Setup the view for a full reload
                        $scope.filteredUsers = [];
                        $scope.filteredData = false;
                        $scope.showViewLoadingPanel();

                        // Start the load
                        var flat = !$scope.advancedFilters.showLinkable;
                        spinnerAPI.start("loadingSpinner");
                        return userService
                            .fetchList(flat, $scope.meta)
                            .then(function(results) {
                                dataCache.set("userList", results.items);
                                $scope.userList = dataCache.get("userList");
                                $scope.totalItems = $scope.userList.length;
                                $scope.pageNumber = 1;
                                updateUI(true);
                            }, function(error) {

                                // failure
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    id: "fetchError"
                                });
                            })
                            .finally(function() {
                                spinnerAPI.stop("loadingSpinner");
                            });
                    };

                    /**
                     * Show the delete confirm dialog for a user.
                     *
                     * @scope
                     * @method showDeleteConfirm
                     * @param  {Object} user
                     */
                    $scope.showDeleteConfirm = function(user) {
                        user.ui.showDeleteConfirm = true;
                    };

                    /**
                     * Hide the delete confirm dialog for a user.
                     *
                     * @scope
                     * @method hideDeleteConfirm
                     * @param  {Object} user
                     */
                    $scope.hideDeleteConfirm = function(user) {
                        user.ui.showDeleteConfirm = false;
                    };

                    /**
                     * Check if we should show the delete confirm dialog for a specific user

                     * @scope
                     * @method canShowDeleteConfirm
                     * @param  {Object} user
                     * @return {Boolean}      true if it should show, false otherwise.
                     */
                    $scope.canShowDeleteConfirm = function(user) {
                        return user.ui.showDeleteConfirm;
                    };

                    /**
                     * Check if a delete operation is underway for the passed user.
                     *
                     * @scope
                     * @method isDeleting
                     * @param  {Object}  user
                     * @return {Boolean}      true if a delete operation is running, false otherwise.
                     */
                    $scope.isDeleting = function(user) {
                        return user.ui.deleting;
                    };

                    /**
                     * Delete a user
                     * @param  {Object} user       The user to delete.
                     * @param  {Object} [parent]   The parent user, if there is one.
                     * @return {Promise}           When resolved, the user has been deleted.
                     */
                    $scope.deleteUser = function(user, parent) {
                        spinnerAPI.start("loadingSpinner");
                        user.ui.deleting = true;
                        return userService
                            .delete(user)
                            .then(function(results) {
                                var collection = parent ? parent.merge_candidates : $scope.userList;
                                var pos = collection.indexOf(user);
                                if (pos !== -1) {
                                    if (results.data) { // delete_user returns a replacement back when appropriate
                                        collection.splice(pos, 1, results.data);
                                    } else {
                                        collection.splice(pos, 1); // service deletes don't return anything

                                        /* If all we have left is a hypothetical account with one merge candidate,
                                         * get rid of the hypothetical account and replace it with that remaining
                                         * service account. This is the same behavior we have with dismisses. */
                                        if (parent && parent.type === "hypothetical" && parent.merge_candidates.length === 1) {
                                            var parentPos = $scope.userList.indexOf(parent);
                                            if (parentPos !== -1) {
                                                $scope.userList.splice(parentPos, 1, parent.merge_candidates.pop());
                                            }
                                        }
                                    }

                                    // update the caches
                                    dataCache.set("userList", $scope.userList);

                                    updateUI(true);
                                }
                            }, function(error) {

                                // failure
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    id: "deleteError"
                                });
                            })
                            .finally(function() {
                                user.ui.deleting = false;
                                spinnerAPI.stop("loadingSpinner");
                            });
                    };

                    /**
                     * Helper method to add the rendering text around the full username
                     * for the delete query.
                     *
                     * @note This may have been easier if we published maketext as a method on the   ## no extract maketext
                     * controller and then you could do something like:
                     *   <span>{{maketext("Do you wish to remove the “[_1]” user from your system?", user.full_username | wrap:[@.]:10)}}
                     *
                     * @scope
                     * @method wrappedDeleteText
                     * @param  {Object} user
                     * @return {String}
                     */
                    $scope.wrappedDeleteText = function(user) {
                        var wbrText = wrapFilter(user.full_username, "[@.]", 5);
                        return LOCALE.maketext("Do you wish to remove the “[_1]” user from your system?", wbrText);
                    };

                    /**
                     * Given a merge candidate, links it to a sub-account of the same name.
                     *
                     * @scope
                     * @method  linkUser
                     * @param  {Object} user    The service account to link.
                     * @param  {Object} parent  The sub-account (real or hypothetical) to which the service account is being linked.
                     * @return {Promise}
                     */
                    $scope.linkUser = function(user, parent) {
                        spinnerAPI.start("loadingSpinner");
                        user.ui.linking = true;
                        _buildLinkingCaches(user, parent);

                        return userService
                            .link(user)
                            .then(function(results) {

                                var collection = $scope.userList;
                                var pos = collection.indexOf(parent);
                                if (pos !== -1) {

                                    /* The link operation gives us back the entire parent account record, including any
                                     * remaining merge candidates. We just need to splice it back into the list at
                                     * the appropriate spot. */
                                    collection.splice(pos, 1, results);

                                    // Update the cache
                                    dataCache.set("userList", collection);

                                    // Update the UI
                                    updateUI(true);

                                    alertService.add({
                                        type: "success",
                                        message: results.synced_password ?
                                            LOCALE.maketext("The system successfully linked the service account to the “[_1]” user’s [asis,subaccount]. The service account passwords have not changed.", results.full_username) :
                                            LOCALE.maketext("The system successfully linked the service account to the “[_1]” user’s [asis,subaccount]. The service account passwords did not change. You must provide a new password if you wish to enable any additional [asis,subaccount] services.", results.full_username),
                                        id: "link-user-success",
                                        replace: false
                                    });
                                }
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    id: "linkError"
                                });
                            })
                            .finally(function() {
                                spinnerAPI.stop("loadingSpinner");
                                user.ui.linking = false;
                                _buildLinkingCaches(user, parent);
                            });
                    };


                    /**
                     * Given a merge candidate, dismisses it from the merge candidate list.
                     *
                     * @scope
                     * @method  dismissLink
                     * @param  {Object} user    The service account to dismiss.
                     * @param  {Object} parent  The sub-account (real or hypothetical) to which the service account would have been linked.
                     * @return {Promise}
                     */
                    $scope.dismissLink = function(user, parent) {
                        spinnerAPI.start("loadingSpinner");
                        user.ui.linking = true;
                        _buildLinkingCaches(user, parent);

                        return userService
                            .dismissLink(user)
                            .then(function(results) {

                                var collection = $scope.userList;
                                var pos = collection.indexOf(parent);
                                var mergeCandidatePosition = collection[pos].merge_candidates.indexOf(user);
                                if (mergeCandidatePosition !== -1) {

                                    /* Pull the service account out of the merge candidates section and move it up to the top level of the user list. */
                                    var formerMergeCandidate = collection[pos].merge_candidates[mergeCandidatePosition];
                                    collection[pos].merge_candidates.splice(mergeCandidatePosition, 1);
                                    _insert(collection, formerMergeCandidate);

                                    /* If, after the last dismiss, there is only one merge candidate left, and it is being shown as a
                                     * merge candidate for a hypothetical sub-account, move it out to the top level too. This is a
                                     * special case for hypothetical sub-accounts because we wouldn't normally show a single service
                                     * account as a merge candidate unless the corresponding sub-account already existed. */
                                    if ("hypothetical" === collection[pos].type && collection[pos].merge_candidates.length === 1) {
                                        var finalMergeCandidate = collection[pos].merge_candidates.pop();
                                        _insert(collection, finalMergeCandidate);
                                        collection.splice(pos, 1); // remove the hypothetical sub-account too
                                    }

                                    // Update the cache
                                    dataCache.set("userList", collection);

                                    // Update the UI
                                    updateUI(true);
                                }
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    id: "dismissError"
                                });
                            })
                            .finally(function() {
                                spinnerAPI.stop("loadingSpinner");
                                user.ui.linking = false;
                                _buildLinkingCaches(user, parent);
                            });
                    };

                    /**
                     * Insert the user in the correct position in the collection.
                     *
                     * @private
                     * @method  _insert
                     * @param  {Array} collection
                     * @param  {Object} newUser
                     */
                    var _insert = function(collection, newUser) {
                        for (var i = 0, l = collection.length; i < l; i++) {
                            var user = collection[i];
                            if (user.full_username > newUser.full_username) {
                                collection.splice(i, 0, newUser);
                                return;
                            }
                        }

                        // It needs to go at the end of the list
                        collection.push(newUser);
                    };

                    /**
                     * Given a sub-account (real or hypothetical), link all available merge candidates.
                     *
                     * @scope
                     * @method  linkAll
                     * @param  {Object} parent    The sub-account.
                     * @return {Promise}
                     */
                    $scope.linkAll = function(parent) {
                        spinnerAPI.start("loadingSpinner");

                        parent.ui.linkingAny = parent.ui.linkingAll = true;

                        return userService
                            .linkAll(parent)
                            .then(function(results) {

                                var collection = $scope.userList;
                                var pos = collection.indexOf(parent);
                                if (pos !== -1) {
                                    collection.splice(pos, 1, results);

                                    // Update the cache
                                    dataCache.set("userList", collection);

                                    // Update the UI
                                    updateUI(true);
                                }

                                alertService.add({
                                    type: "success",
                                    message: results.synced_password ?
                                        LOCALE.maketext("The system successfully linked all of the service accounts for the “[_1]” user to the [asis,subaccount]. The service account passwords did not change.", results.full_username) :
                                        LOCALE.maketext("The system successfully linked all of the service accounts for the “[_1]” user to the [asis,subaccount]. The service account passwords did not change. You must provide a new password if you wish to enable any additional [asis,subaccount] services.", results.full_username),
                                    id: "link-all-success",
                                    replace: false
                                });
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    id: "dismissError"
                                });
                            })
                            .finally(function() {
                                spinnerAPI.stop("loadingSpinner");
                                parent.ui.linkingAny = parent.ui.linkingAll = false;
                            });

                    };

                    /**
                     * Given a sub-account (real or hypothetical), dismiss all available merge candidates.
                     *
                     * @scope
                     * @method dismissAll
                     * @param  {Object} parent    The sub-account.
                     * @return {Promise}
                     */
                    $scope.dismissAll = function(parent) {
                        spinnerAPI.start("loadingSpinner");

                        parent.ui.linkingAny = parent.ui.linkingAll = true;

                        return userService
                            .dismissAll(parent)
                            .then(function(results) {
                                var collection = $scope.userList;
                                var pos = collection.indexOf(parent);
                                if (pos !== -1) {

                                    /* Pull everything out of the merge candidates section and put it at the top level of the user list. */
                                    var serviceAccount = collection[pos].merge_candidates.shift();
                                    while ( serviceAccount ) {
                                        _insert(collection, serviceAccount);
                                        serviceAccount = collection[pos].merge_candidates.shift();
                                    }

                                    /* If the sub-account didn't already exist, stop displaying the placeholder now that the merge candidates are gone. */
                                    if ("hypothetical" === parent.type) {
                                        collection.splice(pos, 1);
                                    }

                                    // Update the cache
                                    dataCache.set("userList", collection);

                                    // Update the UI
                                    updateUI(true);
                                }
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    id: "linkError"
                                });
                            })
                            .finally(function() {
                                spinnerAPI.stop("loadingSpinner");
                                parent.ui.linkingAny = parent.ui.linkingAll = false;
                            });

                    };

                    /**
                     * Build the helpers state for linking and dismissing
                     *
                     * @private
                     * @method _buildLinkingCaches
                     * @param  {Object} user
                     * @param  {Object} parent
                     */
                    var _buildLinkingCaches = function(user, parent) {
                        parent.ui.linkingAll = true;
                        parent.ui.linkingAny = false;
                        for (var i = 0, l = parent.merge_candidates.length; i < l; i++) {
                            if (parent.merge_candidates[i].ui.linking) {
                                parent.ui.linkingAny = true;
                            } else {
                                parent.ui.linkingAll = false;
                            }
                        }
                    };

                    // Get the page bootstrapped. Moved before the watchers to try to get the page to load faster
                    _initializeScope();
                    _initializeView().finally(function() {

                        /**
                         * Set up the watchers that facilitate caching for the filteredUserList
                         */
                        $scope.$watchGroup([
                            "meta.filterValue",
                            "advancedFilters.services",
                            "advancedFilters.issues"
                        ], function(newVals, oldVals) {
                            updateUI(true);
                        });

                        $scope.$watchGroup([
                            "meta.pageSize",
                            "meta.pageNumber"
                        ], function(newVals, oldVals) {
                            updateUI();
                        });
                    });


                }
            ]
        );

        return controller;
    }
);

/*
# base/frontend/paper_lantern/user_manager/directives/validateUsernameWithDomain.js
#                                                 Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/directives/validateUsernameWithDomain',[
        "angular",
        "cjt/util/locale",
        "cjt/validator/validator-utils",
        "cjt/validator/validateDirectiveFactory",
        "app/services/userService"
    ],
    function(angular, LOCALE, validatorUtils, validatorFactory, userService) {

        var module = angular.module("App");

        /**
         * This set of directives is intended to help with the problem of length
         * validation for username@domain entry across two fields. In the product we
         * often have one field for username and another for the domain selection. As
         * of 11.54, we are imposing character limitations for the combined result of
         * these two fields, including the @ character. This directive automates that
         * validation.
         *
         * @example
         *
         * <form username-with-domain-wrapper>
         *     <input name="username" ng-model="username" username-with-domain="username">
         *     <input name="domain"   ng-model="domain"   username-with-domain="domain">
         *     <ul validation-container field-name="username"></ul>
         * </form>
         *
         * Note: Both the wrapper and child directives are restricted to attributes.
         */


        /**
         * The wrapper directive just serves as a communication point between the two
         * child directives.
         */
        module.directive("usernameWithDomainWrapper", [function() {

            var ParentController = function($attrs) {
                this.username = this.domain = "";
                this.$attrs = $attrs;
            };

            angular.extend(ParentController.prototype, {
                setDomain: function(domain) {
                    if (typeof domain !== "undefined") {
                        this.domain = domain;
                    }

                    return this.getTotalLength();
                },

                setUsername: function(username) {
                    if (typeof username !== "undefined") {
                        this.username = username;
                    }

                    return this.getTotalLength();
                },

                getUsernameAndDomain: function() {
                    return this.username + "@" + this.domain;
                },

                getTotalLength: function() {
                    return this.getUsernameAndDomain().length;
                }
            });

            return {
                restrict: "A",
                scope: false,
                controller: ["$attrs", ParentController]
            };

        }]);

        /**
         * This directive will need two instances to function as intended, and they
         * should both be descendants of the wrapper directive. One should have the
         * attribute value of "username" and the other value should be "domain".
         */
        module.directive("usernameWithDomain", ["userService", "$q", function(userService, $q) {

            return {
                restrict: "A",
                scope: false,
                require: ["^^usernameWithDomainWrapper", "ngModel"],
                link: function( scope, elem, attrs, ctrls ) {
                    var parentCtrl = ctrls[0]; // The controller from the wrapper directive
                    var ngModel    = ctrls[1]; // The ngModel controller from the current element

                    // Grab the type
                    var type = attrs.usernameWithDomain;

                    if (type === "username") {

                        // Save a reference to the $validate function on the wrapper so that the partner "domain"
                        // version of this directive can trigger validation for this "username" instance.
                        parentCtrl.validateUsername = ngModel.$validate;

                        // Set up the extended validation object the same way the validateDirectiveFactory does.
                        var formCtrl = elem.controller("form");
                        validatorUtils.initializeExtendedReporting(ngModel, formCtrl);

                        // This is the main validation function that checks the total length of the username@domain.
                        var validateUsernameWithDoamin = function(totalLength) {
                            var TOTAL_MAX_LENGTH = 254;
                            var result = validatorUtils.initializeValidationResult();

                            if (totalLength > TOTAL_MAX_LENGTH) {
                                result.addError("maxLength", LOCALE.maketext("The combined length of the username, [asis,@] character, and domain cannot exceed [numf,_1] characters.", TOTAL_MAX_LENGTH));
                            }

                            return result;
                        };

                        // Add the validator to the list. The validator goes through the validateDirectiveFactory
                        // "run" method to hopefully help compatibility going forward.
                        ngModel.$validators.usernameWithDomain = function(newUsername) {
                            var totalLength = parentCtrl.setUsername(newUsername);
                            return validatorFactory.run("usernameWithDomain", ngModel, formCtrl, validateUsernameWithDoamin, totalLength);
                        };

                        var validateUsernameIsAvailableAsync = function(value) {
                            return userService.checkAccountConflicts(value).then(function(responseData) {
                                scope.$eval(parentCtrl.$attrs.lookupCallback, { responseData: responseData });
                                return responseData;
                            }).then(
                                function() {
                                    return validatorUtils.initializeValidationResult();
                                },
                                function(error) {
                                    var result = validatorUtils.initializeValidationResult(true);
                                    result.addError("usernameIsAvailable", error);
                                    return result;
                                });
                        };

                        ngModel.$asyncValidators.usernameIsAvailable = function(modelValue, viewValue) {
                            var value = parentCtrl.getUsernameAndDomain();
                            return validatorFactory.runAsync($q, "usernameIsAvailable", ngModel, formCtrl, validateUsernameIsAvailableAsync, value);
                        };

                    } else if (type === "domain") {

                        // Unfortunately the viewChangeListeners array doesn't get triggered when you first set
                        // the model value (for whatever reason), so we'll need to set the domain to cover the
                        // case when the user doesn't change the default. $formatters don't get called for select
                        // controls when their value changes so this only fires on the initial render.
                        ngModel.$formatters.push(function(val) {
                            parentCtrl.setDomain( ngModel.$modelValue );
                            return val;
                        });

                        // When the domain model changes, we need to run the length check again, but the username
                        // is where people have the most flexibility to make changes, so we'll run the validation
                        // there to create the validation error messages near that field.
                        ngModel.$viewChangeListeners.push(function() {
                            parentCtrl.setDomain( ngModel.$modelValue );
                            parentCtrl.validateUsername();
                        });
                    } else {
                        throw new Error("The value for the username-with-domain directive needs to be set to 'username' or 'domain'.");
                    }

                }
            };

        }]);

    }
);

/*
# user_manager/directives/selectOnFocus.js        Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/


/* global define: false */

define(
    'app/directives/selectOnFocus',[
        "angular",
    ],
    function(angular) {
        var module = angular.module("App");
        module.directive("selectOnFocus", [
            "$timeout",
            function($timeout) {
                return {
                    restrict: "A",
                    link: function(scope, element, attrs) {
                        var focusedElement = null;

                        var bindTo;

                        if ( element[0].tagName === "input" ) {
                            bindTo = element;
                        } else {
                            bindTo = element.find("input");
                        }

                        if ( bindTo.length === 1 ) {

                            bindTo.on("focus", function() {
                                var self = this;
                                if (focusedElement !== self) {
                                    focusedElement = self;
                                    $timeout(function() {
                                        if ( self.select ) {
                                            self.select();
                                        }
                                    }, 10);
                                }
                            });

                            bindTo.on("blur", function() {
                                focusedElement = null;
                            });

                        }

                    }
                };
            }
        ]);
    }
);

/*
# user_manager/directives/limit.js                Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/directives/limit',[
        "angular",
        "lodash",
        "cjt/core",
        "cjt/util/locale",
        "cjt/directives/bytesInput",
        "app/directives/selectOnFocus"
    ],
    function(angular, _, CJT, LOCALE) {

        var module = angular.module("App");
        module.directive("appLimit", [
            "$timeout",
            "$templateCache",
            "$document",
            function($timeout, $templateCache, $document) {
                var _counter = 1;
                var TEMPLATE_PATH = "directives/limit.ptt";
                var RELATIVE_PATH = "user_manager/" + TEMPLATE_PATH;

                var SCOPE_DECLARATION = {
                    id: "@?id",
                    unitsLabel: "@?unitsLabel",
                    unlimitedLabel: "@?unlimitedLabel",
                    unlimitedValue: "=unlimitedValue",
                    minimumValue: "=minimumValue",
                    maximumValue: "=maximumValue",
                    isDisabled: "=ngDisabled",
                    defaultValue: "=defaultValue",
                    maximumLength: "=maximumLength",
                    selectedUnit: "="
                };

                var UNLIMITED_DEFAULT_LABEL = "Unlimited";
                var UNLIMITED_DEFAULT_VALUE = 0;

                var _focusElement = function(el, wait) {
                    if (!el) {
                        return;
                    }

                    // https://developer.mozilla.org/en-US/docs/Web/API/Document/activeElement
                    var elFocus = $document.activeElement ? $document.activeElement : null;
                    if (elFocus !== el) {
                        if (angular.isUndefined(wait)) {
                            el.focus();
                        } else {
                            $timeout(function() {
                                el.focus();
                            }, wait);
                        }
                    }
                };

                return {
                    restrict: "E",
                    templateUrl: CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : TEMPLATE_PATH,
                    replace: true,
                    require: "ngModel",
                    scope: SCOPE_DECLARATION,
                    compile: function(element, attrs) {
                        return {
                            pre: function(scope, element, attrs) {
                                if (angular.isUndefined(attrs.unlimitedLabel)) {
                                    attrs.unlimitedLabel = UNLIMITED_DEFAULT_LABEL;
                                }

                                if (!attrs.id) {
                                    attrs.id = "ctrlLimit_" + _counter++;
                                }
                            },
                            post: function(scope, element, attrs, ngModel) {
                                if (angular.isUndefined(scope.unlimitedValue)) {
                                    scope.unlimitedValue = UNLIMITED_DEFAULT_VALUE;
                                }

                                if (angular.isUndefined(scope.minimumValue)) {
                                    scope.minimumValue = 1;
                                }

                                scope.maximumLength = _parseIntOrDefault(scope.maximumLength, null);
                                scope.unlimitedValue = _parseIntOrDefault(scope.unlimitedValue, 0);
                                scope.minimumValue = _parseIntOrDefault(scope.minimumValue, 1);
                                scope.maximumValue = _parseIntOrDefault(scope.maximumValue, null);
                                scope.defaultValue = _parseIntOrDefault(scope.defaultValue, null);
                                scope.selectedUnit = scope.selectedUnit || "MB";

                                var elNumber = element.find(".textbox");

                                // Define how to transform the model into the parts needed for the view
                                ngModel.$formatters.push(function(modelValue) {
                                    var unlimitedChecked = modelValue === scope.unlimitedValue;
                                    return {
                                        unlimitedChecked: unlimitedChecked,
                                        value: unlimitedChecked ? "" : modelValue
                                    };
                                });

                                // Define how to draw the output when the model changes
                                ngModel.$render = function() {
                                    scope.unlimitedChecked = ngModel.$viewValue.unlimitedChecked;
                                    scope.value = ngModel.$viewValue.value;
                                };

                                // Define how to transform the view into the model
                                ngModel.$parsers.push(function(viewValue) {
                                    if (viewValue.unlimitedChecked) {
                                        return scope.unlimitedValue;
                                    } else {
                                        return viewValue.value;
                                    }
                                });

                                // Define how to set the view value when the view changes
                                scope.$watch("unlimitedChecked + value", function(newValue, oldValue) {
                                    if (newValue === oldValue) {
                                        return;
                                    }

                                    ngModel.$setViewValue({
                                        unlimitedChecked: scope.unlimitedChecked,
                                        value: scope.unlimitedChecked ? "" : scope.value
                                    });
                                });

                                // input[type=number] do not natively respect the maxlength attribute
                                // the way a input[type=text] does. This even handler adds the missing
                                // behavior.
                                if (scope.maximumLength && scope.maximumLength > 0) {
                                    elNumber.on("input", function(e) {
                                        if (this.value.length > scope.maximumLength) {
                                            this.value = this.value.slice(0, scope.maximumLength);
                                        }
                                    });
                                }

                                /**
                                 * Handler for when the unlimited/unrestricted radio button is clicked or selected
                                 */
                                scope.makeUnlimited = function() {
                                    if (scope.value !== "") {
                                        scope.lastValue = scope.value;
                                    } else if (scope.defaultValue) {
                                        scope.lastValue = scope.defaultValue;
                                    } else {
                                        scope.lastValue = scope.minimumValue;
                                    }
                                    scope.unlimitedChecked = true;
                                    scope.value = "";
                                };

                                /**
                                 * Handler for when the limited/restricted radio button or the click shield for the
                                 * input field is clicked or selected.
                                 */
                                scope.enableLimit = function() {
                                    if (!scope.isDisabled) {
                                        if (scope.unlimitedChecked) {
                                            if (scope.value === "") {

                                                // changing from unlimited to limits
                                                if (scope.lastValue !== "") {
                                                    scope.value = scope.lastValue;
                                                } else if (scope.defaultValue) {
                                                    scope.value = scope.defaultValue;
                                                } else {
                                                    scope.value = scope.minimumValue;
                                                }
                                            }
                                            scope.unlimitedChecked = false;
                                        }

                                        if ( elNumber.length === 0 ) {
                                            elNumber = element.find(".textbox");
                                        }

                                        _focusElement(elNumber, 0);
                                    }
                                };

                                // Setup the defaults for things not part of the ngModel handlers above.
                                if (scope.defaultValue) {
                                    scope.lastValue = scope.defaultValue;
                                } else {
                                    scope.lastValue = scope.minimumValue;
                                }
                            }
                        };
                    }
                };
            }
        ]);

        function _parseIntOrDefault(value, defaultValue) {
            if (angular.isString(value)) {
                value = parseInt(value, 10); // parseInt returns NaN with undefined, null, or empty strings
            }
            return isNaN(value) ? defaultValue : value;
        }
    }
);

/*
# user_manager/directives/serviceConfigController.js Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define('app/directives/serviceConfigController',[
    "angular",
    "cjt/util/test"

], function(angular, TEST) {
    var app = angular.module("App");
    app.controller("serviceConfigController", [
        "$scope",
        "$attrs",
        function($scope, $attrs) {

            /**
             * Does the service need conflict resolution?
             *
             * @method needsConflictResolution
             * @return {Boolean}
             */
            $scope.needsConflictResolution = function() {
                return $scope.hasConflict() && !$scope.isResolved();
            };

            /**
             * Would adding this service create a conflict?
             *
             * @method hasConflict
             * @return {Boolean}
             */
            $scope.hasConflict = function() {
                return $scope.service && $scope.service.isCandidate;
            };

            /**
             * Has the client resolved a conflict? Note that this method does not
             * test to see if there is a conflict in the first place.
             *
             * @method isResolved
             * @return {Boolean}
             */
            $scope.isResolved = function() {
                return $scope.service.willLink || $scope.service.willDismiss;
            };

            /**
             * Is there a link action attribute present?
             *
             * @method hasLinkAction
             * @return {Boolean}
             */
            $scope.hasLinkAction = function() {
                return !!$attrs.linkAction;
            };

            /**
             * Stages a merge candidate for dismissal.
             *
             * @method setDismiss
             */
            $scope.setDismiss = function() {
                $scope.service.willDismiss = true;
                $scope.service.enabled = false;
                $scope.validateConflictResolution();
            };

            /**
             * Stages a merge candidate for linking.
             *
             * @method setLink
             */
            $scope.setLink = function() {
                $scope.service.willLink = true;
                $scope.service.enabled = true;
                $scope.validateConflictResolution();
            };

            /**
             * Clears any existing conflict resolution markers. Used for the undo action.
             *
             * @method clearConflictResolution
             */
            $scope.clearConflictResolution = function() {
                $scope.service.willLink = $scope.service.willDismiss = false;
                $scope.validateConflictResolution();
            };

            /**
             * Stages the service for linking and runs the supplied linkAction method against the parent scope.
             *
             * @method runLinkAction
             * @return {Any}   Returns whatever is returned from the linkAction method.
             */
            $scope.runLinkAction = function() {
                $scope.isLinking = true;
                $scope.setLink();

                if (!$scope.hasLinkAction()) {
                    $scope.isLinking = false;
                    return;
                }

                var ret = $scope.linkAction({ service: $scope.service });

                if (TEST.isQPromise(ret)) {
                    ret.finally(function() {
                        $scope.isLinking = false;
                    });
                } else {
                    $scope.isLinking = false;
                }

                return ret;
            };

            /**
             * Sets validity for the control if conflict resolution is required.
             *
             * @method validateConflictResolution
             */
            $scope.validateConflictResolution = function() {
                if ($scope.conflictResolutionRequired) {
                    $scope.ngModel.$setValidity("conflictCleared", !$scope.needsConflictResolution());
                }
            };

            /**
             * Toggles the expanded/collapsed view of the service conflict summary.
             *
             * @method toggleConflictSummary
             */
            $scope.toggleConflictSummary = function() {
                $scope.isSummaryCollapsed = !$scope.isSummaryCollapsed;
            };
            $scope.isSummaryCollapsed = true;
        }
    ]);
});

/*
# user_manager/directives/emailServiceConfig.js   Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/directives/emailServiceConfig',[
        "angular",
        "lodash",
        "cjt/core",
        "cjt/util/locale",
        "cjt/directives/toggleSwitchDirective",
        "cjt/filters/wrapFilter",
        "app/directives/limit",
        "app/directives/serviceConfigController"
    ],
    function(angular, _, CJT, LOCALE) {

        var module = angular.module("App");
        module.directive("emailConfig", [
            "defaultInfo",
            function(defaultInfo) {
                var TEMPLATE_PATH = "directives/emailServiceConfig.ptt";
                var RELATIVE_PATH = "user_manager/" + TEMPLATE_PATH;

                return {
                    restrict: "AE",
                    templateUrl: CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : TEMPLATE_PATH,
                    replace: true,
                    require: "ngModel",
                    scope: {
                        toggleService: "&toggleService",
                        isDisabled: "=ngDisabled",
                        showToggle: "=showToggle",
                        showUnlink: "=showUnlink",
                        unlinkService: "&unlinkService",
                        isInProgress: "&isInProgress",
                        showInfo: "=showInfo",
                        infoMessage: "@infoMessage",
                        showWarning: "=showWarning",
                        warningMessage: "@warningMessage",
                        showConflictDismiss: "=?",
                        conflictResolutionRequired: "=?",
                        linkAction: "&?"
                    },
                    controller: "serviceConfigController",
                    link: function(scope, element, attrs, ngModel) {
                        scope.ngModel = ngModel;

                        if (angular.isUndefined(scope.showWarning) ||
                            angular.isUndefined(scope.warningMessage) ||
                            scope.warningMessage === "") {
                            scope.showWarning = false;
                        }

                        if (angular.isUndefined(scope.showInfo) ||
                            angular.isUndefined(scope.infoMessage) ||
                            scope.infoMessage === "") {
                            scope.showInfo = false;
                        }

                        if (angular.isUndefined(scope.showToggle)) {
                            scope.showToggle = true;
                        }

                        if (angular.isUndefined(scope.showUnlink)) {
                            scope.showUnlink = false;
                        }

                        // Define how to draw the output when the model changes
                        ngModel.$render = function() {
                            scope.service = ngModel.$modelValue;
                            scope.validateConflictResolution();
                        };

                        scope.defaults = defaultInfo;
                        scope.maxMessage = LOCALE.maketext("Quotas cannot exceed [format_bytes,_1].", defaultInfo.email.max_quota * 1048576);
                    }
                };
            }
        ]);
    }
);

/*
 * cpanel - base/frontend/paper_lantern/user_manager/services/directoryLookupService.js
 *                                                 Copyright(c) 2015 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false */

define(
    'app/services/directoryLookupService',[
        "angular",
        "lodash",

        "cjt/core",
        "cjt/util/locale",

        "cjt/io/api",
        "cjt/io/uapi-request",
        "cjt/io/uapi",
        "cjt/util/parse",
    ],
    function(angular, _, CJT, LOCALE, API, APIREQUEST, APIDRIVER, PARSER) {
        "use strict";

        var app = angular.module("cpanel.services.directoryLookup", []);
        var lastRequestJQXHR = null;
        app.factory("directoryLookupService", [
            "$q",
            "APIService",
            function($q, APIService) {
                var DirectoryLookupService = function() {};
                DirectoryLookupService.prototype = new APIService();
                angular.extend(DirectoryLookupService.prototype, {

                    /**
                     * Query the directory completion API. Given a path prefix, which may
                     * include a partial directory name, returns an array of matching
                     * directories.
                     * @param  {String}  match  The prefix to match.
                     * @return {Promise} When fulfilled, will have either provided the list of matching directories or failed.
                     */
                    complete: function(match) {

                        /* Only allow one promise at a time for this service, and cancel any existing request, since
                         * the latest request will always supersede the existing one when typing into a text box. */
                        if (lastRequestJQXHR) {
                            lastRequestJQXHR.abort();
                        }

                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("Fileman", "autocompletedir");
                        apiCall.addArgument("path", match);
                        apiCall.addArgument("dirsonly", true);
                        apiCall.addArgument("skipreserved", true);
                        apiCall.addArgument("html", 0);

                        /* If the last character of the path to match is a slash, then the user is probably hoping to see
                         * a list of all files underneath that directory. The API doesn't understand this unless you
                         * specify list_all mode, so we need to add that argument. */
                        if ( "/" === match.charAt(match.length - 1) ) {
                            apiCall.addArgument("list_all", true);
                        }

                        var deferred = this.deferred(apiCall, {
                            transformAPISuccess: function(response) {
                                var flattenedResponse = [];
                                for (var i = 0, l = response.data.length; i < l; i++) {
                                    flattenedResponse.push(response.data[i].file);
                                }
                                return flattenedResponse;
                            }
                        });

                        return deferred.promise;
                    },

                    /* override sendRequest from APIService to also save our last jqXHR object */
                    sendRequest: function(apiCall, handlers, deferred) {
                        apiCall = new APIService.AngularAPICall(apiCall, handlers, deferred);

                        lastRequestJQXHR = apiCall.jqXHR;

                        return apiCall.deferred;
                    }
                });
                return new DirectoryLookupService();
            }
        ]);
    }
);

/*
# user_manager/directives/ftpServiceConfig.js     Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/directives/ftpServiceConfig',[
        "angular",
        "lodash",
        "cjt/core",
        "cjt/util/locale",
        "cjt/directives/toggleSwitchDirective",
        "cjt/filters/wrapFilter",
        "cjt/filters/htmlFilter",
        "app/services/directoryLookupService",
        "app/directives/limit",
        "app/directives/serviceConfigController"
    ],
    function(angular, _, CJT, LOCALE) {

        var module = angular.module("App");
        module.directive("ftpConfig", [
            "defaultInfo",
            "ftpDaemonInfo",
            "directoryLookupService",
            function(defaultInfo, ftpDaemonInfo, directoryLookupService) {
                var TEMPLATE_PATH = "directives/ftpServiceConfig.ptt";
                var RELATIVE_PATH = "user_manager/" + TEMPLATE_PATH;

                return {
                    restrict: "AE",
                    templateUrl: CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : TEMPLATE_PATH,
                    replace: true,
                    require: "ngModel",
                    scope: {
                        toggleService: "&toggleService",
                        isDisabled: "=ngDisabled",
                        showToggle: "=showToggle",
                        showUnlink: "=showUnlink",
                        unlinkService: "&unlinkService",
                        isInProgress: "&isInProgress",
                        showInfo: "=showInfo",
                        infoMessage: "@infoMessage",
                        showWarning: "=showWarning",
                        warningMessage: "@warningMessage",
                        showConflictDismiss: "=?",
                        conflictResolutionRequired: "=?",
                        linkAction: "&?"
                    },
                    controller: "serviceConfigController",
                    link: function(scope, element, attrs, ngModel) {
                        scope.ngModel = ngModel;

                        if (angular.isUndefined(scope.showWarning) ||
                            angular.isUndefined(scope.warningMessage) ||
                            scope.warningMessage === "") {
                            scope.showWarning = false;
                        }

                        if (angular.isUndefined(scope.showInfo) ||
                            angular.isUndefined(scope.infoMessage) ||
                            scope.infoMessage === "") {
                            scope.showInfo = false;
                        }

                        if (angular.isUndefined(scope.showToggle)) {
                            scope.showToggle = true;
                        }

                        if (angular.isUndefined(scope.showUnlink)) {
                            scope.showUnlink = false;
                        }

                        // Define how to draw the output when the model changes
                        ngModel.$render = function() {
                            scope.service = ngModel.$modelValue;
                            scope.validateConflictResolution();
                        };

                        scope.daemon   = ftpDaemonInfo;
                        scope.defaults = defaultInfo;

                        // Helper to call the directory lookup service
                        scope.completeDirectory = function(prefix) {
                            return directoryLookupService.complete(prefix);
                        };

                    }
                };
            }
        ]);
    }
);

/*
# user_manager/directives/webdiskServiceConfig.js Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/directives/webdiskServiceConfig',[
        "angular",
        "lodash",
        "cjt/core",
        "cjt/util/locale",
        "cjt/directives/toggleSwitchDirective",
        "cjt/filters/wrapFilter",
        "cjt/filters/htmlFilter",
        "app/services/directoryLookupService",
        "app/directives/limit",
        "app/directives/serviceConfigController"
    ],
    function(angular, _, CJT, LOCALE) {

        var module = angular.module("App");
        module.directive("webdiskConfig", [
            "defaultInfo",
            "sslInfo",
            "directoryLookupService",
            function(defaultInfo, sslInfo, directoryLookupService) {
                var TEMPLATE_PATH = "directives/webdiskServiceConfig.ptt";
                var RELATIVE_PATH = "user_manager/" + TEMPLATE_PATH;

                return {
                    restrict: "AE",
                    templateUrl: CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : TEMPLATE_PATH,
                    replace: true,
                    require: "ngModel",
                    scope: {
                        toggleService: "&toggleService",
                        isDisabled: "=ngDisabled",
                        showToggle: "=showToggle",
                        showUnlink: "=showUnlink",
                        unlinkService: "&unlinkService",
                        isInProgress: "&isInProgress",
                        enableDigestControls: "=enableDigestControls",
                        showDigestWarning: "=showDigestWarning",
                        showInfo: "=showInfo",
                        infoMessage: "@infoMessage",
                        showWarning: "=showWarning",
                        warningMessage: "@warningMessage",
                        showConflictDismiss: "=?",
                        conflictResolutionRequired: "=?",
                        linkAction: "&?"

                    },
                    controller: "serviceConfigController",
                    link: function(scope, element, attrs, ngModel) {
                        scope.ngModel = ngModel;

                        if (angular.isUndefined(scope.showDigestWarning)) {
                            scope.showDigestWarning = false;
                        }

                        if (angular.isUndefined(scope.showWarning) ||
                            angular.isUndefined(scope.warningMessage) ||
                            scope.warningMessage === "") {
                            scope.showWarning = false;
                        }

                        if (angular.isUndefined(scope.showInfo) ||
                            angular.isUndefined(scope.infoMessage) ||
                            scope.infoMessage === "") {
                            scope.showInfo = false;
                        }

                        if (angular.isUndefined(scope.showToggle)) {
                            scope.showToggle = true;
                        }

                        if (angular.isUndefined(scope.showUnlink)) {
                            scope.showUnlink = false;
                        }

                        if (angular.isUndefined(scope.enableDigestControls)) {
                            scope.enableDigestControls = true;
                        }

                        // Define how to draw the output when the model changes
                        ngModel.$render = function() {
                            scope.service = ngModel.$modelValue;
                            scope.validateConflictResolution();
                        };

                        scope.defaults = defaultInfo;
                        scope.allowDigestAuth = sslInfo.is_self_signed;

                        // Helper to call the directory lookup service
                        scope.completeDirectory = function(prefix) {
                            return directoryLookupService.complete(prefix);
                        };
                    }
                };
            }
        ]);
    }
);

/*
# user_manager/views/addEditController.js         Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false, PAGE: true */

define(
    'app/views/addEditController',[
        "angular",
        "lodash",
        "cjt/util/locale",
        "cjt/validator/email-validator",
        "cjt/directives/validationItemDirective",
        "cjt/directives/validationContainerDirective",
        "cjt/directives/validateEqualsDirective",
        "cjt/directives/passwordFieldDirective",
        "cjt/directives/actionButtonDirective",
        "app/directives/validateUsernameWithDomain",
        "app/directives/emailServiceConfig",
        "app/directives/ftpServiceConfig",
        "app/directives/webdiskServiceConfig",
        "uiBootstrap"
    ],
    function(angular, _, LOCALE) {

        var DEFAULT_PASSWORD_STRENGTH = 10; // Out of 100

        // Retrieve the current application
        var app = angular.module("App");

        // This will be returned by RequireJS for use in other controllers
        var factory = function($scope, userService, emailDaemonInfo, ftpDaemonInfo, webdiskDaemonInfo, features, defaultInfo, quotaInfo, alertService) {

            // Setup the base controller
            var controller = {

                /**
                 * Initialize the common scope variables
                 *
                 * @protected
                 * @method initializeScope
                 */
                initializeScope: function() {
                    $scope.ui = {
                        docrootByDomain: PAGE.docrootByDomain,
                        domainList: Object.keys(PAGE.docrootByDomain),
                        user: userService.emptyUser()
                    };

                    $scope.isOverQuota = !quotaInfo.under_quota_overall;
                    $scope.ui.user.domain = PAGE.primaryDomain; // TODO: Add nvdata here for last selected domain, fallback to primaryDomain
                    $scope.ui.user.services.ftp.homedir     = PAGE.docrootByDomain[PAGE.primaryDomain] + "/";
                    $scope.ui.user.services.webdisk.homedir = PAGE.docrootByDomain[PAGE.primaryDomain] + "/";

                    $scope.inProgress = false;
                    $scope.minimumPasswordStrength = angular.isDefined(PAGE.minimumPasswordStrength) ? parseInt(PAGE.minimumPasswordStrength, 10) : DEFAULT_PASSWORD_STRENGTH;

                    $scope.emailDaemon = emailDaemonInfo;
                    $scope.ftpDaemon = ftpDaemonInfo;
                    $scope.webdiskDaemon = webdiskDaemonInfo;

                    $scope.features = features;
                    $scope.defaults = defaultInfo;
                    $scope.quotaInfo = quotaInfo;

                    $scope.useCandidateServices = this.useCandidateServices;
                    $scope.insertSubAndRemoveDupes = this.insertSubAndRemoveDupes;
                },

                /**
                 * Initialize the common view stuff
                 *
                 * @protected
                 * @method initializeView
                 */
                initializeView: function() {
                    alertService.clear();
                    this.showCpanelOverQuotaWarning();
                },

                /**
                 * Call this when this view is loaded first and a new record is
                 * created that does not appear in the prefetch data.
                 *
                 * @protected
                 * @method clearPrefetch
                 */
                clearPrefetch: function() {
                    app.firstLoad.userList = false;
                },

                /**
                 * Update the view model's service object with the candidate service information from a user
                 * object (either another or itself).
                 *
                 * @method useCandidateServices
                 * @param {Object} destUser   The user model to update.
                 * @param {Object} srcUser    The source user model that contains the candidate_services
                 *                            that will be integrated into the destUser.
                 */
                useCandidateServices: function(destUser, srcUser) {
                    userService.integrateCandidateServices(destUser, srcUser);
                },

                /**
                 * Inserts a subaccount and any of its dismissed service accounts into a user list and removes
                 * any duplicates it might find. This works off of the premise that you can only ever have one
                 * instance of a service account per username/domain.
                 *
                 * @method insertSubAndRemoveDupes
                 * @param  {Object} newUser   The user to insert. It can be a duplicate of one in the userList
                 *                            because it will ultimately just replace the old one.
                 * @param  {Array} userList   The list of user objects into which newUser will be inserted.
                 */
                insertSubAndRemoveDupes: function(newUser, userList) {
                    var startingIndex = _.sortedIndexBy(userList, newUser, "full_username");

                    // Get a list of all services that are enabled on the latest version of the subaccount.
                    var enabledServices = [];

                    angular.forEach(newUser.services, function(service, serviceName) {
                        if (service.enabled) {
                            enabledServices.push(serviceName);
                        }
                    });

                    // Also include any services that are enabled in dismissed service accounts since we'll
                    // be inserting them as well.
                    if (newUser.dismissed_merge_candidates) {
                        newUser.dismissed_merge_candidates.forEach(function(serviceAccount) {
                            enabledServices.push(serviceAccount.service);
                        });
                    }

                    // Loop over all users in the userList with the same full_username and remove if they
                    // have the same services enabled or if they aren't a service account (ex. hypotheticals
                    // or a previous version of the subaccount).
                    var index = startingIndex;
                    var splice, user, serviceName;
                    while (userList[index] && userList[index].full_username === newUser.full_username) {
                        user = userList[index];

                        if (user.type !== "service") {
                            splice = true;
                        } else {

                            // Loop over the service names that are enabled in newUser. If any of those services
                            // are enabled on the current user in the list, mark it for splicing. Also mark it if
                            // it's not a service account, because service accounts are the only type of account
                            // that can co-exist with newUser in the userList.
                            for (var esi = 0, esl = enabledServices.length; esi < esl; esi++) {
                                serviceName = enabledServices[esi];

                                if (user.services[serviceName].enabled) {
                                    splice = true;
                                    break;
                                }
                            }
                        }

                        if (splice) {
                            userList.splice(index, 1);
                        } else {
                            index++;
                        }
                    }

                    // Finally, splice in newUser and the dismissed users.
                    var usersToInsert = userService.expandDismissed(newUser);
                    userList.splice.apply(userList, [startingIndex, 0].concat(usersToInsert));
                },

                /**
                 * Shows a dire warning if the cPanel account is over quota.
                 *
                 * @method showCpanelOverQuotaWarning
                 */
                showCpanelOverQuotaWarning: function() {
                    if ($scope.isOverQuota) {
                        alertService.add({
                            message: LOCALE.maketext("Your [asis,cPanel] account exceeds its disk quota. You cannot add or edit users."),
                            type: "danger",
                            id: "over-quota-warning",
                            replace: false,
                            counter: false
                        });
                    }
                }

            };

            return controller;

        };

        return factory;
    }
);

/*
# user_manager/views/addController.js             Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/views/addController',[
        "angular",
        "lodash",
        "cjt/util/locale",
        "app/views/addEditController",
        "cjt/directives/alertList",
        "cjt/directives/bytesInput",
        "cjt/directives/toggleLabelInfoDirective",
        "cjt/directives/toggleSwitchDirective",
        "cjt/directives/labelSuffixDirective",
        "cjt/services/alertService",
        "app/services/userService",
        "cjt/services/dataCacheService"
    ],
    function(angular, _, LOCALE, baseCtrlFactory) {

        // Retrieve the current application
        var app = angular.module("App");

        // Setup the controller
        var controller = app.controller(
            "addController", [
                "$scope",
                "$routeParams",
                "$timeout",
                "$location",
                "$anchorScroll",
                "userService",
                "alertService",
                "directoryLookupService",
                "dataCache",
                "defaultInfo",
                "quotaInfo",
                "emailDaemonInfo",
                "ftpDaemonInfo",
                "webdiskDaemonInfo",
                "features",
                "spinnerAPI",
                function(
                    $scope,
                    $routeParams,
                    $timeout,
                    $location,
                    $anchorScroll,
                    userService,
                    alertService,
                    directoryLookupService,
                    dataCache,
                    defaultInfo,
                    quotaInfo,
                    emailDaemonInfo,
                    ftpDaemonInfo,
                    webdiskDaemonInfo,
                    features,
                    spinnerAPI
                ) {

                    var baseCtrl = baseCtrlFactory($scope, userService, emailDaemonInfo, ftpDaemonInfo, webdiskDaemonInfo, features, defaultInfo, quotaInfo, alertService);

                    /**
                     * Setup the scope for this controller.
                     *
                     * @method initializeScope
                     */
                    var initializeScope = function() {
                        baseCtrl.initializeScope();
                        $scope.ui.user.sendInvite = $scope.ui.isInviteSubEnabled = !!window.PAGE.isInviteSubEnabled;
                    };


                    /**
                     * Setup the view for this controller.
                     *
                     * @method initializeView
                     */
                    var initializeView = function() {
                        baseCtrl.initializeView();
                    };

                    initializeScope();
                    initializeView();

                    /**
                     * Toggle the service enabled state.
                     * @param  {Object} service Specific service state from the user.services collection containing:
                     *   @param  {Boolean} service.enabled True if enabled, false otherwise
                     */
                    $scope.toggleService = function(service) {
                        service.enabled = !service.enabled;
                    };

                    /**
                     * Create new user and then handle subsequent updating of the shared userList. If navigation is requested, it will
                     * move back to the list view. If navigation is suppressed, it will reset the form to a well known state and focus
                     * the first element so  the user can start entering data again.
                     * @param  {Object} user
                     * @param  {Boolean} leave if true will navigate back to the list. if false, will clear the form and set focus on the full name.
                     */
                    $scope.create = function(user, leave) {
                        $scope.inProgress = true;
                        alertService.clear();

                        // scroll to the button on submit
                        $anchorScroll("btn-create");

                        return userService
                            .create(user)
                            .then(function(user) {
                                var query;
                                var cachedUserList = dataCache.get("userList");
                                if (cachedUserList) {
                                    $scope.insertSubAndRemoveDupes(user, cachedUserList);
                                    dataCache.set("userList", cachedUserList);
                                    query = { loadFromCache: true };
                                } else {
                                    query = { loadFromCache: false };
                                }

                                baseCtrl.clearPrefetch();
                                alertService.add({
                                    type: "success",
                                    message: LOCALE.maketext("You successfully created the following user: [_1]", (user.real_name || user.full_username)),
                                    id: "createSuccess",
                                    autoClose: 10000
                                });

                                if (leave) {
                                    $scope.loadView("list/rows", query);
                                } else {
                                    var lastDomain = $scope.ui.user.domain;
                                    initializeScope();

                                    // Preserve the last domain so we can create
                                    // a number of accounts on the same domain
                                    $scope.ui.user.domain = lastDomain;
                                    $scope.form.$setPristine();

                                    // Scroll to the top of the form to restart
                                    $anchorScroll("top");

                                    $timeout(function() {

                                        // Set the focus on the first field
                                        var el = angular.element("#full-name");
                                        if (el) {
                                            el.focus();
                                        }
                                    }, 10);
                                }
                            }, function(error) {
                                var name = user.real_name || (user.username + "@" + user.domain);
                                error = error.error || error;

                                alertService.add({
                                    type: "danger",
                                    message: LOCALE.maketext("The system failed to create the “[_1]” user with the following error: [_2]", name, error),
                                    id: "createError"
                                });
                                $anchorScroll("top");

                                var cachedUserList = dataCache.get("userList");
                                if (error.user && cachedUserList) {
                                    $scope.insertSubAndRemoveDupes(error.user, cachedUserList);
                                    dataCache.set("userList", cachedUserList);
                                }

                                baseCtrl.clearPrefetch();
                            })
                            .finally(function() {
                                $scope.inProgress = false;
                            });
                    };

                    // Handle the case where the user clears the homedir box
                    // and needs to know what the home directory folders are?
                    // Normally, the typeahead wont send this.
                    $scope.$watch("ui.user.services.ftp.homedir", function() {
                        if (!$scope.ui.user.services.ftp.homedir &&
                            $scope.form.txtFtpHomeDirectory &&
                            !$scope.form.txtFtpHomeDirectory.$pristine) {
                            $scope.form.txtFtpHomeDirectory.$setViewValue("/");
                        }
                    });

                    $scope.$watch("ui.user.services.webdisk.homedir", function() {
                        if (!$scope.ui.user.services.webdisk.homedir &&
                            $scope.form.txtWebDiskHomeDirectory &&
                            !$scope.form.txtWebDiskHomeDirectory.$pristine) {
                            $scope.form.txtWebDiskHomeDirectory.$setViewValue("/");
                        }
                    });

                    // Update the home directories as the user types
                    $scope.$watch("ui.user.username + '@' + ui.user.domain", function(newValue, oldValue) {
                        var parts = newValue.split("@");

                        // Update the ftp homedir
                        if (!$scope.ui.user.services.ftp.isCandidate && $scope.form.txtFtpHomeDirectory && $scope.form.txtFtpHomeDirectory.$pristine) {
                            $scope.ui.user.services.ftp.homedir = $scope.ui.docrootByDomain[parts[1]] + "/" + parts[0];
                        }

                        // Update the webdisk homedir
                        if (!$scope.ui.user.services.webdisk.isCandidate && $scope.form.txtWebDiskHomeDirectory && $scope.form.txtWebDiskHomeDirectory.$pristine) {
                            $scope.ui.user.services.webdisk.homedir = $scope.ui.docrootByDomain[parts[1]] + "/" + parts[0];
                        }
                    });
                }
            ]
        );

        return controller;
    }
);

/*
# user_manager/views/addController.js             Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/views/editController',[
        "angular",
        "lodash",
        "cjt/util/locale",
        "app/views/addEditController",
        "cjt/directives/alertList",
        "cjt/directives/toggleLabelInfoDirective",
        "cjt/directives/toggleSwitchDirective",
        "cjt/services/alertService",
        "cjt/directives/spinnerDirective",
        "app/directives/issueList",
        "app/services/userService",
        "cjt/services/dataCacheService",
    ],
    function(angular, _, LOCALE, baseCtrlFactory) {

        // Retrieve the current application
        var app = angular.module("App");

        // Setup the controller
        var controller = app.controller(
            "editController", [
                "$scope",
                "$route",
                "$routeParams",
                "$timeout",
                "$location",
                "$anchorScroll",
                "userService",
                "alertService",
                "spinnerAPI",
                "dataCache",
                "defaultInfo",
                "quotaInfo",
                "emailDaemonInfo",
                "ftpDaemonInfo",
                "webdiskDaemonInfo",
                "features",
                function(
                    $scope,
                    $route,
                    $routeParams,
                    $timeout,
                    $location,
                    $anchorScroll,
                    userService,
                    alertService,
                    spinnerAPI,
                    dataCache,
                    defaultInfo,
                    quotaInfo,
                    emailDaemonInfo,
                    ftpDaemonInfo,
                    webdiskDaemonInfo,
                    features
                ) {

                    var baseCtrl = baseCtrlFactory($scope, userService, emailDaemonInfo, ftpDaemonInfo, webdiskDaemonInfo, features, defaultInfo, quotaInfo, alertService);

                    /**
                     * Setup the scope for this controller.
                     *
                     * @method initializeScope
                     * @private
                     */
                    var initializeScope = function() {
                        baseCtrl.initializeScope();
                    };


                    /**
                     * Setup the view for this controller.
                     *
                     * @method initializeView
                     * @private
                     */
                    var initializeView = function() {
                        baseCtrl.initializeView();
                    };


                    initializeScope();
                    initializeView();

                    /**
                     * Toggle the service enabled state.
                     *
                     * @method  toggleService
                     * @scope
                     * @param  {Object} service Specific service state from the user.services collection containing:
                     *   @param  {Boolean} service.enabled True if enabled, false otherwise
                     */
                    $scope.toggleService = function(service) {
                        service.enabled = !service.enabled;
                    };

                    /**
                     * Update a user
                     *
                     * @method  updateUser
                     * @private
                     * @param  {Object} user
                     * @return {Promise}
                     */
                    function updateUser(user) {
                        spinnerAPI.start("loadingSpinner");
                        $scope.ui.isSaving = true;
                        return userService.edit(user).then(function(user) {

                            // Update the item in the list
                            var cachedUserList = dataCache.get("userList");
                            var loadFromCache = false;
                            if (cachedUserList) {
                                $scope.insertSubAndRemoveDupes(user, cachedUserList);
                                dataCache.set("userList", cachedUserList);
                                loadFromCache = true;
                            }
                            spinnerAPI.stop("loadingSpinner");
                            $scope.ui.isSaving = false;
                            $scope.loadView("list/rows", { loadFromCache: loadFromCache });
                            alertService.add({
                                type: "success",
                                message: LOCALE.maketext("The system successfully updated the following user: [_1]", user.full_username),
                                id: "updateUserSuccess",
                                autoClose: 10000
                            });
                        }, function(error) {
                            error = error.error || error;
                            alertService.clear();
                            alertService.add({
                                type: "danger",
                                message: LOCALE.maketext("The system failed to update the “[_1]” user with the following error: [_2]", user.full_username, error),
                                id: "updateFailedErrorServer"
                            });
                            spinnerAPI.stop("loadingSpinner");
                            $scope.ui.isSaving = false;
                            $anchorScroll("top");
                        });
                    }

                    /**
                     * Promote a service into a user and update with the other changes
                     *
                     * @method updateService
                     * @private
                     * @param  {Object} user
                     * @return {Promise}
                     */
                    function updateService(user) {
                        spinnerAPI.start("loadingSpinner");
                        $scope.ui.isSaving = true;

                        if (!$scope.canPromote(user)) {

                            // Use the old APIs since it can't be promoted
                            return userService.editService(user, $scope.ui.originalService).then(function() {

                                // We don't get back the data from the old apis, so for now,
                                // just reload the whole lister from an ajax call.
                                $scope.loadView("list/rows", { loadFromCache: false });
                                alertService.add({
                                    type: "success",
                                    message: LOCALE.maketext("The system successfully modified the service account: [_1]", user.full_username),
                                    id: "updateServiceSuccess",
                                    autoClose: 10000
                                });
                            }).catch(function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: LOCALE.maketext("The system failed to modify the service account for “[_1]”: [_2]", user.full_username, error),
                                    id: "updateServiceFailed",
                                });
                                $anchorScroll("top");
                            }).finally(function() {
                                spinnerAPI.stop("loadingSpinner");
                                $scope.ui.isSaving = false;
                            });
                        } else {

                            // Promote to a subaccount with a forced link and then perform the update.
                            return userService.link(user, $scope.ui.originalServiceType, true).then(function(sub) {

                                // It should be a subaccount now. Save the updated user back to the userList.
                                var cachedUserList = dataCache.get("userList");
                                $scope.insertSubAndRemoveDupes(user, cachedUserList);
                                dataCache.set("userList", cachedUserList);

                                // Now stage the edits
                                user.type = "sub";
                                user.guid = sub.guid;
                                return updateUser(user);
                            }, function(error) {
                                alertService.clear();
                                alertService.add({
                                    type: "danger",
                                    message: LOCALE.maketext("The system failed to upgrade the “[_1]” service account to a [asis,subaccount] with the following error: [_2]", user.full_username, error),
                                    id: "updateFailedErrorServer"
                                });
                                $anchorScroll("top");
                            }).finally(function() {
                                spinnerAPI.stop("loadingSpinner");
                                $scope.ui.isSaving = false;
                            });
                        }
                    }

                    /**
                     * Update the user with the properties that have changed.
                     *
                     * @method  update
                     * @scope
                     * @param  {Object} user
                     * @return {Promise}
                     */
                    $scope.update = function(user) {
                        $anchorScroll("btn-save");

                        switch ($scope.mode) {
                            case "subaccount":
                                return updateUser(user);
                            case "service":
                                return updateService(user);
                            default:
                                alertService.clear();
                                alertService.add({
                                    type: "danger",
                                    message: LOCALE.maketext("The system did not recognize the update mode: [_1]", $scope.mode),
                                    id: "updateUnrecognizedMode"
                                });
                                return;
                        }
                    };

                    /**
                     * Test if there is an async server-side request running.
                     *
                     * @method isInProgress
                     * @return {Boolean} true if a request is being processed on the server. false otherwise.
                     */
                    $scope.isInProgress = function() {
                        return $scope.ui.isSaving || $scope.ui.isLoading;
                    };

                    /**
                     * Unlink the specific service from the user.
                     *
                     * @method unlinkService
                     * @param  {Object} user    Definition of the subaccount from which to unlink a service
                     * @param  {String} serviceType The name of the service to unlink
                     * @return {Promise}
                     */
                    $scope.unlinkService = function(user, serviceType) {
                        spinnerAPI.start("loadingSpinner");
                        $scope.ui.isSaving = true;

                        return userService.unlink(user, serviceType).then(function() {

                            // Invalidate the cache
                            dataCache.remove("userList");

                            // Load the subuser
                            return loadSubuser(user.guid).then(function() {
                                spinnerAPI.stop("loadingSpinner");
                                $scope.ui.isSaving = false;

                                alertService.add({
                                    type: "success",
                                    message: LOCALE.maketext("The system successfully unlinked the “[_1]” service.", serviceType),
                                    id: "unlinkServiceSuccess",
                                    autoClose: 10000
                                });
                            });
                        }, function(error) {
                            alertService.clear();
                            alertService.add({
                                type: "danger",
                                message: LOCALE.maketext("The system failed to unlink the “[_1]” service with the following error: [_2]", serviceType, error),
                                id: "unlinkServiceFailed"
                            });
                            spinnerAPI.stop("loadingSpinner");
                            $scope.ui.isSaving = false;
                            $anchorScroll("top");
                        });
                    };

                    /**
                     * Check if this user is allowed to edit the service.  It should be allowed if:
                     *  1) The user can be promoted to a subaccount
                     *  2) The user cannot be promoted, but the service is already enabled
                     * Otherwise, it should not allow.
                     *
                     * @method  isAllowed
                     * @scope
                     * @param  {Object}  user
                     * @param  {Object}  service
                     * @return {Boolean}      true if the service can be edited, false otherwise.
                     */
                    $scope.isAllowed = function(user, service) {

                        // If you can promote, then all services are on the table.
                        // Otherwise, only the one currently enabled is allowed.
                        return $scope.canPromote(user) || service.enabled;
                    };

                    /**
                     * Check if we need to set the password to modify either enabled digest
                     * or enable webdisk service with digest.
                     *
                     * @method  _needsPassword
                     * @private
                     * @param  {Object} user            Current user
                     * @param  {Object} originalService Original webdisk configuration at load time in the editor.
                     * @return {Boolean}                true if we need to also set the password, false otherwise.
                     *
                     */
                    function _needsPassword(user, originalService) {
                        if ((user.type === "service" &&
                             ((originalService.enabled === false) ||
                              (originalService.enabledigest === false))) ||
                            (user.type === "sub" &&
                                ((originalService.enabled === false) ||
                                 (originalService.enabledigest === false)))) {

                            // ------------------------------------------------------------------
                            // TODO: The above condition makes you change your password more then
                            // should be required. Actually we need to see if the digest auth
                            // hash is stored for the sub-account, but we don't have that ability
                            // right now, so forcing all changes to require a password. Fix this
                            // in case LC-3185. It should be something like:
                            //
                            //    if ((user.type === "service" &&
                            //     originalService.enabledigest === false) ||
                            //    (user.type === "sub" && !user.has_digest_auth_hash &&
                            //        ( (originalService.enabled === false) ||
                            //          (originalService.enabledigest === false)))) {
                            //
                            // ------------------------------------------------------------------
                            return true;
                        } else {
                            return false;
                        }
                    }

                    /**
                     * Check if we can enable the digest controls.
                     *
                     * @method  canEnabledDigest
                     * @scope
                     * @param  {Object} user
                     * @return {Boolean} true if we can enable the digest auth checkbox, false otherwise.
                     */
                    $scope.canEnableDigest = function(user) {
                        if (_needsPassword(user, $scope.ui.originalServices["webdisk"])) {

                            // Password must be defined to enable the digest controls
                            // when using the older style api calls since we don't have
                            // a call for enabling/disabling digest without the password
                            // in these older style apis or if a service has been merged,
                            // but does not share the password with sub-account.
                            //
                            return user.password ? true : false;
                        } else {
                            return true;
                        }
                    };

                    /**
                     * Check if we should show the warning about requiring the password
                     * to enabled/disable digest auth.
                     *
                     * @method  showDigestRequiresPasswordWarning
                     * @scope
                     * @param  {Object} user
                     * @return {Boolean}     true if we should show the warning, false otherwise.
                     */
                    $scope.showDigestRequiresPasswordWarning = function(user) {
                        return _needsPassword(user, $scope.ui.originalServices["webdisk"]) &&
                               user.services["webdisk"].enabled;
                    };

                    /**
                     * Check to see if we should show the Unlink button for the service.
                     * @param  {Object} user      The subaccount for which the unlink would occur if permitted.
                     * @param  {Object} serviceType The service type being checked.
                     * @return {Boolean}          If true, show the Unlink button.
                     */
                    $scope.showUnlink = function(user, serviceType) {
                        return !user.synced_password &&
                               !user.services[serviceType].isNew &&
                               !user.services[serviceType].isCandidate;
                    };

                    /**
                     * Check if this user is allowed to turn on/off service.  It should be allowed if:
                     *  1) The user is of type sub
                     *  2) The user is of type service and has no siblings and has not been dismissed
                     * Otherwise, it should not allow.
                     *
                     * @method  canPromote
                     * @scope
                     * @param  {Object}  user
                     * @return {Boolean}      true if the service can toggled, false otherwise.
                     */
                    $scope.canPromote = function(user) {
                        if (user.type === "sub") {
                            return true;
                        } else if (user.type === "service") {
                            if (user.has_siblings ||     // If it has siblings the the user has not elected what to do with this service account yet, so it needs to be linked or dismissed first
                                user.sub_account_exists ) { // If it has an existing subaccount, then the account should remain independent now so you can not enable/disable the service as part of the service account, but must delete it instead to do this.
                                return false;
                            } else {
                                return true;
                            }
                        }
                    };


                    // Handle the case where the user clears the homedir box
                    // and needs to know what the home directory folders are?
                    // Normally, the typeahead wont send this.
                    $scope.$watch("ui.user.services.ftp.homedir", function() {
                        if (!$scope.ui.user.services.ftp.homedir &&
                            $scope.form.txtFtpHomeDirectory &&
                            !$scope.form.txtFtpHomeDirectory.$pristine) {
                            $scope.form.txtFtpHomeDirectory.$setViewValue("/");
                        }
                    });

                    $scope.$watch("ui.user.services.webdisk.homedir", function() {
                        if (!$scope.ui.user.services.webdisk.homedir &&
                            $scope.form.txtWebDiskHomeDirectory &&
                            !$scope.form.txtWebDiskHomeDirectory.$pristine) {
                            $scope.form.txtWebDiskHomeDirectory.$setViewValue("/");
                        }
                    });

                    // Make sure that only orignal services are enabled if the
                    // passwords are not synced, since we can not add services
                    // unless they provide a password in this case.
                    $scope.$watch("ui.user.password", function(value) {
                        if (value === "" && !$scope.canAddServices($scope.ui.user)) {

                            // Restore services to their original enabled state
                            // since you must provide a password to enable them.
                            ["email", "ftp", "webdisk"].forEach(function(name) {
                                $scope.ui.user.services[name].enabled = $scope.ui.originalServices[name].enabled;
                            });
                        }
                    });

                    /**
                     * Test if we can add services.
                     *
                     * @method  canAddServices
                     * @scope
                     * @param  {Object} user
                     * @return {Boolean}     true if the user can add services, false otherwise
                     */
                    $scope.canAddServices = function(user) {
                        if (user.synced_password) {
                            return true;
                        } else {

                            // We must have a password to add services, and it will sync all them.
                            return !!user.password;
                        }
                    };

                    /**
                     * Load a sub user into the view
                     *
                     * @method loadSubuser
                     * @private
                     * @param  {String} guid Unique identifier
                     */
                    function loadSubuser(guid) {
                        if (!guid) {
                            alertService.clear();
                            alertService.add({
                                type: "warn",
                                message: LOCALE.maketext("You did not select a [asis,subaccount]."),
                                id: "missingUserWarning"
                            });
                            $scope.loadView("list/rows", { loadFromCache: true });
                        } else {
                            $scope.ui.isLoading = true;
                            $scope.ui.user = null;
                            spinnerAPI.start("loadingSpinner");
                            $scope.ui.user = userService.emptyUser();
                            return userService.fetchUser($routeParams.guid).then(
                                function(user) {
                                    $scope.ui.user = user;
                                    $scope.ui.originalServices = _.cloneDeep(user.services);

                                    // Set the service values to those from the candidates
                                    $scope.useCandidateServices(user, user);

                                    // The API doesn't consider the invitation status to be an issue, but we will
                                    // add it to the issue list for display purposes here on the edit screen.
                                    userService.addInvitationIssues(user);

                                    spinnerAPI.stop("loadingSpinner");
                                    $scope.ui.isLoading = false;
                                },
                                function(error) {
                                    alertService.clear();
                                    alertService.add({
                                        type: "warn",
                                        message: LOCALE.maketext("The system could not load the [asis,subaccount] with the following error: [_1]", error),
                                        id: "missingUserWarning"
                                    });
                                    $scope.loadView("list/rows", { loadFromCache: true });
                                });
                        }
                    }

                    /**
                     * Load the service by type and username
                     *
                     * @method loadService
                     * @private
                     * @param  {String} type         email|ftp|webdisk
                     * @param  {String} fullUsername <username>@<domain>
                     */
                    function loadService(type, fullUsername) {
                        if (!type || !fullUsername) {
                            alertService.clear();
                            alertService.add({
                                type: "warn",
                                message: LOCALE.maketext("You did not select a valid service account."),
                                id: "missingUserWarning"
                            });
                            $scope.loadView("list/rows", { loadFromCache: true });
                        } else {
                            $scope.ui.isLoading = true;
                            $scope.ui.user = null;
                            spinnerAPI.start("loadingSpinner");
                            $scope.ui.user = userService.emptyUser();

                            return userService.fetchService(type, fullUsername).then(
                                function(user) {
                                    $scope.ui.user = user;

                                    if ( type === "email" && user.services.email.quota === 0 && $scope.defaults.email.unlimitedValue !== 0 ) {
                                        user.services.email.quota = $scope.defaults.email.unlimitedValue;
                                    }

                                    $scope.ui.originalService = _.cloneDeep(user.services[type]);
                                    $scope.ui.originalServiceType = type;
                                    $scope.ui.originalServices = _.cloneDeep(user.services);
                                    $scope.ui.user.synced_password = true;
                                    spinnerAPI.stop("loadingSpinner");
                                    $scope.ui.isLoading = false;
                                },
                                function(error) {
                                    alertService.clear();
                                    alertService.add({
                                        type: "warn",
                                        message: LOCALE.maketext("The system could not load the service account with the following error: [_1]", error),
                                        id: "missingServiceWarning"
                                    });
                                    $scope.loadView("list/rows", { loadFromCache: true });
                                }).finally(function() {
                                if ($scope.ui.user && !$scope.canPromote($scope.ui.user)) {
                                    alertService.add({
                                        type: "warn",
                                        message: LOCALE.maketext("The system cannot upgrade this service account to a [asis,subaccount]. To access all the features within this interface, you must delete any accounts that share the same username or link this service account to a [asis,subaccount]."),
                                        id: "cannotPromoteWarning"
                                    });
                                }
                            });
                        }
                    }

                    /**
                     * Show the unsynced password warning if appropriate.
                     *
                     * @private
                     * @method showUnsyncedPasswordWarning
                     */
                    function showUnsyncedPasswordWarning() {
                        if (!$scope.ui.user.synced_password) {
                            alertService.add({
                                type: "warn",
                                message: LOCALE.maketext("You cannot enable additional services for this [asis,subaccount] until you set its password. When you set the password, all of your services will utilize the same password."),
                                id: "unsyncedPasswordWarning",
                                replace: false,
                                counter: false
                            });
                        }
                    }

                    /**
                     * Performs the link and dismiss operations on any merge candidate services
                     * that have been flagged with willLink or willDismiss.
                     *
                     * @method linkServices
                     * @param  {Object} user   The user whose candidate services will be processed.
                     */
                    $scope.linkServices = function(user) {
                        spinnerAPI.start("loadingSpinner");
                        $scope.ui.isSaving = true;

                        return userService.linkAndDismiss(user).then(function(result) {
                            var cachedUserList = dataCache.get("userList");
                            if (cachedUserList) {
                                $scope.insertSubAndRemoveDupes(result, cachedUserList);
                                dataCache.set("userList", cachedUserList);
                            }

                            $scope.ui.user.synced_password = result.synced_password;
                            result.linked_services.forEach(function(serviceName) {
                                $scope.ui.user.services[serviceName] = result.services[serviceName];
                                $scope.ui.originalServices[serviceName] = _.cloneDeep(result.services[serviceName]);
                            });
                            alertService.add({
                                type: "success",
                                message: result.synced_password ?
                                    LOCALE.maketext("The system successfully linked the service account to the “[_1]” user’s [asis,subaccount]. The service account passwords have not changed.", result.full_username) :
                                    LOCALE.maketext("The system successfully linked the service account to the “[_1]” user’s [asis,subaccount]. The service account passwords have not changed. You must provide a new password if you enable any additional [asis,subaccount] services.", result.full_username),
                                id: "link-user-success",
                                replace: false
                            });
                        }).catch(function(error) {
                            alertService.add({
                                type: "danger",
                                message: error.error ? error.error : error,
                                id: (error.call === "link") ? "link-error" : "link-and-dismiss-error"
                            });
                            $anchorScroll("top");
                        }).finally(function() {
                            $scope.ui.isSaving = false;
                            spinnerAPI.stop("loadingSpinner");
                        });
                    };


                    if (/^\/edit\/subaccount/.test($route.current.originalPath)) {
                        $scope.mode = "subaccount";
                        loadSubuser($routeParams.guid).finally(showUnsyncedPasswordWarning);
                    } else if (/^\/edit\/service/.test($route.current.originalPath)) {
                        $scope.mode = "service";
                        loadService($routeParams.type, $routeParams.user).finally(showUnsyncedPasswordWarning);
                    }
                }
            ]
        );

        return controller;
    }
);

/*
# user_manager/services/serverInfoService         Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/services/serverInfoService',[

        // Libraries
        "angular",
        "lodash",

        // CJT
        "cjt/util/parse",
    ],
    function(angular, _, PARSER) {

        // Fetch the current application
        var app = angular.module("App");

        /**
         * Setup the domainlist models API service
         */
        app.factory("serverInfoService", [ function() {

            var self = {

                /**
                *  Helper method that remodels the ssl server information for use in javascript
                * @param  {Object} sslInfo - SSL information object retrieved from the server.
                * @return {Object} Sanitized data structure.
                *  Containing the following:
                *    @param {String} cert_match_method
                *    @param {Date String} cert_valid_not_after
                *    @param {Boolean} is_self_signed
                *    @param {Boolean} is_wild_card
                *    @param {Boolean} is_valid
                *    @param {String} ssldomain
                *    @param {Boolean} ssldomain_matches_cert
                */
                prepareSslInfo: function(sslInfo) {

                    // Normalize the date
                    sslInfo.cert_valid_not_after = new Date(sslInfo.cert_valid_not_after * 1000);
                    sslInfo.cert_valid = new Date() < sslInfo.cert_valid_not_after;

                    // Normalize the booleans
                    sslInfo.is_self_signed = PARSER.parsePerlBoolean(sslInfo.is_self_signed);
                    sslInfo.is_wild_card = PARSER.parsePerlBoolean(sslInfo.is_wild_card);
                    sslInfo.ssldomain_matches_cert = PARSER.parsePerlBoolean(sslInfo.ssldomain_matches_cert);

                    return sslInfo;
                },

                /**
                *  Helper method that remodels the ftp daemon info for use in javascript
                * @param  {Object} daemon - Damon object passed from the backend.
                * @return {Object} Sanitized data structure.
                */
                prepareFtpDaemonInfo: function(daemon) {

                    // Normalize the booleans
                    daemon.enabled                       = PARSER.parsePerlBoolean(daemon.enabled);
                    daemon.supports.quota                = PARSER.parsePerlBoolean(daemon.supports.quota);
                    daemon.supports.login_without_domain = PARSER.parsePerlBoolean(daemon.supports.login_without_domain);
                    return daemon;
                },

                /**
                 * Helper method to remodel the default data passed from the backend
                 * @param  {Object} defaults - Defaults object passed from the backend with a property for each service
                 *   The service includes the following structure:
                 *
                 *      @param {Number}  default_quota    - When the user chooses to limit the quota, this is the default value filled it the textbox.
                 *      @param {Number}  default_value    - The true default for the control (0 unlimited, otherwise, limit to the value)
                 *      @param {Boolean} select_unlimited - Select unlimited by default.
                 *      @param {Number}  max_quota        - Maximum quota allowed.
                 * @return {[type]}          [description]
                 */
                prepareDefaultInfo: function(defaults) {
                    _.each(["email", "ftp", "webdisk"], function(serviceName) {
                        var service = defaults[serviceName];
                        _.each(["default_quota", "default_value", "max_quota", "unlimitedValue"], function(fieldName) {
                            service[fieldName] = parseInt(service[fieldName], 10);
                            if (isNaN(service[fieldName])) {
                                service[fieldName] = 0;
                            }
                        });
                        service.select_unlimited = PARSER.parsePerlBoolean(service.select_unlimited);
                    });
                    return defaults;
                },

                /**
                 * Helper method that remodels the cpanel account's quota info passed from the backend.
                 *
                 * @method prepareQuotaInfo
                 * @param  {Object} quotaInfo   The quota information from the backend.
                 * @return {Object}             Remodeled data structure.
                 */
                prepareQuotaInfo: function(quotaInfo) {
                    return self.parseObj(quotaInfo, {
                        under_megabyte_limit: PARSER.parsePerlBoolean,
                        under_inode_limit: PARSER.parsePerlBoolean,
                        under_quota_overall: PARSER.parsePerlBoolean,

                        inodes_used: PARSER.parseInteger,
                        inode_limit: PARSER.parseInteger,
                        inodes_remain: PARSER.parseInteger,

                        megabytes_used: PARSER.parseNumber,
                        megabyte_limit: PARSER.parseNumber,
                        megabytes_remain: PARSER.parseNumber
                    });
                },

                /**
                 * Parses properties on an object according to a map.
                 *
                 * @method parseObj
                 * @param  {Object} obj        The object to process.
                 * @param  {Object} parseMap   A map of property names to transformation methods. The method value
                 *                             for a particular key will be used to process the property value on
                 *                             the target object.
                 * @return {Object}            The original object, which has now been processed.
                 */
                parseObj: function(obj, parseMap) {
                    angular.forEach(parseMap, function(parseFn, key) {
                        obj[key] = parseFn( obj[key] );
                    });

                    return obj;
                }

            };

            return self;
        }]);
    }
);

/*
# user_manager/index.js                           Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false, define: false, PAGE: false */


define(
    'app/index',[
        "angular",
        "jquery",
        "cjt/core",
        "cjt/modules",
        "ngRoute",
        "uiBootstrap"
    ],
    function(angular, $, CJT) {
        return function() {

            // First create the application
            angular.module("App", [
                "ngRoute",
                "ui.bootstrap",
                "cjt2.cpanel",
                "cpanel.services.directoryLookup"
            ]);

            // Then load the application dependencies
            var app = require(
                [

                    // Application Modules
                    "cjt/bootstrap",
                    "cjt/views/applicationController",
                    "cjt/services/autoTopService",
                    "app/views/listController",
                    "app/views/addController",
                    "app/views/editController",
                    "app/services/serverInfoService"
                ], function(BOOTSTRAP) {

                    var app = angular.module("App");

                    app.firstLoad = {
                        userList: true,
                    };

                    // setup the email server service data for the application
                    app.factory("emailDaemonInfo", function() {
                        return {
                            enabled: PAGE.isEmailRunning,
                            name: "exim",
                            supports: {
                                quota: true
                            }
                        };
                    });

                    // setup the ftp server service data for the application
                    app.factory("ftpDaemonInfo", [
                        "serverInfoService",
                        function(serverInfoService) {
                            return serverInfoService.prepareFtpDaemonInfo(PAGE.ftpDaemonInfo);
                        }
                    ]);

                    // setup the webdisk server service data for the application
                    app.factory("webdiskDaemonInfo", function() {
                        return {
                            enabled: PAGE.isWebdavRunning,
                            name: "cpdavd",
                            supports: {
                                quota: false
                            }
                        };
                    });

                    // setup the ssl data for the server
                    app.factory("sslInfo", [
                        "serverInfoService",
                        function(serverInfoService) {
                            return serverInfoService.prepareSslInfo(PAGE.sslInfo);
                        }
                    ]);

                    // Provide the quota info for the cPanel account
                    app.factory("quotaInfo", [
                        "serverInfoService",
                        function(serverInfoService) {
                            return serverInfoService.prepareQuotaInfo(PAGE.quotaInfo);
                        }
                    ]);

                    // setup the defaults for the various services.
                    app.factory("defaultInfo", [
                        "serverInfoService",
                        function(serverInfoService) {
                            return serverInfoService.prepareDefaultInfo(PAGE.serviceDefaults);
                        }
                    ]);

                    // services this account is allowed to work with
                    // based on cpanel account feature control.
                    app.value("features", PAGE.features);

                    // routing
                    app.config([
                        "$routeProvider",
                        function(
                            $routeProvider
                        ) {

                            $routeProvider.when("/list/cards", {
                                controller: "listController",
                                templateUrl: CJT.buildFullPath("user_manager/views/listCardsView.ptt")
                            });

                            $routeProvider.when("/list/rows", {
                                controller: "listController",
                                templateUrl: "user_manager/views/listRowsView.ptt"
                            });

                            $routeProvider.when("/add", {
                                controller: "addController",
                                templateUrl: "user_manager/views/addEditView.ptt"
                            });

                            $routeProvider.when("/edit/subaccount/:guid", {
                                controller: "editController",
                                templateUrl: "user_manager/views/editView.ptt"
                            });

                            $routeProvider.when("/edit/service/:type/:user", {
                                controller: "editController",
                                templateUrl: "user_manager/views/editView.ptt"
                            });

                            $routeProvider.otherwise({
                                "redirectTo": "/list/rows"
                            });
                        }
                    ]);

                    app.run(["autoTopService", function(autoTopService) {
                        autoTopService.initialize();
                    }]);

                    BOOTSTRAP("#content", "App");

                });

            return app;
        };
    }
);

