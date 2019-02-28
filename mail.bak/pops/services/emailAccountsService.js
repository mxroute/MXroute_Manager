/*
# base/frontend/paper_lantern/mail/pops/services/emailAccountService.js    Copyright 2017 cPanel, Inc.
#                                                                                 All rights Reserved.
# copyright@cpanel.net                                                               http://cpanel.net
# This code is subject to the cPanel license.                       Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [

        // Libraries
        "angular",
        "cjt/io/uapi",
        "cjt/io/uapi-request",
        "cjt/util/locale"
    ],
    function(angular, API, APIREQUEST, LOCALE) { // eslint-disable-line no-unused-vars
        var HTML_INFINITY = "&infin;";

        var app;
        try {
            app = angular.module("cpanel.mail.Pops"); // For runtime
        } catch (e) {
            app = angular.module("cpanel.mail.Pops", []); // Fall-back for unit testing
        }

        app.factory("emailAccountsService", ["$q", "APIService",
            function($q, APIService) {

                // Set the default success transform on the prototype
                var servicePrototype = new APIService({
                    transformAPISuccess: function(response) {
                        return response.data;
                    }
                });

                var EmailAccountsService = function() {};
                EmailAccountsService.prototype = servicePrototype;

                angular.extend(EmailAccountsService.prototype, {
                    _dataWrapper: function(apiCall) {
                        return this.deferred(apiCall).promise;
                    },

                    /**
                     * Adds an email account
                     * @method addEmailAccount
                     * @param {Object} emailAccount The email account to add
                     * @return {Promise} Returns a promise that resolves to a string with account+domain
                     */
                    addEmailAccount: function(emailAccount) {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("Email", "add_pop", emailAccount);
                        apiCall.addAnalytics();
                        return this._dataWrapper(apiCall);
                    },

                    /**
                     * Gets whether or not the shared address book is enabled
                     * @method isSharedAddressBookEnabled
                     * @return {Promise} Returns a promise that resolves to a boolean indicating whether or not the shared AB is enabled
                     */
                    isSharedAddressBookEnabled: function() {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("DAV", "has_shared_global_addressbook");
                        return this._dataWrapper(apiCall);
                    },

                    /**
                     * Enables the shared address book
                     * @method enableSharedAddressBook
                     * @return {Promise} Returns a promise that resolves to a boolean indicating whether or not the shared AB is enabled
                     */
                    enableSharedAddressBook: function() {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("DAV", "enable_shared_global_addressbook");
                        return this._dataWrapper(apiCall);
                    },

                    /**
                     * Disables the shared address book
                     * @method disableSharedAddressBook
                     * @return {Promise} Returns a promise that resolves to a boolean indicating whether or not the shared AB is enabled
                     */
                    disableSharedAddressBook: function() {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("DAV", "disable_shared_global_addressbook");
                        return this._dataWrapper(apiCall);
                    },

                    /**
                     * Changes the password for an email account
                     * @method changePassword
                     * @param  {String} email    A string indicating which email account to change the password for
                     * @param  {String} domain   A string indicating which domain to change the password for
                     * @param  {String} password A string indicating the new password
                     * @return {Promise}         Returns a promise that resolves with no data on success
                     */
                    changePassword: function(email, domain, password) {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("Email", "passwd_pop", {
                            email: email,
                            domain: domain,
                            password: password
                        });
                        return this._dataWrapper(apiCall);
                    },

                    /**
                     * Changes the quota for an email account
                     * @method changeQuota
                     * @param  {String}  email    A string indicating which email account to change the quota for
                     * @param  {String}  domain   A string indicating which domain to change the quota for
                     * @param  {Integer} quota    An integer specifying the new quota in MB
                     * @return {Promise}          Returns a promise that resolves with no data on success
                     */
                    changeQuota: function(email, domain, quota) {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("Email", "edit_pop_quota", {
                            email: email,
                            domain: domain,
                            quota: quota
                        });
                        return this._dataWrapper(apiCall);
                    },

                    /**
                     * Deletes an email account
                     * @method deleteEmailAccount
                     * @param  {String}  email    A string indicating which email account to delete
                     * @param  {String}  domain   A string indicating which domain to delete
                     * @return {Promise}          Returns a promise that resolves with no data on success
                     */
                    deleteEmailAccount: function(email, domain) {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("Email", "delete_pop", { email: email, domain: domain });
                        return this._dataWrapper(apiCall);
                    },

                    /**
                     * Gets the list of email accounts
                     * @method getEmailAccounts
                     * @param  {Object}  apiParams An object providing the UAPI filter, paginate, and sort properties
                     * @return {Promise}           Returns a promise that resolves to the list of email accounts
                     */
                    getEmailAccounts: function(apiParams) {

                        if ( this.currentGetRequest && this.currentGetRequest.jqXHR ) {
                            this.currentGetRequest.jqXHR.abort();
                        }

                        var apiCall = new APIREQUEST.Class();

                        // We always format the data on the frontend so avoid doing it on the backend for non-displayed data
                        if (!apiParams) {
                            apiParams = {};
                        }
                        apiParams.no_human_readable_keys = 1;
                        apiParams.get_restrictions = 1;
                        apiCall.initialize("Email", "list_pops_with_disk", apiParams);

                        var deferred = $q.defer();
                        var service = this;

                        // We want to be able to access the underlying jQuery XHR object here so that we can
                        // .abort() any in flight calls to list_pops_with_disk when a new one is submitted.
                        this.currentGetRequest = new APIService.AngularAPICall(apiCall, {
                            done: function(response) {

                                service.currentGetRequest = undefined;

                                if ( response.parsedResponse.error ) {
                                    deferred.reject(response.parsedResponse.error);
                                } else {

                                    var result = response.parsedResponse;

                                    var rdata = result.data;
                                    for (var rd = 0; rd < rdata.length; rd++) {
                                        var emailAccount = rdata[rd];

                                        emailAccount.diskused = parseInt(emailAccount.diskused, 10);
                                        emailAccount.humandiskused = LOCALE.format_bytes( emailAccount._diskused );

                                        if (emailAccount._diskquota === 0 || emailAccount.diskquota === 0 || emailAccount.diskquota === "unlimited") {
                                            emailAccount.diskquota = 0;
                                            emailAccount.humandiskquota = HTML_INFINITY;
                                            emailAccount.diskusedpercent = 0;
                                        } else {
                                            emailAccount.diskquota = parseInt(emailAccount._diskquota, 10) / 1024 / 1024;
                                            emailAccount.humandiskquota = LOCALE.format_bytes(emailAccount._diskquota);
                                            emailAccount.diskusedpercent = ((emailAccount._diskused / emailAccount._diskquota) * 100).toFixed(2);
                                        }

                                        emailAccount.humandiskusedpercent = LOCALE.numf(emailAccount.diskusedpercent) + "%";
                                        emailAccount.suspended_login = ("" + emailAccount.suspended_login) === "1";
                                        emailAccount.suspended_incoming = ("" + emailAccount.suspended_incoming) === "1";
                                        emailAccount.suspended_outgoing = ("" + emailAccount.suspended_outgoing) === "1";
                                        emailAccount.hold_outgoing = ("" + emailAccount.hold_outgoing) === "1";
                                        emailAccount.has_suspended = ("" + emailAccount.has_suspended) === "1";

                                    }

                                    deferred.resolve(result);
                                }

                            },
                            fail: function() {
                                service.currentGetRequest = undefined;
                            }
                        });

                        return deferred.promise;
                    },

                    /**
                     * Gets the usage for the default email account
                     * @method getDefaultAccountUsage
                     * @return {Promise} Returns a promise that resolves to a pretty formatted string indicating the default account's disk usage
                     */
                    getDefaultAccountUsage: function() {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("Email", "get_main_account_disk_usage");
                        return this._dataWrapper(apiCall);
                    },

                    _createAPICall: function(method, email, messages) {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("Email", method, { email: email });
                        return this._dataWrapper(apiCall).then(
                            function() {
                                return messages.success ? { method: method, type: "success", message: LOCALE.makevar(messages.success, email), autoClose: 10000 } : { method: method, type: "success" };
                            },
                            function(error) {
                                return messages.error ? { method: method, type: "danger", message: LOCALE.makevar(messages.error, email, error) } : { method: method, type: "danger" };
                            }
                        );
                    },

                    /**
                     * Gets the number of currently held messages in the mail queue for the specified email account
                     * @method getHeldMessageCount
                     * @param {Object} emailAccount The email account to get the held message count for
                     * @return {Promise} Returns a promise that resolves to an integer count of the number of held messages
                     */
                    getHeldMessageCount: function(email) {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("Email", "get_held_message_count", {
                            email: email
                        });
                        return this._dataWrapper(apiCall);
                    },

                    /**
                     * Deletes any held messages in the mail queue for the specified email account
                     * @method deleteHeldMessages
                     * @param {Object} emailAccount The email account to delete the held messages for
                     * @return {Promise} Returns a promise that resolves to an integer count of the number of deleted messages
                     */
                    deleteHeldMessages: function(email, releaseAfterDelete) {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("Email", "delete_held_messages", {
                            email: email,
                            release_after_delete: releaseAfterDelete
                        });
                        return this._dataWrapper(apiCall);
                    },

                    /**
                     * Adjusts the login/incoming/outgoing suspensions for the specified email account
                     * @method changeSuspensions
                     * @param {Object} emailAccount The email account to set suspensions on
                     * @param {Object} suspensions The suspensions to apply to the email account
                     *   @param {Boolean} login True if logins should be suspended, false otherwise
                     *   @param {Boolean} incoming True if incoming mail should be suspended, false otherwise
                     *   @param {String} outgoing “suspend” if outgoing mail should be suspended, “hold” if outgoing mail should be held, any other value otherwise
                     * @return {Promise} Returns a promise that will resolve to an array of objects suitable for passing to AlertService
                     */
                    changeSuspensions: function(emailAccount, suspensions) {

                        var calls = [];

                        if ( emailAccount.suspended_login && !suspensions.login ) {

                            // Unsuspend login
                            calls.push(this._createAPICall(
                                "unsuspend_login",
                                emailAccount.email,
                                {
                                    success: LOCALE.translatable("You have removed the suspension on “[_1]” from logging in."),
                                    error: LOCALE.translatable("Failed to remove the suspension on “[_1]” from logging in: [_2]")
                                }
                            ));
                        } else if ( !emailAccount.suspended_login && suspensions.login ) {

                            // Suspend login
                            calls.push(this._createAPICall(
                                "suspend_login",
                                emailAccount.email,
                                {
                                    success: LOCALE.translatable("You have suspended “[_1]” from logging in."),
                                    error: LOCALE.translatable("Failed to suspend “[_1]” from logging in: [_2]")
                                }
                            ));
                        }

                        if ( emailAccount.suspended_incoming && !suspensions.incoming ) {

                            // Unsuspend incoming
                            calls.push(this._createAPICall(
                                "unsuspend_incoming",
                                emailAccount.email,
                                {
                                    success: LOCALE.translatable("You have removed the suspension on “[_1]” from receiving mail."),
                                    error: LOCALE.translatable("Failed to remove the suspension on “[_1]” from receiving mail: [_2]")
                                }
                            ));
                        } else if ( !emailAccount.suspended_incoming && suspensions.incoming ) {

                            // Suspend incoming
                            calls.push(this._createAPICall(
                                "suspend_incoming",
                                emailAccount.email,
                                {
                                    success: LOCALE.translatable("You have suspended “[_1]” from receiving mail."),
                                    error: LOCALE.translatable("Failed to suspend “[_1]” from receiving mail: [_2]")
                                }
                            ));
                        }

                        if ( emailAccount.suspended_outgoing && suspensions.outgoing !== "suspend" ) {

                            // Unsuspend outgoing
                            calls.push(this._createAPICall(
                                "unsuspend_outgoing",
                                emailAccount.email,
                                {
                                    success: suspensions.outgoing === "hold" ? undefined : LOCALE.translatable("You have removed the suspension on “[_1]” from sending mail."),
                                    error: LOCALE.translatable("Failed to remove the suspension on “[_1]” from sending mail: [_2]")
                                }
                            ));
                        } else if ( !emailAccount.suspended_outgoing && suspensions.outgoing === "suspend" ) {

                            // Suspend outgoing
                            calls.push(this._createAPICall(
                                "suspend_outgoing",
                                emailAccount.email,
                                {
                                    success: LOCALE.translatable("You have suspended “[_1]” from sending mail."),
                                    error: LOCALE.translatable("Failed to suspend “[_1]” from sending mail: [_2]")
                                }
                            ));
                        }

                        if ( emailAccount.hold_outgoing && suspensions.outgoing !== "hold" ) {

                            // Release outgoing
                            calls.push(this._createAPICall(
                                "release_outgoing",
                                emailAccount.email,
                                {
                                    success: suspensions.outgoing === "suspend" ? undefined : LOCALE.translatable("You have released outgoing mail for “[_1]”."),
                                    error: LOCALE.translatable("Failed to release outgoing mail for “[_1]”: [_2]")
                                }
                            ));
                        } else if ( !emailAccount.hold_outgoing && suspensions.outgoing === "hold" ) {

                            // Hold outgoing
                            calls.push(this._createAPICall(
                                "hold_outgoing",
                                emailAccount.email,
                                {
                                    success: LOCALE.translatable("You have held “[_1]”’s outgoing mail in the mail queue."),
                                    error: LOCALE.translatable("Failed to hold “[_1]”’s outgoing mail in the mail queue: [_2]")
                                }
                            ));
                        }

                        if ( calls.length > 0 ) {
                            return $q.all(calls);
                        } else {
                            return $q(function(resolve) {
                                resolve([]);
                            });
                        }

                    },

                });

                return new EmailAccountsService();
            }
        ]);

    }
);
