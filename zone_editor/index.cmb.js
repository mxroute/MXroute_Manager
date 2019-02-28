/*
# zone_editor/services/page_data_service.js         Copyright(c) 2016 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/services/page_data_service',[
        "angular"
    ],
    function(angular) {

        // Fetch the current application
        var app = angular.module("cpanel.zoneEditor");

        /**
         * Setup the domainlist models API service
         */
        app.factory("pageDataService", [ function() {

            return {

                /**
                 * Helper method to remodel the default data passed from the backend
                 * @param  {Object} defaults - Defaults object passed from the backend
                 * @return {Object}
                 */
                prepareDefaultInfo: function(defaults) {
                    defaults.has_adv_feature = defaults.has_adv_feature || false;
                    defaults.has_simple_feature = defaults.has_simple_feature || false;
                    defaults.has_dnssec_feature = defaults.has_dnssec_feature || false;
                    defaults.has_mx_feature = defaults.has_mx_feature || false;
                    defaults.domains = defaults.domains || [];

                    var page_size_options = [10, 20, 50, 100];
                    if (typeof defaults.zones_per_page !== "number") {
                        defaults.zones_per_page = parseInt(defaults.zones_per_page, 10);
                    }
                    if (!defaults.zones_per_page || page_size_options.indexOf(defaults.zones_per_page) === -1 ) {
                        defaults.zones_per_page = 50;
                    }
                    if (typeof defaults.domains_per_page !== "number") {
                        defaults.domains_per_page = parseInt(defaults.domains_per_page, 10);
                    }
                    if (!defaults.domains_per_page || page_size_options.indexOf(defaults.domains_per_page) === -1 ) {
                        defaults.domains_per_page = 50;
                    }

                    return defaults;
                }

            };
        }]);
    }
);

