/*
# zone_editor/services/zones.js                                   Copyright(c) 2016 cPanel, Inc.
#                                                                           All rights Reserved.
# copyright@cpanel.net                                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular",
        "lodash",
        "cjt/util/locale",
        "cjt/io/api",
        "cjt/io/api2-request",
        "cjt/io/uapi-request",
        "cjt/util/httpStatus",
        "cjt/core",
        "cjt/io/api2",
        "cjt/io/uapi"
    ],
    function(angular, _, LOCALE, API, API2REQUEST, UAPIREQUEST, HTTP_STATUS, CJT) {

        var app = angular.module("cpanel.zoneEditor");
        var factory = app.factory("Zones", ["$q", function($q) {

            var store = {};

            store.zones = [];
            store.zone_serial_number = "";
            store.generated_domains = [];

            function _add_arguments_for_api2(apiCall, record) {
                apiCall.addArgument("name", record.name);
                apiCall.addArgument("type", record.type);
                apiCall.addArgument("class", "IN");

                // these are optional
                if (record.ttl) {
                    apiCall.addArgument("ttl", record.ttl);
                }

                if (record.line) {
                    apiCall.addArgument("line", record.line);
                }

                // the following options depend on the record type
                if (record.type === "A" || record.type === "AAAA") {
                    apiCall.addArgument("address", record.address);
                } else if (record.type === "CNAME") {
                    apiCall.addArgument("cname", record.cname);
                } else if (record.type === "MX") {
                    apiCall.addArgument("exchange", record.exchanger);
                    apiCall.addArgument("preference", record.preference);
                } else if (record.type === "SRV") {
                    apiCall.addArgument("priority", record.priority);
                    apiCall.addArgument("weight", record.weight);
                    apiCall.addArgument("port", record.port);
                    apiCall.addArgument("target", record.target);
                } else if (record.type === "TXT") {
                    apiCall.addArgument("txtdata", record.txtdata);
                } else if (record.type === "CAA") {
                    apiCall.addArgument("tag", record.tag);
                    apiCall.addArgument("flag", record.flag);
                    apiCall.addArgument("value", record.value);
                }
            }

            function _add_record(domain, record) {
                var apiCall = new API2REQUEST.Class();
                apiCall.initialize("ZoneEdit", "add_zone_record");
                apiCall.addArgument("domain", domain);
                _add_arguments_for_api2(apiCall, record);

                return $q.when(API.promise(apiCall.getRunArguments()))
                    .then(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            if (response.data[0] && response.data[0].result) {
                                store.zone_serial_number = response.data[0].result.newserial;
                            }
                            return true;
                        } else {
                            return $q.reject(response);
                        }
                    })
                    .catch(function(response) {
                        if (!response.status) {
                            return $q.reject(response.error);
                        }
                        return $q.reject(store.request_failure_message(response.status));
                    });
            }

            function _update_record(domain, record) {
                var apiCall = new API2REQUEST.Class();
                apiCall.initialize("ZoneEdit", "edit_zone_record");
                apiCall.addArgument("domain", domain);
                _add_arguments_for_api2(apiCall, record);

                return $q.when(API.promise(apiCall.getRunArguments()))
                    .then(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            if (response.data[0] && response.data[0].result) {
                                store.zone_serial_number = response.data[0].result.newserial;
                            }
                            return true;
                        } else {
                            return $q.reject(response);
                        }
                    })
                    .catch(function(response) {
                        if (!response.status) {
                            return $q.reject(response.error);
                        }
                        return $q.reject(store.request_failure_message(response.status));
                    });
            }

            function _add_mx_record(domain, record) {
                var apiCall = new UAPIREQUEST.Class();
                apiCall.initialize("Email", "add_mx");

                var mx_domain = "";
                if (record.hasOwnProperty("name") && record.name !== domain) {

                    // If we are adding an MX for a subdomain
                    // then we need to strip away the trailing '.'
                    // to ensure that the domain ownership verification
                    // succeeds.
                    mx_domain = record.name.slice(0, -1);
                } else {
                    mx_domain = domain;
                }

                apiCall.addArgument("domain", mx_domain);
                apiCall.addArgument("exchanger", record.exchanger);
                apiCall.addArgument("priority", record.priority);

                return $q.when(API.promise(apiCall.getRunArguments()))
                    .then(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            return response.data;
                        } else {
                            return $q.reject(response);
                        }
                    })
                    .catch(function(response) {
                        if (!response.status) {
                            return $q.reject(response.error);
                        }
                        return $q.reject(store.request_failure_message(response.status));
                    });
            }

            /**
             * Add a record based on the type.
             * NOTE: After adding a record, we need to fetch the list of records from the
             * server since the api calls do some special serialization of the records.
             *
             * @param domain - the domain on which the record should be created
             * @param record - the record object we are sending. the fields in the object
             *                  depend on the type of record.
             * @return Promise
             */
            store.add_record = function(domain, record) {
                if (record.type === "MX") {
                    return _add_mx_record(domain, record);
                } else {
                    return _add_record(domain, record);
                }
            };

            store.update_record = function(domain, record) {
                return _update_record(domain, record);
            };

            store.fetch = function(domain, force) {
                if (store.zones.length === 0 || force) {
                    var apiCall = new API2REQUEST.Class();
                    apiCall.initialize("ZoneEdit", "fetchzone");
                    apiCall.addArgument("domain", domain);
                    apiCall.addArgument("type", "$TTL|A|AAAA|CAA|CNAME|MX|SRV|TXT");

                    return $q.when(API.promise(apiCall.getRunArguments()))
                        .then(function(response) {
                            response = response.parsedResponse;
                            if (response.status) {
                                store.zones = response.data[0].record;
                                store.zone_serial_number = response.data[0].serialnum;
                                return store.zones;
                            } else {
                                return $q.reject(response);
                            }
                        })
                        .catch(function(response) {
                            if (!response.status) {
                                return $q.reject(response.error);
                            }
                            return $q.reject(store.request_failure_message(response.status));
                        });
                } else {
                    return $q.when(store.zones);
                }
            };

            function _remove_zone_record(domain, line) {
                var apiCall = new API2REQUEST.Class();
                apiCall.initialize("ZoneEdit", "remove_zone_record");
                apiCall.addArgument("domain", domain);
                apiCall.addArgument("line", line);

                return $q.when(API.promise(apiCall.getRunArguments()))
                    .then(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            store.zone_serial_number = response.data[0].serialnum;
                        } else {
                            return $q.reject(response);
                        }
                    })
                    .catch(function(response) {
                        if (!response.status) {
                            return $q.reject(response.error);
                        }
                        return $q.reject(store.request_failure_message(response.status));
                    });
            }

            function _remove_mx_record(domain, record) {
                var apiCall = new UAPIREQUEST.Class();

                var mx_domain = "";
                if (record.name !== domain) {

                    // If we are deleting an MX for a subdomain
                    // then we need to strip away the trailing '.'
                    // to ensure that the domain ownership verification
                    // succeeds.
                    mx_domain = record.name.slice(0, -1);
                } else {
                    mx_domain = domain;
                }

                apiCall.initialize("Email", "delete_mx");
                apiCall.addArgument("domain", mx_domain);
                apiCall.addArgument("exchanger", record.exchange);
                apiCall.addArgument("priority", record.preference);

                return $q.when(API.promise(apiCall.getRunArguments()))
                    .then(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            store.zone_serial_number = "";
                        } else {
                            return $q.reject(response);
                        }
                    })
                    .catch(function(response) {
                        if (!response.status) {
                            return $q.reject(response.error);
                        }
                        return $q.reject(store.request_failure_message(response.status));
                    });
            }

            /**
             * Remove a record based on the type.
             * NOTE: After removing a record, we need to fetch the list of records from the
             * server since the api calls do some special serialization of the records.
             *
             * @param domain - the domain on which the record should be created
             * @param record - the record object we are sending. the fields in the object
             *                  depend on the type of record.
             * @return Promise
             */
            store.remove_zone_record = function(domain, record) {
                if (record.type === "MX") {
                    return _remove_mx_record(domain, record);
                } else {
                    return _remove_zone_record(domain, record.line);
                }
            };

            store.reset_zone = function(domain) {
                var apiCall = new API2REQUEST.Class();
                apiCall.initialize("ZoneEdit", "resetzone");
                apiCall.addArgument("domain", domain);

                return $q.when(API.promise(apiCall.getRunArguments()))
                    .then(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            return true;
                        } else {
                            return $q.reject(response);
                        }
                    })
                    .catch(function(response) {
                        if (!response.status) {
                            return $q.reject(response.error);
                        }
                        return $q.reject(store.request_failure_message(response.status));
                    });
            };

            function flatten_array_to_object(array, key) {
                var obj = {};
                for (var i = 0, len = array.length; i < len; i++) {
                    if (array[i][key] && array[i][key].length > 0) {
                        obj[array[i][key]] = true;
                    }
                }
                return obj;
            }

            store.fetch_generated_domains = function(domain, force) {
                if (_.keys(store.generated_domains).length === 0 || force) {
                    var apiCall = new API2REQUEST.Class();
                    apiCall.initialize("ZoneEdit", "fetch_cpanel_generated_domains");
                    apiCall.addArgument("domain", domain);

                    return $q.when(API.promise(apiCall.getRunArguments()))
                        .then(function(response) {
                            response = response.parsedResponse;
                            store.generated_domains = flatten_array_to_object(response.data, "domain");
                            return store.generated_domains;
                        })
                        .catch(function(err) {
                            return $q.reject(store.request_failure_message(err.status));
                        });
                } else {
                    return $q.when(store.generated_domains);
                }
            };

            store.format_zone_name = function(domain, zone_name) {
                var name = zone_name;
                if (!angular.isDefined(name) || name === null || name === "") {
                    return "";
                }

                // add a dot at the end of the name, if needed
                if (zone_name.charAt(zone_name.length - 1) !== ".") {
                    name += ".";
                }

                // return what we have if a domain is not specified
                if (!angular.isDefined(domain) || domain === null || domain === "") {
                    return name;
                }

                // add the domain, if it does not already exist
                var domain_part = domain + ".";
                var end_of_zone_name = name.slice(domain_part.length * -1);
                if (end_of_zone_name.toLowerCase() !== domain_part.toLowerCase()) {
                    name += domain_part;
                }

                return name;
            };

            /**
             * Generates the error text for when an API request fails.
             *
             * @method request_failure_message
             * @param  {Number|String} status   A relevant status code.
             * @return {String}                 The text to be presented to the user.
             */
            store.request_failure_message = function(status) {
                var message = LOCALE.maketext("The API request failed with the following error: [_1] - [_2].", status, HTTP_STATUS.convertHttpStatusToReadable(status));
                if (status === 401 || status === 403) {
                    message += " " + LOCALE.maketext("Your session may have expired or you logged out of the system. [output,url,_1,Login] again to continue.", CJT.getLoginPath());
                }

                return message;
            };

            return store;
        }]);

        return factory;
    }
);
