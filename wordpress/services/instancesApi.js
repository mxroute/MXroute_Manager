/*
 * wordpress/services/instancesApi.js                 Copyright 2017 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false */
/* jshint -W100 */

define([
    "angular",
    "lodash",
    "cjt/util/locale",
    "cjt/io/uapi-request",
    "cjt/io/uapi",
    "cjt/util/parse",

    // Modules without exports
    "cjt/services/APIService",
], function(
    angular,
    _,
    LOCALE,
    APIREQUEST,
    APIDRIVER,
    PARSER
) {
    "use strict";

    var app;
    try {
        app = angular.module("cpanel.wordpress");
    }
    catch(e) {
        // for unit tests that don't load the index.js
        app = angular.module("cpanel.wordpress", []);
    }

    app.factory("instancesApi", [
        "pageState",
        "$q",
        "$log",
        "APIService",
        function(
            pageState,
            $q,
            $log,
            APIService
        ) {

            var _instances;              // List of instances retrieved from the backend.
            var _instancesLookup;        // Lookup table of the instances by the
            var _invalidCount = 0;       // The number of raw entries that didn't make it past the parse filter.

            // We want to periodically update the
            // data if its grown stale.
            var _lastLoaded;
            var _cacheTime = 5 * 60 * 1000; // 5 minutes

            /**
             * @typedef {Instance}
             * @description The Instance includes the following public fields. There are additional
             * fields, but they are not intended for public consumption and may be removed in future
             * releases.
             *
             * @property {String}  id               unique identifier for an instance
             * @property {String}  addon_config     full path to the addon configuration file
             * @property {String}  addon_name       name of the addon perl module
             * @property {String}  addon_type       type of the addon: legacy, modern
             * @property {String}  admin_url        the url to access the admin site
             * @property {String}  admin_username   the username use to log into the admin interface
             * @property {String}  available_version reserved for future use.
             * @property {String}  current_version   reserved for future use.
             * @property {String}  db_name          name of the mysql database where the sites data is stored.
             * @property {String}  db_prefix        sql table prefix used with the tables for this install.
             * @property {String}  db_server        name of the mysql database server, usually localhost.
             * @property {String}  db_type          type of database server: mysql
             * @property {String}  db_usrename      mysql user name that secures the database.
             * @property {String}  domain           the domain where the site is hosted.
             * @property {String}  full_path        the full path where the sites files are hosted.
             * @property {String}  homedir          the cpanel users home directory
             * @property {String}  initial_install_version the version installed at the time the site was created.
             * @property {String}  rel_path         the relative path for the site in the root of the configured domain.
             * @property {String}  site_url         the url to access the site.
             * @property {String}  [migrated_from]  optional, if available, its the addon that originally managed this site before it was converted.
             * @property {Number}  [migrated_on]    optional, if available, its a UNIX timestamp indicating when the migration occurred.
             */

            return {

                /**
                 * Returns the list of installation instances. The method will only attempt a
                 * fetch from the API if the list is not already cached, otherwise it will not.
                 * Use the explicit fetch method if you need to refresh the list.
                 *
                 * @async
                 * @method get
                 * @param  {Object} args   An object specifying method options.
                 *   @param {Boolean} [args.force] If true will reload regardless of the cache state.
                 * @return {Promise} Resolves with an object containing the list of instances and the
                 * @throws {String}  If the remote request fails for any reason.
                 */
                get: function(args) {
                    args = args || {};

                    if( _instances &&
                        !args.force &&
                        !this._isCacheStale() ) {
                        return this._getListFromCache();
                    }
                    // Only load from the pre-fetch on the initial load
                    // otherwise, fetch from the server since its possibly
                    // stale.
                    else if(!args.force && pageState.instances) {
                        try {
                            return this._getListFromPrefetch();
                        } catch(error) {
                            // Fall-back here hoping that the api will return
                            // clean data where the pre-fetch did not for some
                            // reason.
                            return this.fetch();
                        }
                    } else {
                        return this.fetch();
                    }
                },

                /**
                 * Fetch a list of installation instances from the server via UAPI.
                 *
                 * @async
                 * @method fetch
                 * @return {Promise} Resolves with an object containing the list of instances and the
                 *                   number of instances from the API that failed validation.
                 * @throws {String}  If the remote request fails for any reason.
                 */
                fetch: function() {
                    var self = this;

                    if(pageState.instances || pageState.prefetchNonFatalErrors) {
                        delete pageState.instances;
                        delete pageState.prefetchNonFatalErrors;
                    }

                    var apiCall = new APIREQUEST.Class();
                    apiCall.initialize("WordPressInstanceManager", "get_instances");

                    var api = new APIService();
                    return api.deferred(apiCall).promise.then(
                        function success(response) {
                            try {
                                var raw = response && response.data && response.data.instances;
                                var errors = response && response.data && response.data.errors;
                                self._set({
                                    raw:    raw,
                                    parsed: self.parse(raw),
                                });
                                return self._getListFromCache({ nonFatalErrors: errors });
                            }
                            catch(error) {
                                return $q.reject(LOCALE.maketext("The system failed to parse the response from the API: [_1]", error));
                            }
                        },
                        function failure(error) {
                            return $q.reject(
                                LOCALE.maketext("The system failed to retrieve the list of your [asis,WordPress] installations from the server: [_1]", error)
                            );
                        }
                    );
                },

                /**
                 * Fetches a single instance by its id
                 *
                 * @async
                 * @method getById
                 * @param {Object} args
                 *   @param {Number}  args.id Unique identifier for the requested instances.
                 *   @param {Boolean} [args.force] If true will force an update from the backend.
                 * @return {Promise.<Instance>}
                 * @throws {String} If the remote request fails for any reason.
                 */
                getById: function(args) {
                    args = args || {};
                    var self = this;
                    var id = args.id;
                    if (!id) {
                        throw new Error(LOCALE.maketext("[asis,getById()] requires an ID argument."));
                    }

                    if(_instancesLookup &&
                       !args.force &&
                       !this._isCacheStale()) {
                        return self._getInstanceFromCache(id);
                    }
                    // Only load from the pre-fetch on the initial load
                    // otherwise, fetch from the server since its possibly
                    // stale.
                    else if(!args.force && pageState.instances) {
                        try {
                            return self._getListFromPrefetch()
                                       .then(function() {
                                            return self._getInstanceFromCache(id);
                                        }, function() {
                                            return self.fetchById(id);
                                        });
                        } catch(error) {
                            return self.fetchById(id);
                        }
                    }
                    else {
                        return self.fetchById(id);
                    }
                },


                /**
                 * Fetch an instance from the backend by its id.
                 *
                 * @async
                 * @method  fetchById
                 * @param  {String} id Unique identifier for the instance.
                 * @return {Promise.<Instance>}
                 * @throws {Promise.<String>} If the remote request fails for any reason.
                 */
                fetchById: function(id) {
                    if(!id) {
                        throw new Error(LOCALE.maketext("[asis,fetchById()] requires an ID argument."));
                    }

                    var self = this;
                    var apiCall = new APIREQUEST.Class();
                    apiCall.initialize("WordPressInstanceManager", "get_instance_by_id");
                    apiCall.addArgument("id", id);

                    var api = new APIService();
                    var def = api.deferred(apiCall);
                    return def.promise.then(
                        function success(response) {
                            if (response && response.data) {
                                var instance = self._parseInstance(response.data);
                                if (self._validateInstance(instance)) {
                                    self._setById(instance);
                                    return $q.resolve(instance);
                                } else {
                                    return $q.reject(LOCALE.maketext("The system retrieved the [asis,WordPress] installation with the “[_1]” ID, but the returned data contains empty or invalid fields.", id));
                                }
                            }
                            return $q.reject(
                                LOCALE.maketext("The system failed to retrieve the requested [asis,WordPress] installation with the following ID: [_1]", id)
                            );
                        },
                        function failure(error) {
                            return $q.reject(
                                LOCALE.maketext("The system failed to retrieve the requested [asis,WordPress] installation with “[_1]” ID from the server: [_2]", id, error)
                            );
                        }
                    );
                },

                /**
                 * Parses the JavaScript array returned from the list_addon_instances UAPI method. It
                 * filters out any malformed items and returns an array of installation instances, sorted
                 * by domain and installation directory, in that order.
                 *
                 * This method also creates a private hash table with the unique_id as the key for easy
                 * lookups by id within this service.
                 *
                 * @method parse
                 * @param  {Array} rawInstances The array as returned from the API (parse the JSON response first).
                 * @return {Array}              The parsed, filtered, and sorted array.
                 */
                parse: function(rawInstances) {
                    var self = this;
                    if(!angular.isArray(rawInstances)) {
                        throw new Error(LOCALE.maketext("[asis,parse()] requires an array argument."));
                    }

                    // Quick return for the degenerate case
                    if (!rawInstances.length) {
                        return [];
                    }

                    var parsedInstances = rawInstances.map(function(instance) {
                        return self._parseInstance(instance);
                    }).filter(function(parsedInstance) {
                        return self._validateInstance(parsedInstance);
                    });

                    return parsedInstances;
                },

                /**
                 * Find the index of an instance in the instance list (_instances). If no match is found,
                 * the method returns -1.
                 *
                 * @method indexOf
                 * @param  {Instance} search   An object containing domain, full_path, and id properties.
                 * @return {Number}            The index in _instances for the Instance matching the id,
                 *                             domain, and full_path of the search object. If no match is
                 *                             found, the return value is -1.
                 */
                indexOf: function(search) {
                    if(angular.isUndefined(search)) {
                        throw new Error(LOCALE.maketext("[asis,indexOf()] requires an instance object argument."));
                    }

                    // Find the lowest possible index in the list for the search instance's domain/full_path
                    var i = this._findInsertionIndex(search);

                    // Check each subsequent item until we find a matching ID or a non-matching domain/full_path
                    var curr;
                    for( var l = _instances.length; i < l; i++ ) {
                        curr = _instances[i];
                        if( curr.full_path !== search.full_path || curr.domain !== search.domain ) {
                            break;
                        }
                        else if( curr.id === search.id ) {
                            return i;
                        }
                    }
                    return -1;
                },

                /**
                 * Wrapper around _.sortedIndexBy for our sorting method.
                 *
                 * This method assumes that all instances in the instance cache have
                 * been validated (as they should be) and contain domain/full_path
                 * keys, which is what we sort the main list by.
                 *
                 * @method _findInsertionIndex
                 * @param  {Instance} search   The instance to use for search criteria.
                 * @return {Number}            The index where the search instance should
                 *                             be inserted to maintain proper sort order.
                 */
                _findInsertionIndex: function(search) {
                    return _.sortedIndexBy(_instances, search, function(item) {
                        return item.domain + item.full_path;
                    });
                },

                /**
                 * Change a WordPress user's password for a WordPress installation.
                 *
                 * @async
                 * @method changeUserPassword
                 * @param  {String} instanceId   The unique identifier for the installation instance.
                 * @param  {String} username     The user whose password will change.
                 * @param  {String} password     The new password.
                 * @returns {Promise}            Returns if the request is successful.
                 * @throws {String}              If the request fails.
                 */
                changeUserPassword: function(instanceId, username, password) {

                    if (!instanceId) {
                        return $q(function(resolve, reject) {
                            reject(LOCALE.maketext("You must provide an instance ID."));
                        });
                    }

                    if (!username) {
                        return $q(function(resolve, reject) {
                            reject(LOCALE.maketext("You must provide a username."));
                        });
                    }

                    if (!password) {
                        return $q(function(resolve, reject) {
                            reject(LOCALE.maketext("You must provide a password."));
                        });
                    }

                    var apiCall = new APIREQUEST.Class();
                    apiCall.initialize("WordPressInstanceManager", "change_user_password");
                    apiCall.addArgument("id",       instanceId);
                    apiCall.addArgument("user",     username);
                    apiCall.addArgument("password", password);

                    var api = new APIService();
                    return api.deferred(apiCall).promise;
                },

                /**
                 * Configure the major and minor autoupdate settings for a WordPress site.
                 *
                 * This has the side effect of updating the instance in the cache if any changes
                 * occur while processing this request on the server.
                 *
                 * @async
                 * @method configureAutoupdate
                 * @param  {String} instanceId   The unique identifier for the installation instance.
                 * @param  {Boolean} major     Whether to enable major updates
                 * @param  {Boolean} minor     Whether to enable minor and security updates
                 * @return {Promise.<Instance>} When successful.
                 * @throws {String} If the remote request fails.
                 */
                configureAutoupdate: function(instanceId, major, minor) {

                    var self = this;

                    if (!instanceId) {
                        return $q(function(resolve, reject) {
                            reject(LOCALE.maketext("You must provide an instance ID."));
                        });
                    }

                    var apiCall = new APIREQUEST.Class();
                    apiCall.initialize("WordPressInstanceManager", "configure_autoupdate");
                    apiCall.addArgument("id",       instanceId);
                    apiCall.addArgument("autoupdate.core.major", major ? 1 : 0);
                    apiCall.addArgument("autoupdate.core.minor", minor ? 1 : 0);

                    var api = new APIService();
                    return api.deferred(apiCall).promise.then(function(response){
                        if (response && response.data && response.data.after) {
                            var after = self._parseInstance(response.data.after);
                            var id = response.data.after.id;
                            if (self._validateInstance(after)) {
                                // Remove the old one from the cache.
                                self._removeById(instanceId);
                                // Add the new one to the cache.
                                self._setById(after);
                                return $q.resolve(after);
                            } else {
                                return $q.reject(LOCALE.maketext("The system retrieved the [asis,WordPress] installation with the “[_1]” ID, but the returned data contains empty or invalid fields.", id));
                            }
                        }
                        else {
                            var instance = _instancesLookup[instanceId];
                            if( instance ) {
                                instance.autoupdate = major || minor;
                            }
                        }
                        return $q.resolve();
                    });
                },

                /**
                 * Change the WordPress database password for a WordPress installation.
                 *
                 * @async
                 * @method changeDbPassword
                 * @param  {String} instanceId   The unique identifier for the installation instance.
                 * @param  {String} password     The new password.
                 * @return {Promise} When the remote request is successful
                 * @throws {String} If the remote request failed.
                 */
                changeDbPassword: function(instanceId, password) {

                    if (!instanceId) {
                        return $q(function(resolve, reject) {
                            reject(LOCALE.maketext("You must provide an instance ID."));
                        });
                    }

                    if (!password) {
                        return $q(function(resolve, reject) {
                            reject(LOCALE.maketext("You must provide a password."));
                        });
                    }

                    var apiCall = new APIREQUEST.Class();
                    apiCall.initialize("WordPressInstanceManager", "change_db_password");
                    apiCall.addArgument("id",       instanceId);
                    apiCall.addArgument("password", password);

                    var api = new APIService();
                    return api.deferred(apiCall).promise;
                },

                /**
                 * Clears the local cache so the services caches are in an uninitilized state.
                 *
                 * @method clear
                 */
                clear: function() {
                    _instances = undefined;
                    _instancesLookup = {};
                    _invalidCount = 0;
                    _lastLoaded = undefined;
                },

                /**
                 * Determine if the cache is stale.
                 *
                 * @method _isCacheStale
                 * @private
                 * @return {Boolean} true if the cache is stale, false otherwise.
                 */
                _isCacheStale: function() {
                    return !_lastLoaded || (Date.now() - _lastLoaded > _cacheTime);
                },

                /**
                 * Validate an instances that just was adjusted
                 * from backend.
                 *
                 * @method _validateInstance
                 * @private
                 * @param  {Object} instance Parsed instances otherwise ready for use.
                 * @return {Boolean}         true if the instance is valid, false otherwise.
                 */
                _validateInstance: function(instance) {
                    var keys = Object.keys(instance);
                    if (!keys || !keys.length) {
                        return false;
                    }

                    // Remove any instances that have missing
                    // or invalid information
                    var isValid = keys.every(function(key) {
                        var value = instance[key];

                        // All fields should be defined
                        if( !angular.isDefined( value ) ) {
                            $log.warn( LOCALE.maketext("The configuration contains an invalid field, “[_1]”, with a value of, “[_2]”.", key, "undefined"));
                            return false;
                        }

                        // String fields should be non-empty, except for rel_path which may be empty.
                        if (angular.isString( value ) && key !== "rel_path" && value === "") {
                            $log.warn( LOCALE.maketext("The configuration contains an invalid field, “[_1]”, with a value of, “[_2]”.", key, "empty string"));
                            return false;
                        }

                        return true;
                    });

                    if(!isValid) {
                        $log.warn( LOCALE.maketext("The instance “[_1]” does not contain a required value.", JSON.stringify(instance)) );
                    }

                    return isValid;
                },

                /**
                 * Parse a backend instance so it is ready for use in the application.
                 *
                 * @method _parseInstance
                 * @private
                 * @param  {Object} instance Raw instance provide by prefetch or by api call.
                 * @return {Object}          Cleaned up instance ready for JavaScript usage.
                 */
                _parseInstance: function(instance) {
                    if (angular.isDefined(instance.autoupdate)) {
                        instance.autoupdate = PARSER.parsePerlBoolean(instance.autoupdate);
                    }

                    if( angular.isString(instance.rel_path) ) {
                        instance.rel_path = instance.rel_path.replace(/\/+$/, "");
                    }

                    if( angular.isString(instance.full_path) ) {
                        instance.full_path = instance.full_path.replace(/\/+$/, "");
                    }

                    if( angular.isString(instance.domain) ) {
                        instance.domain = instance.domain.toLocaleLowerCase();
                    }

                    return instance;
                },

                /**
                 * Updates the cached stats for the service
                 *
                 * @private
                 * @method  _set
                 * @param {Object} args - Object with the following properties
                 *   @param {Array} args.raw    - Array of objects as passed from the server.
                 *   @param {Array} args.parsed - Array of objects as returned by the parse() method.
                 */
                _set: function(args) {
                    _instances = Object.freeze( this._sort(args.parsed) );

                    // Reset the lookup table and store the new values
                    _instancesLookup = {};
                    _instances.forEach(function(instance) {
                        _instancesLookup[ instance.id ] = instance;
                    });

                    _invalidCount = args.raw.length - _instances.length;
                    _lastLoaded = Date.now();
                },

                /**
                 * Removes an instance from the cache by its id.
                 *
                 * @private
                 * @method _removeById
                 * @param  {String} id Unique identifier for the install
                 */
                _removeById: function(id) {
                    var instance = _instancesLookup[id];
                    if (instance) {
                        delete _instancesLookup[id];

                        var index = this.indexOf(instance);
                        if (index > -1) {
                            // Since _instances is frozen, we create a new array before modifying
                            var newInstanceList = _instances.slice();
                            newInstanceList.splice(index, 1);

                            _instances = Object.freeze( newInstanceList );
                            _lastLoaded = Date.now();
                        }
                    }
                },

                /**
                 * Updates or adds an instance to the instance cache. Updates are based on the ID.
                 *
                 * @method _setById
                 * @private
                 * @param {Instance} newInstance  The new instance to incorporate into the list of instances.
                 */
                _setById: function(newInstance) {
                    var self = this;

                    var _updateInstance = function() {
                        // Create a new array, since _instances is frozen
                        var newInstanceList = _instances.slice();

                        // Remove the old version of the instance, if it exists
                        var existingInstance = _instancesLookup[ newInstance.id ];
                        if(existingInstance) {
                            var existingIndex = self.indexOf( existingInstance );
                            if (existingIndex > -1) {
                                // Updating an instance, so remove the existing index
                                newInstanceList.splice(existingIndex, 1);
                            }
                        }

                        // Insert the new instance
                        var newIndex = self._findInsertionIndex(newInstance);
                        newInstanceList.splice(newIndex, 0, newInstance);

                        _instances = Object.freeze( newInstanceList );
                        _instancesLookup[newInstance.id] = newInstance;
                        _lastLoaded = Date.now();
                    };

                    if (!_instances) {
                        // The list is not initialized, so do that first.
                        self.get().then(_updateInstance);
                    }
                    else {
                        _updateInstance();
                    }
                },

                /**
                 * Fetches the cached values by reference. Used for testing only to verify
                 * the cache works as expected.
                 *
                 * @private
                 * @method  _get
                 * @return {Object} With the following properties:
                 *    {Array}  instances       - List of instances from the backend
                 *    {Object} instancesLookup - Hash of the instances index by the instance id.
                 *    {Number} invalidCount    - Number of invalid items that failed the parsing.
                 *    {Number} lastLoaded      - Timestamp when the data was updated in the cache.
                 *    {Number} cacheTime       - Number of millisecond to cache the data.
                 */
                _get: function() {
                    return {
                        instances:       _instances,
                        instancesLookup: _instancesLookup,
                        invalidCount:    _invalidCount,
                        lastLoaded:      _lastLoaded,
                        cacheTime:       _cacheTime,
                    };
                },

                /**
                 * Initialize the local caches from the prefetched data.
                 *
                 * @method _getListFromPrefetch
                 * @private
                 * @return {[type]} [description]
                 */
                _getListFromPrefetch: function() {
                    // Store the instances in the cache
                    this._set({
                        raw:    pageState.instances,
                        parsed: this.parse(pageState.instances),
                    });

                    var prefetchNonFatalErrors = pageState.prefetchNonFatalErrors;

                    delete pageState.instances;
                    delete pageState.prefetchNonFatalErrors;

                    return this._getListFromCache({ nonFatalErrors: prefetchNonFatalErrors });
                },

                /**
                 * Generate a deferred resolve() from the cached data.
                 *
                 * @method _getListFromCache
                 * @private
                 * @param  {Object} args with the following properties:
                 * @param {Array} args.nonFatalErrors list of non-fatal errors detected.
                 * @return {Promise}
                 */
                _getListFromCache: function(args) {
                    var nonFatalErrors = args && angular.isArray(args.nonFatalErrors) && args.nonFatalErrors || [];
                    return $q(function(resolve) {
                        resolve({
                            instances:     _instances,
                            invalidCount:  _invalidCount,
                            nonFatalErrors: nonFatalErrors,
                        });
                    });
                },

                /**
                 * Retrieve the requested instance from the cache if available.
                 * It will just fetch it from the backend if not in the cache.
                 *
                 * @method _getInstanceFromCache
                 * @private
                 * @param  {String} id Unique identifier
                 * @return {Promise}
                 */
                _getInstanceFromCache: function(id) {
                    var instance = _instancesLookup[id];
                    if (instance) {
                        return $q.resolve(instance);
                    } else {
                        return this.fetchById(id);
                    }
                },

                /**
                 * Sort the passed list by domain and then full_path
                 *
                 * @method _sort
                 * @param  {Array} instances
                 * @return {Array}
                 */
                _sort: function(instances) {
                    return _.sortBy(instances, ["domain", "full_path"]);
                },

            };
        }
    ]);
});