/*
# zone_editor/services/domains.js                 Copyright(c) 2016 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/services/domains',[
        "angular",
        "jquery",
        "cjt/util/locale",
        "cjt/io/api",
        "cjt/io/api2-request",
        "cjt/io/api2",
        "cjt/util/httpStatus",
        "cjt/core"
    ],
    function(angular, $, LOCALE, API, APIREQUEST, APIDRIVER, HTTP_STATUS, CJT) {

        var app = angular.module("cpanel.zoneEditor");
        var factory = app.factory("Domains", ["$q", "defaultInfo", function($q, defaultInfo) {

            var store = {};

            store.domains = [];

            store.fetch = function(force) {
                if (store.domains.length === 0 || force) {
                    var apiCall = new APIREQUEST.Class();
                    apiCall.initialize("DomainLookup", "getbasedomains");

                    return $q.when(API.promise(apiCall.getRunArguments()))
                        .then(function(response) {
                            response = response.parsedResponse;
                            if (response.status) {
                                store.domains = response.data;
                                return store.domains;
                            } else {
                                return $q.reject(response.error);
                            }
                        })
                        .catch(function(err) {
                            var message = LOCALE.maketext("The API request failed with the following error: [_1] - [_2].", err.status, HTTP_STATUS.convertHttpStatusToReadable(err.status));
                            if (err.status === 401 || err.status === 403) {
                                message += " " + LOCALE.maketext("Your session may have expired or you logged out of the system. [output,url,_1,Login] again to continue.", CJT.getLoginPath());
                            }
                            return $q.reject(message);
                        });
                } else {
                    return $q.when(store.domains);
                }
            };

            store.init = function() {
                store.domains = defaultInfo.domains;
            };

            store.init();

            return store;
        }]);

        return factory;
    }
);

/*
# zone_editor/services/zones.js                                   Copyright(c) 2016 cPanel, Inc.
#                                                                           All rights Reserved.
# copyright@cpanel.net                                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/services/zones',[
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

/*
# zone_editor/services/dnssec.js                  Copyright(c) 2016 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/services/dnssec',[
        "angular",
        "jquery",
        "lodash",
        "cjt/util/locale",
        "cjt/io/api",
        "cjt/io/uapi-request",
        "cjt/io/uapi"
    ],
    function(angular, $, _, LOCALE, API, APIREQUEST, APIDRIVER) {

        var app = angular.module("cpanel.zoneEditor");
        var factory = app.factory("DNSSEC", ["$q", "defaultInfo", function($q, defaultInfo) {

            var api = {};

            function set_state(domain, status) {
                var apiCall = new APIREQUEST.Class();
                if (status) {
                    apiCall.initialize("DNSSEC", "enable_dnssec");
                } else {
                    apiCall.initialize("DNSSEC", "disable_dnssec");
                }
                apiCall.addArgument("domain", domain);

                return $q.when(API.promise(apiCall.getRunArguments()))
                    .then(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {

                            // The API call can succeed but you can still get an error message
                            // so check for that message and return it
                            if (response.meta.DNSSEC && response.meta.DNSSEC.failed) {
                                return $q.reject(response.meta.DNSSEC.failed[domain]);
                            }
                            return true;
                        } else {
                            return $q.reject(response.error);
                        }
                    });
            }

            api.enable = function(domain) {
                return set_state(domain, true);
            };

            api.disable = function(domain) {
                return set_state(domain, false);
            };

            api.fetch = function(domain) {
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("DNSSEC", "fetch_ds_records");
                apiCall.addArgument("domain", domain);

                return $q.when(API.promise(apiCall.getRunArguments()))
                    .then(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            if (response.data[domain].keys) {

                                // get a list of the keys with the active keys at the front of the list
                                return _.orderBy(response.data[domain].keys, "active").reverse();
                            } else {

                                // return an empty array to signal that dnssec is not enabled
                                return [];
                            }
                        } else {
                            return $q.reject(response.error);
                        }
                    });
            };

            return api;
        }]);

        return factory;
    }
);

/*
# zone_editor/services/features.js                Copyright(c) 2016 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/services/features',[
        "angular"
    ],
    function(angular) {

        var app = angular.module("cpanel.zoneEditor");
        var factory = app.factory("Features", ["defaultInfo", function(defaultInfo) {

            var store = {};

            store.dnssec = false;
            store.mx = false;
            store.simple = false;
            store.advanced = false;

            store.init = function() {
                store.dnssec = defaultInfo.has_dnssec_feature;
                store.mx = defaultInfo.has_mx_feature;
                store.simple = defaultInfo.has_simple_feature;
                store.advanced = defaultInfo.has_adv_feature;
            };

            store.init();

            return store;
        }]);

        return factory;
    }
);

/*
# models/dynamic_table.js                         Copyright(c) 2016 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/models/dynamic_table',[
        "lodash",
        "cjt/util/locale",
    ],
    function(_, LOCALE) {

        /**
         * Creates a Dynamic Table object
         *
         * @class
         */
        function DynamicTable() {
            this.items = [];
            this.filteredList = this.items;
            this.selected = [];
            this.allDisplayedRowsSelected = false;
            this.filterFunction = void 0;
            this.quickFilterFunction = void 0;

            this.meta = {
                sortBy: "",
                sortDirection: "asc",
                maxPages: 0,
                totalItems: this.items.length,
                pageNumber: 1,
                pageSize: 10,
                pageSizes: [10, 20, 50, 100],
                start: 0,
                limit: 0,
                filterValue: "",
                quickFilterValue: ""
            };
        }

        /**
         * Set the filter function to be used for searching the table
         *
         * @method loadData
         * @param {Array} data - an array of objects representing the data to display
         */
        DynamicTable.prototype.loadData = function(data) {
            if (!_.isArray(data)) {
                throw "Developer Exception: loadData requires an array";
            }

            this.items = data;

            for (var i = 0, len = this.items.length; i < len; i++) {
                if (!_.isObject(this.items[i])) {
                    throw "Developer Exception: loadData requires an array of objects";
                }

                // add a unique id to each piece of data
                this.items[i]._id = i;

                // initialize the selected array with the ids of selected items
                if (this.items[i].selected) {
                    this.selected.push(this.items[i]._id);
                }
            }
        };

        /**
         * Set the filter function to be used for searching the table
         *
         * @method setFilterFunction
         * @param {Function} func - a function that can be used to search the data
         * @note The function passed to this function must
         * - return a boolean
         * - accept the following args: an item object and the search text
         */
        DynamicTable.prototype.setFilterFunction = function(func) {
            if (!_.isFunction(func)) {
                throw "Developer Error: setFilterFunction requires a function";
            }

            this.filterFunction = func;
        };

        /**
         * Set the quick filter function to be used with quick filters, which
         * are a predefined set of filter values
         *
         * @method setQuickFilterFunction
         * @param {Function} func - a function that can be used to filter data
         * @note The function passed to this function must
         * - return a boolean
         * - accept the following args: an item object and the search text
         */
        DynamicTable.prototype.setQuickFilterFunction = function(func) {
            if (!_.isFunction(func)) {
                throw "Developer Error: setQuickFilterFunction requires a function";
            }

            this.quickFilterFunction = func;
        };


        /**
         * Set the filter function to be used for searching the table
         *
         * @method setSort
         * @param {String} by - the field you want to sort on
         * @param {String} direction - the direction you want to sort, "asc" or "desc"
         */
        DynamicTable.prototype.setSort = function(by, direction) {
            if (!_.isUndefined(by)) {
                this.meta.sortBy = by;
            }

            if (!_.isUndefined(direction)) {
                this.meta.sortDirection = direction;
            }
        };

        /**
         * Get the table metadata
         *
         * @method getMetadata
         * @return {Object} The metadata for the table. We return a
         * reference here so that callers can update the object and
         * changes can easily be propagated.
         */
        DynamicTable.prototype.getMetadata = function() {
            return this.meta;
        };

        /**
         * Get the table data
         *
         * @method getList
         * @return {Array} The table data
         */
        DynamicTable.prototype.getList = function() {
            return this.filteredList;
        };

        /**
         * Get the table data that is selected
         *
         * @method getSelectedList
         * @return {Array} The table data that is selected
         */
        DynamicTable.prototype.getSelectedList = function() {
            return this.items.filter(function(item) {
                return item.selected;
            });
        };

        /**
         * Determine if all the filtered table rows are selected
         *
         * @method areAllDisplayedRowsSelected
         * @return {Boolean}
         */
        DynamicTable.prototype.areAllDisplayedRowsSelected = function() {
            return this.allDisplayedRowsSelected;
        };

        /**
         * Get the total selected rows in the table
         *
         * @method getTotalRowsSelected
         * @return {Number} total of selected rows in the table
         */
        DynamicTable.prototype.getTotalRowsSelected = function() {
            return this.selected.length;
        };

        /**
         * Select all items for a single page of data in the table
         *
         * @method selectAllDisplayed
         * @param {Boolean} toggle - determines whether to select or unselect all
         * displayed items
         */
        DynamicTable.prototype.selectAllDisplayed = function(toggle) {
            if (toggle) {

                // Select the rows if they were previously selected on this page.
                for (var i = 0, filteredLen = this.filteredList.length; i < filteredLen; i++) {
                    var item = this.filteredList[i];
                    item.selected = true;

                    // make sure this item is not already in the list
                    if (this.selected.indexOf(item._id) !== -1) {
                        continue;
                    }

                    this.selected.push(item._id);
                }
            } else {

                // Extract the unselected items and remove them from the selected collection.
                var unselected = this.filteredList.map(function(item) {
                    item.selected = false;
                    return item._id;
                });

                this.selected = _.difference(this.selected, unselected);
            }

            this.allDisplayedRowsSelected = toggle;
        };

        /**
         * Select an item on the current page.
         *
         * @method selectItem
         * @param {Object} item - the item that we want to mark as selected.
         * NOTE: the item must have the selected property set to true before
         * passing it to this function
         */
        DynamicTable.prototype.selectItem = function(item) {
            if (!_.isUndefined(item)) {
                if (item.selected) {

                    // make sure this item is not already in the list
                    if (this.selected.indexOf(item._id) !== -1) {
                        return;
                    }

                    this.selected.push(item._id);

                    // Sync 'Select All' checkbox status when a new selction/unselection is made.
                    this.allDisplayedRowsSelected = this.filteredList.every(function(thisitem) {
                        return thisitem.selected;
                    });
                } else {
                    this.selected = this.selected.filter(function(thisid) {
                        return thisid !== item._id;
                    });

                    // Unselect Select All checkbox.
                    this.allDisplayedRowsSelected = false;
                }
            }
        };

        /**
         * Clear all selections for all pages.
         *
         * @method clearAllSelections
         */
        DynamicTable.prototype.clearAllSelections = function() {
            this.selected = [];

            for (var i = 0, len = this.items.length; i < len; i++) {
                var item = this.items[i];
                item.selected = false;
            }

            this.allDisplayedRowsSelected = false;
        };

        /**
         * Clear the entire table.
         *
         * @method clear
         */
        DynamicTable.prototype.clear = function() {
            this.items = [];
            this.selected = [];
            this.allDisplayedRowsSelected = false;
            this.filteredList = this.populate();
        };

        /**
         * Populate the table with data accounting for filtering, sorting, and paging
         *
         * @method populate
         * @return {Array} the table data
         */
        DynamicTable.prototype.populate = function() {
            var filtered = [];
            var self = this;

            // filter list based on search text
            if (this.meta.filterValue !== null &&
                this.meta.filterValue !== void 0 &&
                this.meta.filterValue !== "" &&
                _.isFunction(this.filterFunction)) {
                filtered = this.items.filter(function(item) {
                    return self.filterFunction(item, self.meta.filterValue);
                });
            } else {
                filtered = this.items;
            }

            // filter list based on the quick filter
            if (this.meta.quickFilterValue !== null &&
                this.meta.quickFilterValue !== void 0 &&
                this.meta.quickFilterValue !== "" &&
                _.isFunction(this.quickFilterFunction)) {
                filtered = filtered.filter(function(item) {
                    return self.quickFilterFunction(item, self.meta.quickFilterValue);
                });
            }

            // sort the filtered list
            if (this.meta.sortDirection !== "" && this.meta.sortBy !== "") {
                filtered = _.orderBy(filtered, [this.meta.sortBy], [this.meta.sortDirection]);
            }

            // update the total items after search
            this.meta.totalItems = filtered.length;

            // filter list based on page size and pagination and handle the case
            // where the page size is "ALL" (-1)
            if (this.meta.totalItems > _.min(this.meta.pageSizes) ) {
                var start = (this.meta.pageNumber - 1) * this.meta.pageSize;
                var limit = this.meta.pageNumber * this.meta.pageSize;

                filtered = _.slice(filtered, start, limit);

                this.meta.start = start + 1;
                this.meta.limit = start + filtered.length;
            } else {
                if (filtered.length === 0) {
                    this.meta.start = 0;
                } else {
                    this.meta.start = 1;
                }

                this.meta.limit = filtered.length;
            }

            var countNonSelected = 0;
            for (var i = 0, filteredLen = filtered.length; i < filteredLen; i++) {
                var item = filtered[i];

                // Select the rows if they were previously selected on this page.
                if (this.selected.indexOf(item._id) !== -1) {
                    item.selected = true;
                } else {
                    item.selected = false;
                    countNonSelected++;
                }
            }

            this.filteredList = filtered;

            // Clear the 'Select All' checkbox if at least one row is not selected.
            this.allDisplayedRowsSelected = (filtered.length > 0) && (countNonSelected === 0);

            return filtered;
        };

        /**
         * Create a localized message for the table stats
         *
         * @method paginationMessage
         * @return {String}
         */
        DynamicTable.prototype.paginationMessage = function() {
            return LOCALE.maketext("Displaying [numf,_1] to [numf,_2] out of [quant,_3,item,items]", this.meta.start, this.meta.limit, this.meta.totalItems);
        };

        return DynamicTable;
    }
);

/*
# zone_editor/directives/convert_to_full_record_name.js           Copyright(c) 2016 cPanel, Inc.
#                                                                           All rights Reserved.
# copyright@cpanel.net                                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */
define(
    'app/directives/convert_to_full_record_name',[
        "angular",
        "cjt/util/locale",
        "cjt/core"
    ],
    function(angular, LOCALE, CJT) {

        var app = angular.module("cpanel.zoneEditor");
        app.directive("convertToFullRecordName",
            ["Zones",
                function(Zones) {
                    return {
                        restrict: "A",
                        require: "ngModel",
                        scope: {
                            domain: "="
                        },
                        link: function(scope, element, attrs, ngModel) {

                        // we cannot work without ngModel
                            if (!ngModel) {
                                return;
                            }

                            function format_zone(event_name) {
                                var full_record_name = Zones.format_zone_name(scope.domain, ngModel.$viewValue);
                                if (full_record_name !== ngModel.$viewValue) {
                                    ngModel.$setViewValue(full_record_name, event_name);
                                    ngModel.$render();
                                }
                            }

                            element.on("blur", function() {
                                format_zone("blur");
                            });

                            // trigger on Return/Enter
                            element.on("keydown", function(event) {
                                if (event.keyCode === 13) {
                                    format_zone("keydown");
                                }
                            });
                        }
                    };
                }
            ]);

    }
);

