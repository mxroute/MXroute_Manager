/*
 * version_control/services/sshKeyVerification.js     Copyright 2018 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* eslint-env amd */

define([
    "angular",
    "lodash",
    "cjt/util/locale",
    "app/utils/cloneUrlParser",
    "ngSanitize",
    "uiBootstrap",
    "app/services/knownHostsService",
    "cjt/directives/actionButtonDirective",
], function(
        angular,
        _,
        LOCALE,
        cloneUrlParser
    ) {

    "use strict";

    angular
        .module("cpanel.versionControl.sshKeyVerificationService", ["cpanel.versionControl.knownHostsService", "ui.bootstrap", "ngSanitize", "cjt2.directives.actionButton", ])
        .factory("sshKeyVerification", [
            "knownHostsService",
            "$uibModal",
            function(
                knownHostsService,
                $uibModal
            ) {

                var _memoizedVerify = _initMemoizedVerify();

                var service = {

                    // A memoized version of knownHostsService.verify
                    verify: _memoizedVerify,

                    /**
                     * Get the hostname and port of an SSH-based clone URL.
                     *
                     * @param  {String} cloneUrl    The URL to parse
                     * @return {Object|Undefined}   An object with hostname and port properties, unless
                     *                              it is not an SSH-based URL
                     */
                    getHostnameAndPort: function getHostnameAndPort(cloneUrl) {
                        var parts = cloneUrlParser.parse(cloneUrl);

                        if (parts.scheme === "ssh://" || (!parts.scheme && parts.userInfo)) {
                            return {
                                hostname: parts.authority || parts.ipv6Authority,
                                port: parts.port,
                            };
                        }
                    },

                    /**
                     * Opens a modal for key verification so that the user can choose
                     * whether to accept and save the key or not.
                     *
                     * @param {Object}         props             An object of properties that the modal will use.
                     * @param {String}         props.hostname    The server's hostname.
                     * @param {String|Number} [props.port]       The server's port (optional).
                     * @param {String}         props.type        The key's failure type (unrecognized-new, unrecognized-changed)
                     * @param {Function}      [props.onAccept]   A callback function that is called when someone chooses to accept
                     *                                           the new/changed key and save it to known_hosts. This function is
                     *                                           called with one argument - a promise that resolves when the changes
                     *                                           are successfully saved and rejects when it's unsuccessful.
                     * @return {Modal}   An angular-ui-bootstrap modal instance
                     */
                    openModal: function openModal(props) {
                        var self = this;
                        self.modal = $uibModal.open({
                            templateUrl: "views/sshKeyVerification.ptt",
                            controllerAs: "modal",
                            controller: KeyVerificationController,
                            resolve: {
                                props: function() {
                                    return props;
                                },
                            },
                        });

                        self.modal.result.finally(function() {
                            delete self.modal;
                        });

                        return self.modal;
                    },

                };


                /**
                 * The constructor for the SSH key verification modal controller.
                 *
                 * See service.openModal for documentation on the props argument.
                 */
                function KeyVerificationController(props) {
                    _.assign(this, props);
                }

                KeyVerificationController.$inject = ["props"];

                _.assign(KeyVerificationController.prototype, {

                    /**
                     * Attempt to add the host to the known_hosts file and continue with
                     * creation.
                     *
                     * @return {Promise}   When resolved, we successfully added the host.
                     *                     When rejected, something went wrong.
                     */
                    acceptIdentity: function acceptIdentity() {
                        var self = this;

                        var acceptPromise = knownHostsService.create( self.hostname, self.port ).then(
                            function success(data) {
                                return data.status;
                            }
                        ).finally(function() {

                            // We attempted a change to the known_hosts file, so our cached verification results are probably stale
                            var cacheKey = _memoizedVerifyResolver(self.hostname, self.port);
                            _memoizedVerify.cache.delete(cacheKey);
                            _memoizedVerify(self.hostname, self.port);
                        });

                        return self.onAccept ? self.onAccept(acceptPromise) : acceptPromise;
                    },

                    rejectIdentity: function rejectIdentity() {
                        service.modal.dismiss();
                    },

                    newKeyIntro: function newKeyIntro() {
                        return LOCALE.maketext("You have not connected this [asis,cPanel] account to the SSH server for “[output,strong,_1].” The system cannot verify the server’s identity.", this.hostname);
                    },

                    changedKeyIntro: function changedKeyIntro() {
                        return LOCALE.maketext("The current identity of the SSH server at “[output,strong,_1]” does not match its identity in your account’s [asis,known_hosts] file.", this.hostname);
                    },

                    keyIsNew: function keyIsNew() {
                        return this.type === "unrecognized-new";
                    },

                    keyIsChanged: function keyIsChanged() {
                        return this.type === "unrecognized-changed";
                    },

                });

                /**
                 * These are some small caching optimizations for the knownHostsService.verify
                 * method so that we don't make repeated requests for identical hostname/port
                 * combinations unless we know something has changed.
                 */

                function _memoizedVerifyResolver(hostname, port) {
                    port = port ? ":" + port : "";
                    return hostname + port;
                }

                function _initMemoizedVerify() {
                    var memoizedVerify = _.memoize(knownHostsService.verify, _memoizedVerifyResolver);
                    var memoizedVerifyCache = memoizedVerify.cache;

                    var boundMemoizedVerify = memoizedVerify.bind(knownHostsService);
                    boundMemoizedVerify.cache = memoizedVerifyCache;

                    return boundMemoizedVerify;
                }

                return service;
            }
        ]);
});
