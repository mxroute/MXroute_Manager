/*
 * version_control/services/knownHostsService.js      Copyright 2018 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* eslint-env amd */
/* global PAGE: false */
define(
    [
        "angular",
        "cjt/util/locale",
        "cjt/util/parse",
        "cjt/io/uapi-request",
        "cjt/io/uapi",
        "cjt/services/APIService",
    ],
    function(angular, LOCALE, PARSE, UAPIREQUEST) {
        "use strict";

        var app = angular.module("cpanel.versionControl.knownHostsService", ["cjt2.services.api"]);
        app.value("PAGE", PAGE); // TODO: Consolidate this higher up

        app.factory("knownHostsService", [
            "$q",
            "APIService",
            "$filter",
            "PAGE",
            "$timeout",
            "$rootScope",
            function($q, APIService, $filter, PAGE, $timeout, $rootScope) {

                var KnownHostsService = function() {};
                KnownHostsService.prototype = new APIService();

                angular.extend(KnownHostsService.prototype, {

                    /**
                     * Checks whether the current keys for a given hostname/port combination
                     * are in the known_hosts file. This is helpful to use before cloning or
                     * pulling, since the errors provided by those APIs are not very clear
                     * when keys are missing or mismatched.
                     *
                     * The known_hosts file differentiates by port, so that is why we need to
                     * provide the port.
                     *
                     * @param  {String} hostname      The hostname to check
                     * @param  {Number|String} port   The port to check
                     * @return {Promise}              If resolved, then the keys already exists in
                     *                                the known_hosts file. If rejected, then the keys
                     *                                don't exist in the known_hosts file. In most cases
                     *                                the object provided to the promise callback will
                     *                                contain a 'keys' property containing the current
                     *                                keys for the server.
                     */
                    verify: function(hostname, port) {
                        var apiCall = new UAPIREQUEST.Class();
                        apiCall.initialize("KnownHosts", "verify");

                        apiCall.addArgument("host_name", hostname);
                        if (port) {
                            apiCall.addArgument("port", port);
                        }

                        return this.deferred(apiCall).promise.then(
                            function success(res) {
                                var data = res && res.data || {};

                                if (data.status) {
                                    return {
                                        status: "recognized",
                                    };
                                } else if (data.host.length && data.failure_type) {
                                    return $q.reject({
                                        status: "unrecognized-" + data.failure_type,
                                        keys: data.host,
                                    });
                                }

                                return $q.reject({
                                    status: "unrecognized-unknown",
                                });
                            },
                            function failure(error) {
                                return $q.reject({
                                    status: "unrecognized-unknown",
                                    error: error,
                                });
                            }
                        );
                    },

                    /**
                     * Adds the current keys for an SSH server listening on a given
                     * hostname/port combination to the user's known_hosts file.
                     *
                     * @param  {String} hostname      The server's hostname
                     * @param  {Number|String} port   The server's port
                     * @return {Promise}              If resolved, then the operation was successful.
                     *                                Rejections are not caught or manipulated because
                     *                                we cannot be sure what the status was before we
                     *                                tried to add the host keys, so we just pass the
                     *                                API error through as normal.
                     */
                    create: function(hostname, port) {
                        var apiCall = new UAPIREQUEST.Class();
                        apiCall.initialize("KnownHosts", "create");

                        apiCall.addArgument("host_name", hostname);
                        if (port) {
                            apiCall.addArgument("port", port);
                        }

                        return this.deferred(apiCall).promise.then(function(res) {
                            return {
                                status: "recognized",
                            };
                        });
                    }

                });

                return new KnownHostsService();
            }
        ]);
    }
);