/*
# zone_editor/views/domain_selection.js              Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

/* jshint -W100 */

define(
    'app/views/domain_selection',[
        "angular",
        "lodash",
        "cjt/util/locale",
        "app/models/dynamic_table",
        "cjt/directives/actionButtonDirective",
        "cjt/decorators/paginationDecorator",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/searchDirective",
        "cjt/directives/pageSizeDirective",
        "cjt/directives/validationContainerDirective",
        "cjt/directives/validationItemDirective",
        "cjt/filters/qaSafeIDFilter",
        "cjt/validator/ip-validators",
        "cjt/validator/domain-validators",
        "cjt/services/viewNavigationApi",
        "cjt/services/cpanel/nvDataService",
        "cjt/directives/alertList",
        "cjt/services/alertService",
        "app/directives/convert_to_full_record_name",
        "uiBootstrap"
    ],
    function(angular, _, LOCALE, DynamicTable) {
        "use strict";

        var app = angular.module("cpanel.zoneEditor");

        var controller = app.controller(
            "ListDomainsController",
            [
                "$q",
                "$location",
                "$routeParams",
                "Domains",
                "Zones",
                "$uibModal",
                "viewNavigationApi",
                "Features",
                "defaultInfo",
                "nvDataService",
                "alertService",
                function(
                    $q,
                    $location,
                    $routeParams,
                    Domains,
                    Zones,
                    $uibModal,
                    viewNavigationApi,
                    Features,
                    defaultInfo,
                    nvDataService,
                    alertService) {

                    var list = this;

                    list.ui = {};
                    list.ui.is_loading = false;
                    list.domains = [];

                    list.Features = Features;

                    list.modal = {};
                    list.modal.instance = null;
                    list.modal.title = "";
                    list.modal.name_label = LOCALE.maketext("Name");
                    list.modal.cname_label = "CNAME";
                    list.modal.address_label = LOCALE.maketext("Address");
                    list.modal.exchanger_label = LOCALE.maketext("Destination");
                    list.modal.exchanger_placeholder = LOCALE.maketext("Fully qualified domain name");
                    list.modal.priority_label = LOCALE.maketext("Priority");
                    list.modal.priority_placeholder = LOCALE.maketext("Integer");
                    list.modal.create_a_record = LOCALE.maketext("Add an [asis,A] Record");
                    list.modal.create_cname_record = LOCALE.maketext("Add a [asis,CNAME] Record");
                    list.modal.create_mx_record = LOCALE.maketext("Add an [asis,MX] Record");
                    list.modal.cancel_label = LOCALE.maketext("Cancel");
                    list.modal.required_msg = LOCALE.maketext("This field is required.");

                    list.loading_error = false;
                    list.loading_error_message = "";

                    var table = new DynamicTable();
                    table.setSort("domain");

                    function searchFunction(item, searchText) {
                        return item.domain.indexOf(searchText) !== -1;
                    }
                    table.setFilterFunction(searchFunction);

                    list.meta = table.getMetadata();
                    list.filteredList = table.getList();
                    list.paginationMessage = table.paginationMessage;
                    list.meta.pageSize = defaultInfo.domains_per_page;
                    list.render = function() {
                        list.filteredList = table.populate();
                    };
                    list.sortList = function() {
                        list.render();
                    };
                    list.selectPage = function() {
                        list.render();
                    };
                    list.selectPageSize = function() {
                        list.render();
                        if (defaultInfo.domains_per_page !== list.meta.pageSize) {
                            nvDataService.setObject({ domains_per_page: list.meta.pageSize })
                                .then(function() {
                                    defaultInfo.domains_per_page = list.meta.pageSize;
                                })
                                .catch(function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        replace: false,
                                        group: "zoneEditor"
                                    });
                                });
                        }
                    };
                    list.searchList = function() {
                        list.render();
                    };

                    list.refresh = function() {
                        return load(true);
                    };

                    list.aRecordModalController = function($uibModalInstance, domain) {
                        var ar = this;
                        ar.domain = domain;
                        ar.modal_header = LOCALE.maketext("Add an [asis,A] Record for “[_1]”", domain);
                        ar.name_label = list.modal.name_label;
                        ar.address_label = list.modal.address_label;
                        ar.submit_label = list.modal.create_a_record;
                        ar.cancel_label = list.modal.cancel_label;
                        ar.required_msg = list.modal.required_msg;
                        ar.zone_name_placeholder = Zones.format_zone_name(domain, "example");
                        ar.resource = {
                            name: "",
                            address: "",
                            type: "A"
                        };
                        ar.cancel = function() {
                            $uibModalInstance.dismiss("cancel");
                        };
                        ar.save = function() {
                            return Zones.add_record(ar.domain, ar.resource)
                                .then( function(results) {
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("You successfully added the following [asis,_1] record for “[_2]”: [_3]", "A", ar.domain, _.escape(ar.resource.name)),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "zoneEditor"
                                    });
                                }, function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        replace: false,
                                        group: "zoneEditor"
                                    });
                                })
                                .finally(function() {
                                    $uibModalInstance.close({ $value: ar.resource });
                                });
                        };
                    };

                    list.aRecordModalController.$inject = ["$uibModalInstance", "domain"];

                    list.cnameRecordModalController = function($uibModalInstance, domain) {
                        var cr = this;
                        cr.domain = domain;
                        cr.modal_header = LOCALE.maketext("Add a [asis,CNAME] Record for “[_1]”", domain);
                        cr.name_label = list.modal.name_label;
                        cr.cname_label = list.modal.cname_label;
                        cr.submit_label = list.modal.create_cname_record;
                        cr.cancel_label = list.modal.cancel_label;
                        cr.required_msg = list.modal.required_msg;
                        cr.zone_name_placeholder = Zones.format_zone_name(domain, "example");
                        cr.resource = {
                            name: "",
                            cname: "",
                            type: "CNAME"
                        };
                        cr.cancel = function() {
                            $uibModalInstance.dismiss("cancel");
                        };
                        cr.save = function() {
                            return Zones.add_record(cr.domain, cr.resource)
                                .then( function(results) {
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("You successfully added the following [asis,_1] record for “[_2]”: [_3]", "CNAME", cr.domain, _.escape(cr.resource.name)),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "zoneEditor"
                                    });
                                }, function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        replace: false,
                                        group: "zoneEditor"
                                    });
                                })
                                .finally(function() {
                                    $uibModalInstance.close({ $value: cr.resource });
                                });
                        };
                    };

                    list.cnameRecordModalController.$inject = ["$uibModalInstance", "domain"];

                    list.mxRecordModalController = function($uibModalInstance, domain) {
                        var mxr = this;
                        mxr.domain = domain;
                        mxr.modal_header = LOCALE.maketext("Add an [asis,MX] Record for “[_1]”", domain);
                        mxr.name_label = list.modal.name_label;
                        mxr.exchanger_label = list.modal.exchanger_label;
                        mxr.exchanger_placeholder = list.modal.exchanger_placeholder;
                        mxr.priority_label = list.modal.priority_label;
                        mxr.priority_placeholder = list.modal.priority_placeholder;
                        mxr.submit_label = list.modal.create_mx_record;
                        mxr.cancel_label = list.modal.cancel_label;
                        mxr.required_msg = list.modal.required_msg;
                        mxr.resource = {
                            type: "MX",
                            exchanger: "",
                            priority: ""
                        };
                        mxr.cancel = function() {
                            $uibModalInstance.dismiss("cancel");
                        };
                        mxr.save = function() {
                            return Zones.add_record(mxr.domain, mxr.resource)
                                .then( function(results) {
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("You successfully added the [asis,_1] record for “[_2]”.", "MX", mxr.domain),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "zoneEditor"
                                    });
                                }, function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        replace: false,
                                        group: "zoneEditor"
                                    });
                                })
                                .finally(function() {
                                    $uibModalInstance.close({ $value: mxr.resource });
                                });
                        };
                    };

                    list.mxRecordModalController.$inject = ["$uibModalInstance", "domain"];

                    list.create_a_record = function(domainObj) {
                        list.modal.instance = $uibModal.open({
                            templateUrl: "views/a_record_form.html",
                            controller: list.aRecordModalController,
                            controllerAs: "ar",
                            resolve: {
                                domain: function() {
                                    return domainObj.domain;
                                },
                            }
                        });
                    };

                    list.create_cname_record = function(domainObj) {
                        list.modal.instance = $uibModal.open({
                            templateUrl: "views/cname_record_form.html",
                            controller: list.cnameRecordModalController,
                            controllerAs: "cr",
                            resolve: {
                                domain: function() {
                                    return domainObj.domain;
                                }
                            }
                        });
                    };

                    list.create_mx_record = function(domainObj) {
                        list.modal.instance = $uibModal.open({
                            templateUrl: "views/mx_record_form.html",
                            controller: list.mxRecordModalController,
                            controllerAs: "mxr",
                            resolve: {
                                domain: function() {
                                    return domainObj.domain;
                                }
                            }
                        });
                    };

                    function load(force) {
                        if (force === void 0) {
                            force = false;
                        }

                        list.ui.is_loading = true;
                        return Domains.fetch(force)
                            .then(function(data) {
                                list.domains = data;
                                table.loadData(list.domains);
                                list.render();
                            })
                            .catch(function(err) {
                                list.loading_error = true;
                                list.loading_error_message = err;
                            })
                            .finally(function() {
                                list.ui.is_loading = false;
                            });
                    }

                    list.goToView = function(view, domain) {
                        viewNavigationApi.loadView("/" + view + "/" + domain);
                    };

                    list.init = function() {
                        load();
                    };

                    list.init();
                }
            ]);

        return controller;
    }
);

