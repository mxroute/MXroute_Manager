/*
# site_publisher/services/publishService.js       Copyright(c) 2016 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false, _: true */
define(
    [
        "angular",
        "cjt/io/api",
        "cjt/io/uapi-request",
        "cjt/io/uapi", // IMPORTANT: Load the driver so its ready
    ],
    function(angular, API, APIREQUEST) {

        var app = angular.module("App");

        function publishServiceFactory($q) {
            var publishService = {};

            /**
             * Converts the response to our application data structure
             * @param  {Object} response
             * @return {Object} Sanitized data structure.
             */
            publishService.convertResponseToList = function(response) {
                var items = [];
                if (response.data) {

                    var data = response.data;
                    for (var i = 0, length = data.length; i < length; i++) {
                        items.push(data[i]);
                    }

                    var meta = response.meta || {};
                    if ( !angular.isDefined(meta.paginate) ) {
                        meta.paginate = {
                            total_records: data.length,
                            total_pages: 1
                        };
                    }
                    if ( !angular.isDefined(meta.records_before_filter) ) {
                        meta.records_before_filter = data.length;
                    }

                    return {
                        meta: meta,
                        data: items
                    };
                } else {
                    return {
                        meta: {
                            paginate: {
                                total_records: 0,
                                total_pages: 0
                            }
                        },
                        data: []
                    };
                }
            };

            /**
             * Lists the domains with user settings
             * @param  {Object} meta The meta data to filter the domain list by
             * @return {Promise} Promise that will fulfill the request.
             */
            publishService.listDomains = function(meta) {
                var deferred = $q.defer();
                var apiCall = new APIREQUEST.Class();

                apiCall.initialize("SiteTemplates", "list_user_settings");

                if (meta) {
                    if (meta.currentPage) {
                        apiCall.addPaging(meta.currentPage, meta.pageSize || 10);
                    }
                    if (meta.filterBy && meta.filterCompare && meta.filterValue) {
                        apiCall.addFilter(meta.filterBy, meta.filterCompare, meta.filterValue);
                    }
                }

                API.promise(apiCall.getRunArguments())
                    .done(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            deferred.resolve(response);
                        } else {
                            deferred.reject(response.error);
                        }
                    });

                return deferred.promise;
            };

            /**
             * Publishes the site
             * @param  {Object} template The selected template
             * @param  {Object} domain The selected domain
             * @return {Promise} Promise that will fulfill the request.
             */
            publishService.publish = function(template, domain) {
                var deferred = $q.defer();
                var apiCall = new APIREQUEST.Class();
                var fields = _.map(template.meta.fields, function(field) {
                    if ( field.value && field.type.indexOf("date", 0) === 0 ) {
                        if (field.value.toString() !== "Invalid Date") {
                            try {

                                // return the proper ISO format for date fields
                                return { "id": field.id, "value": new Date(field.value).toISOString() };
                            } catch (ex) {
                                return { "id": field.id, "value": "" };
                            }
                        } else {
                            return { "id": field.id, "value": "" };
                        }
                    }
                    return _.pick(field, ["id", "value"]);
                });
                apiCall.initialize("SiteTemplates", "publish");
                apiCall.addArgument("path", template.path);
                apiCall.addArgument("template", template.template);
                apiCall.addArgument("docroot", domain.documentroot);
                apiCall.addArgument("domain_url", domain.url);

                for ( var i = 0, length = fields.length; i < length; i++ ) {
                    apiCall.addArgument(fields[i].id, fields[i].value);
                }

                API.promise(apiCall.getRunArguments())
                    .done(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            deferred.resolve(response);
                        } else {
                            deferred.reject(response.error);
                        }
                    });

                return deferred.promise;
            };

            return publishService;
        }

        publishServiceFactory.$inject = ["$q"];
        return app.factory("publishService", publishServiceFactory);
    });
