/*
# passenger/services/zones.js                                     Copyright(c) 2017 cPanel, Inc.
#                                                                           All rights Reserved.
# copyright@cpanel.net                                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular",
        "jquery",
        "lodash",
        "cjt/util/locale",
        "cjt/util/parse",
        "cjt/io/api",
        "cjt/io/uapi-request",
        "cjt/io/uapi"
    ],
    function(angular, $, _, LOCALE, PARSE, API, UAPIREQUEST, UAPIDRIVER) {

        var app = angular.module("cpanel.applicationManager");
        var factory = app.factory("Apps", ["$q", "defaultInfo", function($q, defaultInfo) {

            var store = {};

            store.applications = [];

            store.homedir_regex = new RegExp("^(?:" + defaultInfo.homedir + ")/?");

            store.has_support_for_env_vars = PARSE.parsePerlBoolean(defaultInfo.has_mod_env);

            store.max_number_of_apps = Number(defaultInfo.max_passenger_apps);

            store.get_maximum_number_of_apps = function() {
                return store.max_number_of_apps;
            };

            store.exceeds_quota = function() {
                return store.applications.length >= store.max_number_of_apps;
            };

            store.get_default_application = function() {
                var new_appl = {};

                new_appl.name = "";
                new_appl.path = "";
                new_appl.enabled = true;
                new_appl.domain = "";
                new_appl.base_uri = "/";
                new_appl.deployment_mode = "production";
                if (store.has_support_for_env_vars) {
                    new_appl.envvars = {};
                }

                return new_appl;
            };

            /**
             * Add an application based on the type.
             * @param appl - the application object we are sending. the fields in the object
             *                  depend on the type of record.
             * @return Promise
             */
            store.add_application = function(appl) {
                var apiCall = new UAPIREQUEST.Class();
                apiCall.initialize("PassengerApps", "register_application");
                apiCall.addArgument("name", appl.name);
                apiCall.addArgument("path", appl.path);
                apiCall.addArgument("deployment_mode", appl.deployment_mode);
                apiCall.addArgument("domain", appl.domain);
                apiCall.addArgument("base_uri", appl.base_uri);

                if (store.has_support_for_env_vars) {
                    var envvar_index = 1;

                    _.forEach(appl.envvars, function(value, key) {
                        apiCall.addArgument("envvar_name-" + envvar_index, key);
                        apiCall.addArgument("envvar_value-" + envvar_index, value);
                        envvar_index++;
                    });
                }

                apiCall.addArgument("enabled", appl.enabled ? 1 : 0);

                return $q.when(API.promise(apiCall.getRunArguments()))
                    .then(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            var obj = store.strip_homedirs_and_convert_enabled(response.data);
                            store.applications.push(obj);
                            return obj;
                        } else {
                            return $q.reject(response.error);
                        }
                    }, function(response) {
                        if (!response.status) {
                            return $q.reject(response.error);
                        }
                    });
            };

            store.update_application = function(appl, previous_name) {
                var apiCall = new UAPIREQUEST.Class();
                _.defaults(appl, { name: "" }, { path: "" }, { base_uri: "/" });
                apiCall.initialize("PassengerApps", "edit_application");

                if (appl.name !== previous_name) {
                    apiCall.addArgument("name", previous_name);
                    apiCall.addArgument("new_name", appl.name);
                } else {
                    apiCall.addArgument("name", appl.name);
                }

                apiCall.addArgument("path", appl.path);
                apiCall.addArgument("base_uri", appl.base_uri);
                apiCall.addArgument("domain", appl.domain);
                apiCall.addArgument("deployment_mode", appl.deployment_mode);
                if (store.has_support_for_env_vars) {
                    var envvar_count = _.size(appl.envvars);
                    if (envvar_count === 0) {
                        apiCall.addArgument("clear_envvars", 1);
                    } else {
                        var envvar_index = 0;

                        _.forEach(appl.envvars, function(value, key) {
                            envvar_index++;
                            apiCall.addArgument("envvar_name-" + envvar_index, key);
                            apiCall.addArgument("envvar_value-" + envvar_index, value);
                        });
                    }
                }

                apiCall.addArgument("enabled", appl.enabled ? 1 : 0);

                return $q.when(API.promise(apiCall.getRunArguments()))
                    .then(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {

                            // update the applications array with the new information
                            var app_to_update = store.get_application_index(previous_name);
                            var obj = store.strip_homedirs_and_convert_enabled(response.data);
                            if (response.data.name !== previous_name) {
                                if (app_to_update >= 0) {
                                    store.applications.splice(app_to_update, 1);
                                    store.applications.push(obj);
                                }
                            } else {
                                store.applications[app_to_update] = obj;
                            }
                            return obj;
                        } else {
                            return $q.reject(response.error);
                        }
                    }, function(response) {
                        return $q.reject(response.error);
                    });
            };

            store.strip_homedir_from_path = function(obj) {
                if (obj.path) {
                    obj.path = obj.path.replace(store.homedir_regex, "");
                }
                return obj;
            };

            store.strip_homedirs_and_convert_enabled = function(to_convert) {
                var temp = to_convert;
                if (!Array.isArray(to_convert)) {
                    temp = [to_convert];
                }

                for (var i = 0, len = temp.length; i < len; i++) {
                    temp[i] = store.strip_homedir_from_path(temp[i]);
                    temp[i].enabled = PARSE.parsePerlBoolean(temp[i].enabled);
                }

                if (!Array.isArray(to_convert)) {
                    return temp[0];
                } else {
                    return temp;
                }
            };

            store.fetch = function(force) {
                if (store.applications.length === 0 || force) {
                    var apiCall = new UAPIREQUEST.Class();
                    apiCall.initialize("PassengerApps", "list_applications");

                    return $q.when(API.promise(apiCall.getRunArguments()))
                        .then(function(response) {
                            response = response.parsedResponse;
                            if (response.status) {
                                store.applications = _.values(response.data);
                                store.applications = store.strip_homedirs_and_convert_enabled(store.applications);
                                return store.applications;
                            } else {
                                return $q.reject(response.error);
                            }
                        });
                } else {
                    return $q.when(store.applications);
                }
            };

            store.get_application_index = function(appl_name) {
                return _.findIndex( store.applications, function(element) {
                    return appl_name === element.name;
                });
            };

            store.find_application = function(appl) {
                var app_index = store.get_application_index(appl.name);

                if (app_index >= 0) {
                    return store.applications[app_index];
                }

                return null;
            };

            store.get_application_by_name = function(appl_name) {
                return store.fetch()
                    .then(function(data) {
                        var app_index = store.get_application_index(appl_name);

                        if (app_index > -1) {
                            return data[app_index];
                        } else {
                            return null;
                        }
                    });
            };

            store.toggle_application_status = function(appl) {
                var apiCall = new UAPIREQUEST.Class();
                if (appl.enabled) {
                    apiCall.initialize("PassengerApps", "disable_application");
                } else {
                    apiCall.initialize("PassengerApps", "enable_application");
                }

                apiCall.addArgument("name", appl.name);

                return $q.when(API.promise(apiCall.getRunArguments()))
                    .then(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            var app_index = store.get_application_index(appl.name);
                            store.applications[app_index].enabled = !appl.enabled;
                            return store.applications[app_index];
                        } else {
                            return $q.reject(response.error);
                        }
                    }, function(response) {
                        return $q.reject(response.error);
                    });
            };

            /**
             * Remove an application
             * @param application - the application to remove
             * @return Promise
             */
            store.remove_application = function(appl_name) {
                var apiCall = new UAPIREQUEST.Class();
                apiCall.initialize("PassengerApps", "unregister_application");
                apiCall.addArgument("name", appl_name);

                return $q.when(API.promise(apiCall.getRunArguments()))
                    .then(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            var app_index = store.get_application_index(appl_name);
                            store.applications.splice(app_index, 1);
                        } else {
                            return $q.reject(response.error);
                        }
                    }, function(response) {
                        return $q.reject(response.error);
                    });
            };

            return store;
        }]);

        return factory;
    }
);