/*
# models/dmarc_record.js                         Copyright(c) 2016 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/models/dmarc_record',[],function() {
        var dmarc_regex = /^[vV]\s*=\s*DMARC1\s*;\s*[pP]\s*=/;
        var dmarc_uri_regex = /^[a-z][a-z0-9+.-]*:[^,!;]+(?:![0-9]+[kmgt]?)?$/i;
        var dmarc_uri_scrub = function(val) {

            /* If the value doesn't have a valid URI scheme and it looks
             * vaguely like an email, turn it into a mailto: URI.  The email
             * check is extremely open ended to allow for internationalized
             * emails, which may be used in mailto: URIs -- no punycode
             * required. */
            // TODO: convert domain to punycode for shorter storage (and better validation)
            if (!/^[a-z][a-z0-9+.-]*:/i.test(val) && /@[^\s@]{2,255}$/.test(val)) {

                /* See https://tools.ietf.org/html/rfc6068#section-2 */
                val = "mailto:" + encodeURI(val).replace(/[\/?#&;=]/g, function(c) {
                    return "%" + c.charCodeAt(0).toString(16);
                });
            }

            /* Additionally, DMARC requires [,!;] to be URI encoded, as they are
             * used specially by DMARC fields. */
            var invalidChars = /[,!;]/g;
            if (invalidChars.test(val)) {

                /* Strip off a valid file size suffix before munging */
                var size = "";
                val = val.replace(/![0-9]+[kmgt]?$/i, function(trail) {
                    size = trail;
                    return "";
                });

                val = val.replace(invalidChars, function(c) {
                    return "%" + c.charCodeAt(0).toString(16);
                });

                val += size;
            }
            return val;
        };

        /**
         * Checks if a variable is defined, null, and not an empty string
         *
         * @method is_defined_and_not_null
         */
        var is_defined_and_not_null = function(val) {
            return val !== void 0 && val !== null && ((typeof val === "string") ? val.length > 0 : true);
        };

        /**
         * Creates a DMARC Record object
         *
         * @class
         */
        function DMARCRecord() {
            this.resetProperties();
        }

        /**
         * Set (or reset) the object properties to defaults
         *
         * @method resetProperties
         */
        DMARCRecord.prototype.resetProperties = function() {
            this.p = "none";
            this.sp = "none";
            this.adkim = "r";
            this.aspf = "r";
            this.pct = 100;
            this.fo = "0";
            this.rf = "afrf";
            this.ri = 86400;
            this.rua = "";
            this.ruf = "";
        };

        DMARCRecord.prototype.validators = {
            p: {
                values: ["none", "quarantine", "reject"],
                defValue: "none"
            },
            sp: {
                values: ["none", "quarantine", "reject"],
            },
            adkim: {
                values: ["r", "s"],
                defValue: "r"
            },
            aspf: {
                values: ["r", "s"],
                defValue: "r"
            },
            rf: {
                multi: ":",
                values: ["afrf", "iodef"],
                defValue: "afrf",
            },
            fo: {
                multi: ":",
                values: ["0", "1", "s", "d"],
                defValue: "0"
            },
            pct: {
                pattern: /^[0-9]{1,2}$|^100$/,
                defValue: 100
            },
            ri: {
                pattern: /^\d+$/,
                defValue: 86400
            },
            rua: {
                multi: ",",
                scrub: dmarc_uri_scrub,
                pattern: dmarc_uri_regex,
                defValue: ""
            },
            ruf: {
                multi: ",",
                scrub: dmarc_uri_scrub,
                pattern: dmarc_uri_regex,
                defValue: ""
            }
        };

        /**
         * Check whether a text string represents a minimal
         * DMARC record
         *
         * @method isDMARC
         * @param {String} stringToTest
         */
        DMARCRecord.prototype.isDMARC = function(stringToTest) {
            return dmarc_regex.test(stringToTest);
        };

        var processValue = function(propValue, validationOpts, filter) {

            /* Split up multi-valued items (as applicable), and strip whitespace */
            var values = [ propValue ];
            if (validationOpts.multi) {
                values = propValue.split(validationOpts.multi).map(function(s) {
                    return s.trim();
                });
            }

            if (validationOpts.scrub) {
                values = values.map(validationOpts.scrub);
            }

            if (filter) {

                /* Define the appropriate test for finding valid entries */
                var test;
                if (validationOpts.pattern) {
                    test = function(val) {
                        return validationOpts.pattern.test(val.toLowerCase());
                    };
                } else if (validationOpts.values) {
                    test = function(val) {
                        return validationOpts.values.indexOf(val.toLowerCase()) > -1;
                    };
                }

                values = filter(values, test);
            }

            var cleanedValue = values.join(validationOpts.multi);
            return cleanedValue;
        };

        /**
         * Validate the value of a given property.
         *
         * @method isValid
         * @param {String} propName
         * @param {String} propValue
         */
        DMARCRecord.prototype.isValid = function(propName, propValue) {
            var isValid;

            /* Return true iff every value is valid */
            processValue(propValue, this.validators[propName], function(values, validator) {
                isValid = values.every(validator);
                return values;
            });

            return isValid;
        };

        /**
         * Validate and save the value of the given property.  Invalid values
         * are stripped from the property.  If no valid values remain, the
         * default value is saved.
         *
         * @method setValue
         * @param {String} propName
         * @param {String} propValue
         * @param {boolean} removeInvalid (optional)
         */
        DMARCRecord.prototype.setValue = function(propName, propValue, removeInvalid) {
            var filter;
            if (removeInvalid) {
                filter = function(values, validator) {
                    return values.filter(validator);
                };
            }

            var cleanedValue = processValue(propValue, this.validators[propName], filter);

            if (cleanedValue.length) {
                if (typeof this[propName] === "number") {
                    this[propName] = parseInt(cleanedValue, 10);
                } else {
                    this[propName] = cleanedValue;
                }
            } else if (propName === "sp") {
                this.sp = this.p;
            } else {
                this[propName] = this.validators[propName].defValue;
            }
        };

        /**
         * Populate the DMARC record properties from a TXT record
         *
         * @method fromTXT
         * @param {String} rawText - The text from a TXT DNS record
         */
        DMARCRecord.prototype.fromTXT = function(rawText) {
            this.resetProperties();

            if (typeof rawText === "string") {
                var properties = rawText.split(";");
                for (var i = 0; i < properties.length; i++) {
                    var keyValue = properties[i].split("=");
                    var propName = keyValue[0].trim().toLowerCase();
                    var propValue = keyValue.slice(1).join("=").trim();
                    if (propName !== "v" && this.hasOwnProperty(propName)) {
                        this.setValue(propName, propValue);
                    }
                }
            }
        };

        /**
         * Return a string version of the DMARC record suitable for saving
         * as a DNS TXT record
         *
         * @method toString
         * @return {String}
         */
        DMARCRecord.prototype.toString = function() {
            var generated_record = "v=DMARC1;p=" + this.p;
            if (is_defined_and_not_null(this.sp)) {
                generated_record += ";sp=" + this.sp;
            }
            if (is_defined_and_not_null(this.adkim)) {
                generated_record += ";adkim=" + this.adkim;
            }
            if (is_defined_and_not_null(this.aspf)) {
                generated_record += ";aspf=" + this.aspf;
            }
            if (is_defined_and_not_null(this.pct)) {
                generated_record += ";pct=" + this.pct;
            }
            if (is_defined_and_not_null(this.fo)) {
                generated_record += ";fo=" + this.fo;
            }
            if (is_defined_and_not_null(this.rf)) {
                generated_record += ";rf=" + this.rf;
            }
            if (is_defined_and_not_null(this.ri)) {
                generated_record += ";ri=" + this.ri;
            }
            if (is_defined_and_not_null(this.rua)) {

                // fix mailto uri list if necessary
                this.setValue("rua", this.rua);
                generated_record += ";rua=" + this.rua;
            }
            if (is_defined_and_not_null(this.ruf)) {

                // fix mailto uri list if necessary
                this.setValue("ruf", this.ruf);
                generated_record += ";ruf=" + this.ruf;
            }
            return generated_record;
        };

        return DMARCRecord;
    }
);

