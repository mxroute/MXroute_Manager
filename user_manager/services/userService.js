/* global define: false */

define(
    [

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
