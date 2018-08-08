/*
# user_manager/services/serverInfoService         Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [

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