/*
# paper_lantern/zone_editor/directives/dmarc_validators.js  Copyright(c) 2016 cPanel, Inc.
#                                                                     All rights Reserved.
# copyright@cpanel.net                                                   http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* --------------------------*/
/* DEFINE GLOBALS FOR LINT
/*--------------------------*/
/* global define: false     */
/* --------------------------*/

define('app/directives/dmarc_validators',[
    "angular",
    "cjt/util/locale",
    "cjt/validator/validator-utils",
    "app/models/dmarc_record",
    "cjt/validator/validateDirectiveFactory"
],
function(angular, LOCALE, validationUtils, DMARCRecord) {

    var dmarc_record = new DMARCRecord();

    /**
         * Validate dmarc record mailto list
         *
         * @method  dmarcMailtoList
         * @param {string} mailto uri list
         * @param {string} list to validate (rua | ruf)
         * @return {object} validation result
         */
    var validators = {
        dmarcMailtoList: function(val, prop) {
            var result = validationUtils.initializeValidationResult();

            result.isValid = dmarc_record.isValid(prop, val);
            if (!result.isValid) {
                result.add("dmarcMailtoList", LOCALE.maketext("The [asis,URI] list is invalid."));
            }
            return result;
        }
    };

        // Generate a directive for each validation function
    var validatorModule = angular.module("cjt2.validate");
    validatorModule.run(["validatorFactory",
        function(validatorFactory) {
            validatorFactory.generate(validators);
        }
    ]);

    return {
        methods: validators,
        name: "dmarcValidators",
        description: "Validation library for DMARC records.",
        version: 2.0,
    };
});

/*
# paper_lantern/zone_editor/directives/caa_validators.js    Copyright(c) 2017 cPanel, Inc.
#                                                                     All rights Reserved.
# copyright@cpanel.net                                                   http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define('app/directives/caa_validators',[
    "angular",
    "cjt/util/locale",
    "cjt/validator/validator-utils",
    "cjt/validator/domain-validators",
    "cjt/validator/email-validator",
    "cjt/validator/validateDirectiveFactory"
],
function(angular, LOCALE, validationUtils, DOMAIN_VALIDATORS, EMAIL_VALIDATORS) {
    var mailToRegex = /^mailto:/;

    /**
     * Validate caa record iodef variant of value field
     *
     * @method  validate_iodef
     * @param {string} iodef value
     * @return {object} validation result
     */

    var validate_iodef = function(val) {
        var result = validationUtils.initializeValidationResult();
        var otherResult;

        // can be a mailto URL or a standard URL (possibly for some sort of web service)

        result.isValid = false;

        if (mailToRegex.test(val)) {
            val = val.replace(mailToRegex, "");
            otherResult = EMAIL_VALIDATORS.methods.email(val);
        } else {
            otherResult = DOMAIN_VALIDATORS.methods.url(val);
        }

        result.isValid = otherResult.isValid;

        if (!result.isValid) {
            result.add("caaIodef", LOCALE.maketext("You must enter a valid [asis,mailto] or standard [asis,URL]."));
        }

        return result;
    };

    /**
     * Validate caa record issue or issuewild variant of value field
     *
     * @method  validate_issue
     * @param {string} issue/issuewild value
     * @return {object} validation result
     */

    var validate_issue = function(val) {
        var result = validationUtils.initializeValidationResult();

        // should be a valid zone name without optional parameters specified by the issuer.
        // the dns servers we support do not allow additional parameters after the semicolon.

        result.isValid = false;

        if (val === ";") {

            // ";" is a valid issue/issuewild value which disallows any
            // certificates

            result.isValid = true;
        } else {

            var zoneNameResult = DOMAIN_VALIDATORS.methods.zoneFqdn(val);
            result.isValid = zoneNameResult.isValid;
        }

        if (!result.isValid) {
            result.add("caaIssue", LOCALE.maketext("You must enter a valid zone name or a single semicolon."));
        }

        return result;
    };

    var validators = {

        caaValue: function(val, type) {
            if (type === "iodef") {
                return validate_iodef(val);
            } else {
                return validate_issue(val);
            }
        }
    };

    var validatorModule = angular.module("cjt2.validate");
    validatorModule.run(["validatorFactory",
        function(validatorFactory) {
            validatorFactory.generate(validators);
        }
    ]);

    return {
        methods: validators,
        name: "caaValidators",
        description: "Validation library for CAA records.",
        version: 1.0
    };
});

/*
# zone_editor/views/manage.js                        Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

/* jshint -W100 */

define(
    'app/views/manage',[
        "angular",
        "lodash",
        "cjt/util/locale",
        "app/models/dynamic_table",
        "app/models/dmarc_record",
        "cjt/directives/actionButtonDirective",
        "cjt/decorators/paginationDecorator",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/searchDirective",
        "cjt/directives/pageSizeDirective",
        "cjt/directives/validationContainerDirective",
        "cjt/directives/validationItemDirective",
        "cjt/filters/qaSafeIDFilter",
        "cjt/validator/ip-validators",
        "cjt/validator/domain-validators",
        "cjt/validator/compare-validators",
        "cjt/validator/datatype-validators",
        "cjt/services/viewNavigationApi",
        "cjt/services/cpanel/nvDataService",
        "cjt/directives/quickFiltersDirective",
        "cjt/directives/alertList",
        "cjt/services/alertService",
        "app/directives/convert_to_full_record_name",
        "app/directives/dmarc_validators",
        "app/directives/caa_validators",
        "uiBootstrap"
    ],
    function(angular, _, LOCALE, DynamicTable, DMARCRecord) {

        var app = angular.module("cpanel.zoneEditor");

        var controller = app.controller(
            "ManageZoneRecordsController", [
                "$scope",
                "$routeParams",
                "Zones",
                "viewNavigationApi",
                "$uibModal",
                "Features",
                "defaultInfo",
                "nvDataService",
                "alertService",
                function(
                    $scope,
                    $routeParams,
                    Zones,
                    viewNavigationApi,
                    $uibModal,
                    Features,
                    defaultInfo,
                    nvDataService,
                    alertService) {
                    var manage = this;

                    manage.is_loading = false;
                    manage.zone_records = [];
                    manage.domain = $routeParams.domain;
                    manage.loading_error = false;
                    manage.loading_error_message = "";
                    manage.Features = Features;
                    manage.generated_domains = {};

                    var previous_name_entry, previous_ttl_entry;

                    manage.adding_record = false;
                    manage.editing_record = false;
                    manage.save_in_progress = false;
                    manage.record_being_edited = null;
                    manage.dmarc_optional_params_shown = false;

                    manage.new_record = {
                        name: "",
                        ttl: null,
                        class: "IN",
                        type: "A",
                        a_address: "",
                        aaaa_address: "",
                        address: "",
                        cname: "",
                        priority: null,
                        weight: null,
                        port: null,
                        target: "",
                        txtdata: "",
                        exchanger: "",
                        preference: null,
                        line: null,
                        flag: 0,
                        tag: "issue",
                        value: "",
                        _id: null
                    };

                    manage.dmarc_record = new DMARCRecord();
                    manage.raw_dmarc_active = false;
                    manage.editing_dmarc = false;

                    manage.updateDMARCRecordFromTXT = function() {
                        manage.dmarc_record.fromTXT(manage.new_record.txtdata);
                        manage.raw_dmarc_active = false;
                    };

                    manage.updateTXTFromDMARCRecord = function() {
                        manage.new_record.txtdata = manage.dmarc_record.toString();
                        manage.raw_dmarc_active = true;
                    };

                    if (Features.mx && !Features.simple && !Features.advanced) {
                        manage.new_record.type = "MX";
                        manage.new_record.name = manage.domain + ".";
                    }

                    manage.resetNewRecord = function() {
                        manage.new_record.type = "A";
                        manage.new_record.name = "";
                        manage.new_record.ttl = manage.default_ttl;
                        manage.new_record.class = "IN";
                        manage.new_record.a_address = "";
                        manage.new_record.aaaa_address = "";
                        manage.new_record.address = "";
                        manage.new_record.cname = "";
                        manage.new_record.priority = null;
                        manage.new_record.weight = null;
                        manage.new_record.port = null;
                        manage.new_record.target = "";
                        manage.new_record.txtdata = "";
                        manage.new_record.exchanger = "";
                        manage.new_record.preference = null;
                        manage.new_record.line = null;
                        manage.new_record.tag = "issue";
                        manage.new_record.flag = 0;
                        manage.new_record.value = "";
                        manage.new_record._id = null;
                        manage.add_zr_form.$setPristine(true);
                        previous_name_entry = null;

                        manage.dmarc_record = new DMARCRecord();
                        manage.editing_dmarc = false;
                        manage.dmarc_optional_params_shown = false;

                        if (Features.mx && !Features.simple && !Features.advanced) {
                            manage.new_record.type = "MX";
                            manage.new_record.name = manage.domain + ".";
                        }
                    };

                    var table = new DynamicTable();

                    function searchByName(item, searchText) {
                        return item.name.indexOf(searchText) !== -1;
                    }
                    function searchByType(item, type) {
                        return item.type === type;
                    }

                    table.setFilterFunction(searchByName);
                    table.setQuickFilterFunction(searchByType);
                    table.meta.pageSize = defaultInfo.zones_per_page;

                    manage.meta = table.getMetadata();
                    manage.filteredList = table.getList();
                    manage.paginationMessage = table.paginationMessage;
                    manage.render = function() {

                    // Close the form when we render the list
                        manage.close_add_record();
                        manage.filteredList = table.populate();
                    };
                    manage.sortList = function() {
                        manage.render();
                    };
                    manage.selectPage = function() {
                        manage.render();
                    };
                    manage.selectPageSize = function() {
                        manage.render();
                        if (defaultInfo.zones_per_page !== table.meta.pageSize) {
                            nvDataService.setObject(
                                {
                                    zones_per_page: table.meta.pageSize
                                })
                                .then(function() {
                                    defaultInfo.zones_per_page = table.meta.pageSize;
                                })
                                .catch(function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        replace: false,
                                        group: "zoneEditor"
                                    });
                                });
                        }
                    };
                    manage.searchList = function() {
                        manage.render();
                    };

                    manage.dynamicPlaceholders = {
                        issue: LOCALE.maketext("Certificate Authority"),
                        iodef: LOCALE.maketext("Mail Address for Notifications")
                    };

                    manage.dynamicTooltips = {
                        issue: LOCALE.maketext("The certificate authority’s domain name."),
                        iodef: LOCALE.maketext("The location to which the certificate authority will report exceptions. Either a [asis,mailto] or standard [asis,URL].")
                    };

                    manage.valueTooltip = function() {
                        if (manage.new_record.tag === "iodef") {
                            return manage.dynamicTooltips.iodef;
                        }

                        return manage.dynamicTooltips.issue;
                    };

                    manage.valuePlaceholder = function() {
                        if (manage.new_record.tag === "iodef") {
                            return manage.dynamicPlaceholders.iodef;
                        }

                        return manage.dynamicPlaceholders.issue;
                    };

                    function RemoveRecordModalController($uibModalInstance, record) {
                        var ctrl = this;
                        ctrl.record = record;

                        ctrl.cancel = function() {
                            $uibModalInstance.dismiss("cancel");
                        };
                        ctrl.confirm = function() {
                            return Zones.remove_zone_record(manage.domain, record)
                                .then(function() {
                                    if (record.type === "MX" && record.name === manage.domain + ".") {
                                        alertService.add({
                                            type: "success",
                                            message: LOCALE.maketext("You successfully deleted the [asis,_1] record.", record.type),
                                            closeable: true,
                                            replace: false,
                                            autoClose: 10000,
                                            group: "zoneEditor"
                                        });
                                    } else {
                                        alertService.add({
                                            type: "success",
                                            message: LOCALE.maketext("You successfully deleted the [asis,_1] record: [_2]", record.type, _.escape(record.name)),
                                            closeable: true,
                                            replace: false,
                                            autoClose: 10000,
                                            group: "zoneEditor"
                                        });
                                    }
                                    manage.refresh();
                                })
                                .catch(function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        replace: false,
                                        group: "zoneEditor"
                                    });
                                })
                                .finally(function() {
                                    $uibModalInstance.close();
                                });
                        };
                    }

                    RemoveRecordModalController.$inject = ["$uibModalInstance", "record"];

                    function ResetZoneModalController($uibModalInstance) {
                        var ctrl = this;

                        ctrl.cancel = function() {
                            $uibModalInstance.dismiss("cancel");
                        };
                        ctrl.confirm = function() {
                            return Zones.reset_zone(manage.domain)
                                .then(function() {
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("You successfully reset the zone for “[_1]”.", manage.domain),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "zoneEditor"
                                    });
                                    manage.refresh();
                                })
                                .catch(function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        replace: false,
                                        group: "zoneEditor"
                                    });
                                })
                                .finally(function() {
                                    $uibModalInstance.close();
                                });
                        };
                    }

                    ResetZoneModalController.$inject = ["$uibModalInstance"];

                    manage.open_add_record = function(recordType) {
                        if (!manage.adding_record) {
                            if (typeof recordType !== "undefined") {
                                manage.new_record.type = recordType;
                                if (manage.new_record.type === "DMARC") {
                                    manage.new_record.name = Zones.format_zone_name(manage.domain, "_dmarc.");
                                    manage.new_record.txtdata = manage.dmarc_record.toString();
                                    manage.new_record.type = "TXT";
                                    manage.editing_dmarc = true;
                                    manage.add_zr_form.$setDirty();
                                }
                            }
                            manage.adding_record = true;
                        }
                    };

                    manage.restore_default_editor_position = function() {

                    // move the add record form back to the first row in the table
                        var edit_form = document.getElementById("addRecordForm");
                        var loading_notice = document.getElementById("loadingNotice");
                        loading_notice.parentNode.insertBefore(edit_form, loading_notice);
                    };

                    manage.close_add_record = function() {
                        if (manage.editing_record && manage.new_record.line) {

                        // show the line formerly being edited
                            manage.record_being_edited = null;
                        }

                        // hide the editor
                        manage.adding_record = false;
                        manage.editing_record = false;
                        manage.editing_dmarc = false;
                        manage.restore_default_editor_position();
                        manage.resetNewRecord();
                    };

                    manage.save_edited_record = function() {
                        manage.save_in_progress = true;

                        // set the priority = preference if MX record
                        if (manage.new_record.type === "MX") {
                            manage.new_record.priority = manage.new_record.preference;
                        }

                        var update_candidate = manage.build_update_candidate(false);

                        return Zones.update_record(manage.domain, update_candidate)
                            .then(function() {
                                if (manage.new_record.type === "MX" && manage.new_record.name === manage.domain + ".") {
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("You successfully updated the [asis,_1] record for “[_2]”.", manage.new_record.type, manage.domain),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "zoneEditor"
                                    });
                                } else {
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("You successfully updated the following [asis,_1] record for “[_2]”: [_3]", manage.new_record.type, manage.domain, _.escape(manage.new_record.name)),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "zoneEditor"
                                    });
                                }


                                // updated the item in the list, if found
                                if (update_candidate.line !== null) {

                                // update the data store for the Dynamic Table
                                    table.items[update_candidate._id] = _.extend(table.items[update_candidate._id], update_candidate);

                                    // In case this item is currently displayed (likely), we need to update
                                    // that item in the currently displayed list. Usually, we just call populate
                                    // on the Dynamic Table to do this, however that would cause the list to be reloaded
                                    // which is not desirable in this case.
                                    for (var i = 0, len = manage.filteredList.length; i < len; i++) {
                                        if (manage.filteredList[i].line === update_candidate.line) {
                                            manage.filteredList[i] = _.extend(manage.filteredList[i], update_candidate);
                                            break;
                                        }
                                    }
                                }

                                manage.resetNewRecord();
                                manage.record_being_edited = null;
                                manage.restore_default_editor_position();
                                manage.editing_record = false;
                                manage.editing_dmarc = false;
                            })
                            .catch(function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    replace: false,
                                    group: "zoneEditor"
                                });
                            })
                            .finally(function() {
                                manage.save_in_progress = false;
                            });
                    };

                    manage.confirm_add_record = function() {
                        manage.save_in_progress = true;

                        // set the priority = preference if MX record

                        var update_candidate = manage.build_update_candidate(true);

                        return Zones.add_record(manage.domain, update_candidate)
                            .then(function() {
                                if (manage.new_record.type === "MX" && manage.new_record.name === manage.domain + ".") {
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("You successfully added the [asis,_1] record for “[_2]”.", manage.new_record.type, manage.domain),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "zoneEditor"
                                    });
                                } else {
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("You successfully added the following [asis,_1] record for “[_2]”: [_3]", manage.new_record.type, manage.domain, _.escape(manage.new_record.name)),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "zoneEditor"
                                    });
                                }
                                manage.resetNewRecord();
                                manage.adding_record = false;
                                manage.refresh();
                            })
                            .catch(function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    replace: false,
                                    group: "zoneEditor"
                                });
                            })
                            .finally(function() {
                                manage.save_in_progress = false;
                            });
                    };

                    manage.field_has_error = function(form, fieldName) {
                        return form && fieldName && form[fieldName].$invalid && form[fieldName].$dirty;
                    };

                    $scope.$watch("manage.new_record.type", function(newValue, oldValue) {
                        if (oldValue === newValue) {
                            return;
                        }

                        /*
                     * If the user changes to an MX record, we need to change the
                     * name to match the domain. We also store whatever was there previously
                     * to be used later.
                     */
                        if (newValue === "MX") {
                            previous_name_entry = manage.new_record.name;
                            previous_ttl_entry = manage.new_record.ttl;
                            if (!previous_name_entry) {
                                manage.new_record.name = manage.domain + ".";
                            }
                            return;
                        }

                        /*
                     * If the user changes to any other record, we set the name back to
                     * whatever was there previously. To avoid setting it to something
                     * weird, we unset our variable that stored the previous name value.
                     */
                        if (oldValue === "MX") {
                            manage.new_record.name = previous_name_entry;
                            manage.new_record.ttl = previous_ttl_entry;
                            previous_name_entry = null;
                            previous_ttl_entry = null;
                            return;
                        }
                    });

                    manage.build_update_candidate = function(isNewRecord) {
                        var update_candidate = {};

                        update_candidate.name = manage.new_record.name;
                        update_candidate.type = manage.new_record.type;
                        update_candidate.class = manage.new_record.class;
                        update_candidate.ttl = manage.new_record.ttl;
                        if (!isNewRecord) {
                            update_candidate.line = manage.new_record.line;
                            update_candidate._id = manage.new_record._id;
                        }

                        switch (manage.new_record.type) {
                            case "MX":
                                update_candidate.exchange = manage.new_record.exchanger;
                                update_candidate.exchanger = manage.new_record.exchanger;
                                update_candidate.preference = manage.new_record.preference;
                                update_candidate.priority = manage.new_record.preference;
                                break;
                            case "SRV":
                                update_candidate.weight = manage.new_record.weight;
                                update_candidate.port = manage.new_record.port;
                                update_candidate.priority = manage.new_record.priority;
                                update_candidate.target = manage.new_record.target;
                                break;
                            case "CAA":
                                update_candidate.tag = manage.new_record.tag;
                                update_candidate.flag = manage.new_record.flag;
                                update_candidate.value = manage.new_record.value;
                                break;
                            case "CNAME":
                                update_candidate.cname = manage.new_record.cname;
                                update_candidate.record = manage.new_record.cname;
                                break;
                            case "TXT":
                                if (manage.editing_dmarc && !manage.raw_dmarc_active) {
                                    manage.new_record.txtdata = manage.dmarc_record.toString();
                                }
                                update_candidate.txtdata = manage.new_record.txtdata;
                                update_candidate.record = manage.new_record.txtdata;
                                break;
                            case "A":
                                update_candidate.address = manage.new_record.a_address;
                                update_candidate.record = manage.new_record.a_address;
                                break;
                            case "AAAA":
                                update_candidate.address = manage.new_record.aaaa_address;
                                update_candidate.record = manage.new_record.aaaa_address;
                        }

                        return update_candidate;
                    };

                    manage.edit_record = function(zoneRecord) {
                        manage.adding_record = false;

                        // set up data structure for editing
                        manage.new_record.name = zoneRecord.name;
                        manage.new_record.type = zoneRecord.type;
                        manage.new_record.class = zoneRecord.class;
                        manage.new_record.ttl = zoneRecord.ttl;
                        manage.new_record.line = zoneRecord.line;
                        manage.new_record._id = zoneRecord._id;

                        switch (zoneRecord.type) {
                            case "MX":
                                manage.new_record.exchanger = zoneRecord.exchange;
                                manage.new_record.preference = zoneRecord.preference;
                                break;
                            case "SRV":
                                manage.new_record.weight = zoneRecord.weight;
                                manage.new_record.port = zoneRecord.port;
                                manage.new_record.priority = zoneRecord.priority;
                                manage.new_record.target = zoneRecord.target;
                                break;
                            case "CAA":
                                manage.new_record.tag = zoneRecord.tag;
                                manage.new_record.flag = zoneRecord.flag;
                                manage.new_record.value = zoneRecord.value;
                                break;
                            case "CNAME":
                                manage.new_record.cname = zoneRecord.cname;
                                break;
                            case "TXT":
                                manage.new_record.txtdata = zoneRecord.txtdata;
                                if (manage.editing_dmarc || manage.dmarc_record.isDMARC(manage.new_record.txtdata)) {
                                    manage.dmarc_record.fromTXT(manage.new_record.txtdata);
                                    manage.editing_dmarc = true;
                                    manage.add_zr_form.$setDirty();
                                }
                                break;
                            case "A":
                                manage.new_record.a_address = zoneRecord.address;
                                break;
                            case "AAAA":
                                manage.new_record.aaaa_address = zoneRecord.address;
                                break;
                        }

                        // move the form to the right position in the table
                        var edit_form = document.getElementById("addRecordForm");
                        var row_to_edit = document.getElementById("zone_rec_row_" + zoneRecord.line);
                        row_to_edit.parentNode.insertBefore(edit_form, row_to_edit);

                        manage.record_being_edited = zoneRecord.line;
                        manage.editing_record = true;
                    };

                    manage.confirm_delete_record = function(record) {
                        manage.close_add_record();
                        $uibModal.open({
                            templateUrl: "confirm_delete.html",
                            controller: RemoveRecordModalController,
                            controllerAs: "ctrl",
                            resolve: {
                                record: function() {
                                    return record;
                                },
                            }
                        });
                    };

                    manage.confirm_reset_zone = function() {

                    // we do not want the user to do a reset if they are editing/adding
                        if (manage.editing_record || manage.adding_record) {
                            return;
                        }

                        $uibModal.open({
                            templateUrl: "confirm_reset_zone.html",
                            controller: ResetZoneModalController,
                            controllerAs: "ctrl"
                        });
                    };

                    manage.refresh = function() {

                    // we do not want the user to refresh if they are editing/adding
                        if (manage.editing_record || manage.adding_record) {
                            return;
                        }

                        return load(true);
                    };

                    function load(force) {
                        if (force === void 0) {
                            force = false;
                        }

                        manage.is_loading = true;
                        return Zones.fetch(manage.domain, force)
                            .then(function(data) {
                                manage.zone_records = [];

                                for (var i = 0, len = data.length; i < len; i++) {
                                    if (data[i].type === "$TTL") {
                                        manage.default_ttl = data[i].ttl;
                                        continue;
                                    }

                                    // if the user does not have the advanced feature,
                                    // do not display records that are cpanel generated/controlled
                                    if (Features.simple &&
                                    !Features.advanced &&
                                    data[i].type !== "MX" &&
                                    manage.generated_domains[data[i].name]) {
                                        continue;
                                    }

                                    if (
                                        ((data[i].type === "A" || data[i].type === "CNAME") && manage.Features.simple) ||
                                    (data[i].type === "MX" && manage.Features.mx) ||
                                    (data[i].type !== "MX" && manage.Features.advanced)
                                    ) {
                                        manage.zone_records.push(data[i]);
                                    }
                                }

                                table.loadData(manage.zone_records);
                                manage.render();
                                manage.new_record.ttl = manage.default_ttl;
                            })
                            .catch(function(error) {

                            // If we get an error at this point, we assume that the user
                            // should not be able to do anything on the page.
                                manage.loading_error = true;
                                manage.loading_error_message = error;
                            })
                            .finally(function() {
                                manage.is_loading = false;
                            });
                    }

                    manage.goToView = function(view) {
                        viewNavigationApi.loadView(view);
                    };

                    manage.init = function() {
                        manage.is_loading = true;
                        return Zones.fetch_generated_domains(manage.domain, true)
                            .then(function(data) {
                                manage.generated_domains = data;
                                return load(true);
                            })
                            .catch(function(error) {
                                manage.loading_error = true;
                                manage.loading_error_message = error;
                            });
                    };

                    manage.init();
                }
            ]);

        return controller;
    }
);

/*
# zone_editor/views/dnssec.js                     Copyright(c) 2016 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

/* jshint -W100 */

define(
    'app/views/dnssec',[
        "angular",
        "cjt/util/locale",
        "cjt/util/parse",
        "cjt/directives/toggleSwitchDirective",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/alertList",
        "cjt/services/alertService",
        "cjt/services/viewNavigationApi",
        "uiBootstrap"
    ],
    function(angular, LOCALE, PARSE) {

        var app = angular.module("cpanel.zoneEditor");

        var controller = app.controller(
            "DnsSecController",
            ["$scope", "$q", "$routeParams", "viewNavigationApi", "DNSSEC", "Features", "alertService",
                function($scope, $q, $routeParams, viewNavigationApi, DNSSEC, Features, alertService) {
                    var dnssec = this;
                    dnssec.domain = $routeParams.domain;

                    dnssec.is_loading = false;
                    dnssec.loading_error = false;
                    dnssec.loading_error_message = "";
                    dnssec.enabled = false;
                    dnssec.keys = [];

                    dnssec.goToView = function(view) {
                        viewNavigationApi.loadView(view);
                    };

                    function parseDnssecKeys(dnssecKeys) {

                    // we need to do a little massaging of the data to make it easier
                    // to work with in the angular templates and to help with being able to
                    // show a digest for a particular algorithm
                        for (var i = 0, len = dnssecKeys.length; i < len; i++) {
                            var key = dnssecKeys[i];
                            key.active = PARSE.parsePerlBoolean(key.active);

                            // We want to show the SHA-256 keys by default
                            for (var j = 0, digestLen = key.digests.length; j < digestLen; j++) {
                                var item = key.digests[j];
                                if (item.algo_num === "2") {
                                    key.selected_digest = item;
                                }
                            }

                            key.bits_msg = LOCALE.maketext("[quant,_1,bit,bits]", key.bits);

                            // select the first digest, if we don't see a SHA-256 key
                            if (!key.hasOwnProperty("selected_digest")) {
                                key.selected_digest = key.digests[0];
                            }
                        }
                    }

                    dnssec.toggle_status = function() {
                        if (dnssec.enabled) {
                            dnssec.show_disable_warning = true;
                            return;
                        }

                        return DNSSEC.enable(dnssec.domain)
                            .then(function(result) {
                                return DNSSEC.fetch(dnssec.domain)
                                    .then(function(result) {
                                        if (result.length) {
                                            dnssec.enabled = true;
                                            dnssec.keys = result;
                                            parseDnssecKeys(dnssec.keys);
                                        } else {
                                            dnssec.enabled = false;
                                        }
                                    })
                                    .catch(function(error) {
                                        alertService.add({
                                            type: "danger",
                                            message: error,
                                            closeable: true,
                                            replace: false,
                                            group: "zoneEditor"
                                        });
                                    });
                            })
                            .catch(function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    replace: false,
                                    group: "zoneEditor"
                                });
                            });
                    };

                    dnssec.confirm_disable = function() {
                        return DNSSEC.disable(dnssec.domain)
                            .then(function(result) {
                                dnssec.enabled = false;
                            })
                            .catch(function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    replace: false,
                                    group: "zoneEditor"
                                });
                            })
                            .finally(function() {
                                dnssec.show_disable_warning = false;
                            });
                    };

                    dnssec.cancel_disable = function() {
                        dnssec.show_disable_warning = false;
                    };

                    dnssec.load = function() {
                        dnssec.is_loading = true;
                        return DNSSEC.fetch(dnssec.domain)
                            .then(function(result) {
                                if (result.length) {
                                    dnssec.enabled = true;
                                    dnssec.keys = result;
                                    parseDnssecKeys(dnssec.keys);
                                } else {
                                    dnssec.enabled = false;
                                }
                            })
                            .catch(function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    replace: false,
                                    group: "zoneEditor"
                                });
                            })
                            .finally(function() {
                                dnssec.is_loading = false;
                            });
                    };

                    dnssec.init = function() {
                        if (Features.dnssec) {
                            dnssec.load();
                        } else {
                            dnssec.loading_error = true;
                            dnssec.loading_error_message = LOCALE.maketext("This feature is not available to your account.");
                        }
                    };

                    dnssec.init();
                }
            ]);

        return controller;
    }
);

/*
# zone_editor/index.js                            Copyright(c) 2016 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/
/* global require: false, define: false, PAGE: false */

define(
    'app/index',[
        "angular",
        "jquery",
        "lodash",
        "cjt/core",
        "cjt/modules",
        "ngRoute",
        "uiBootstrap"
    ],
    function(angular) {

        "use strict";

        return function() {

            // First create the application
            angular.module("cpanel.zoneEditor", ["ngRoute", "ui.bootstrap", "cjt2.cpanel"]);

            // Then load the application dependencies
            var app = require(
                [
                    "cjt/bootstrap",
                    "cjt/services/alertService",
                    "cjt/directives/alert",
                    "cjt/directives/alertList",
                    "app/services/page_data_service",
                    "app/services/domains",
                    "app/services/zones",
                    "app/services/dnssec",
                    "app/services/features",
                    "app/models/dynamic_table",
                    "app/directives/convert_to_full_record_name",
                    "app/views/domain_selection",
                    "app/views/manage",
                    "app/views/dnssec",
                    "app/models/dmarc_record"
                ], function(BOOTSTRAP) {

                    var app = angular.module("cpanel.zoneEditor");

                    // setup the defaults for the various services.
                    app.factory("defaultInfo", [
                        "pageDataService",
                        function(pageDataService) {
                            return pageDataService.prepareDefaultInfo(PAGE);
                        }
                    ]);

                    app.config([
                        "$routeProvider",
                        function($routeProvider) {

                            $routeProvider.when("/list", {
                                controller: "ListDomainsController",
                                controllerAs: "list",
                                templateUrl: "zone_editor/views/domain_selection.ptt"
                            });

                            $routeProvider.when("/manage/:domain", {
                                controller: "ManageZoneRecordsController",
                                controllerAs: "manage",
                                templateUrl: "zone_editor/views/manage.ptt"
                            });

                            $routeProvider.when("/dnssec/:domain", {
                                controller: "DnsSecController",
                                controllerAs: "dnssec",
                                templateUrl: "zone_editor/views/dnssec.ptt"
                            });

                            $routeProvider.otherwise({
                                "redirectTo": "/list"
                            });
                        }
                    ]);

                    BOOTSTRAP("#content", "cpanel.zoneEditor");

                });

            return app;
        };
    }
);

