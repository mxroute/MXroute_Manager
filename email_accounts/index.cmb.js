/*
# email_accounts/services/emailAccountsService.js                                     Copyright 2018 cPanel, Inc.
#                                                                                            All rights Reserved.
# copyright@cpanel.net                                                                          http://cpanel.net
# This code is subject to the cPanel license.                                  Unauthorized copying is prohibited
*/

/* global define: false, PAGE: false */

define(
    'app/services/emailAccountsService',[
        "angular",
        "lodash",
        "cjt/util/locale",
        "cjt/util/parse",
        "cjt/io/uapi-request",
        "cjt/io/batch-request",
        "cjt/io/api",
        "cjt/io/uapi",
        "cjt/services/APIService"
    ],
    function(angular, _, LOCALE, PARSE, APIREQUEST, BATCH) {
        "use strict";

        var HTML_INFINITY = "&infin;";
        var DEFAULT_ACCOUNT_LOGIN = "Main Account";

        var app = angular.module("cpanel.emailAccounts.service", ["cjt2.services.api"]);
        app.value("PAGE", PAGE);

        /**
         * Service wrapper for email accounts
         *
         * @module domains
         *
         * @param  {Object} $q angular $q object
         * @param  {Object} APIService cjt2 api service
         * @param  {Object} $timeout
         * @param  {Object} PAGE window.PAGE object
         */
        app.factory("emailAccountsService", [
            "$q",
            "APIService",
            "$timeout",
            "PAGE",
            function($q, APIService, $timeout, PAGE) {

                // Set the default success transform on the prototype
                var servicePrototype = new APIService({
                    transformAPISuccess: function(response) {
                        return response.data;
                    }
                });

                var EmailAccountsService = function() {};
                EmailAccountsService.prototype = servicePrototype;

                var emailStats;

                /**
                 * Helps with the classes on the quota progress bar
                 *
                 * @method quotaProgressType
                 * @param {number} displayPercentage
                 * @returns {string} class for the quota progress bar
                 */
                function quotaProgressType(displayPercentage) {
                    if (displayPercentage >= 80) {
                        return "danger";
                    } else if (displayPercentage >= 60) {
                        return "warning";
                    } else if (displayPercentage < 60) {
                        return "success";
                    } else {
                        return "success";
                    }
                }

                /**
                 * Restructures Email account
                 *
                 * @method decorateEmailObj
                 * @param {Object} obj Email account object returned from API
                 * @returns {Object} returns modified email account
                 */
                function decorateEmailObj(obj) {
                    obj.diskused = parseInt(obj.diskused, 10);
                    obj.humandiskused = LOCALE.format_bytes( obj._diskused );
                    obj.id = obj.email;

                    if (obj._diskquota === 0 || obj.diskquota === 0 || obj.diskquota === "unlimited") {
                        obj.diskquota = 0;
                        obj.humandiskquota = HTML_INFINITY;
                        obj.diskusedpercent = 0;
                        obj.quotaType = "unlimited";
                        obj.quota = "";
                        obj.displayProgressbar = false;
                    } else {
                        obj.diskquota = parseInt(obj._diskquota, 10) / 1024 / 1024;
                        obj.humandiskquota = LOCALE.format_bytes(obj._diskquota);
                        obj.diskusedpercent = ((obj._diskused / obj._diskquota) * 100).toFixed(2);
                        obj.quotaProgressType = quotaProgressType(obj.diskusedpercent);
                        obj.quotaType = "userdefined";
                        obj.quota = obj.diskquota;
                        obj.quotaUnit = "MB";
                        obj.displayProgressbar = true;
                    }

                    obj.humandiskusedpercent = LOCALE.numf(obj.diskusedpercent) + "%";
                    obj.suspended_login = PARSE.parsePerlBoolean(obj.suspended_login);
                    obj.suspended_incoming = PARSE.parsePerlBoolean(obj.suspended_incoming);
                    obj.suspended_outgoing = PARSE.parsePerlBoolean(obj.suspended_outgoing);
                    obj.hold_outgoing = PARSE.parsePerlBoolean(obj.hold_outgoing);
                    obj.has_suspended = PARSE.parsePerlBoolean(obj.has_suspended);

                    obj.isDefault = obj.login === DEFAULT_ACCOUNT_LOGIN;
                    obj.webmailLink = "../mail/webmailform.html?user=" +
                        window.encodeURIComponent(obj.email) + "&amp;domain=" + window.encodeURIComponent(obj.domain);

                    return obj;
                }

                angular.extend(EmailAccountsService.prototype, {

                    /**
                     * Gets local storage values
                     * @method getStoredValue
                     * @param  {string}  key
                     * @return {string} returns the stored value
                     */
                    getStoredValue: function(key) {
                        var storageValue = localStorage.getItem(key);
                        if ( storageValue && (0 === storageValue.indexOf(PAGE.securityToken + ":")) ) {
                            storageValue = storageValue.substr( 1 + PAGE.securityToken.length );
                        } else {
                            storageValue = "";
                        }
                        return storageValue;
                    },

                    /**
                     * dataWrapper
                     * @method _dataWrapper
                     * @return {Promise} Returns a promise
                     */
                    _dataWrapper: function(apiCall) {
                        return this.deferred(apiCall).promise;
                    },

                    /**
                     * Gets upgrade url
                     * @method getUpgradeUrl
                     * @return {string} Returns upgarde url
                     */
                    getUpgradeUrl: function() {
                        return PAGE.upgradeUrl;
                    },

                    /**
                     * Gets email resource usage
                     * @method getEmailStats
                     * @return {Promise} Returns a promise
                     */
                    getEmailStats: function() {
                        if (emailStats) {
                            return $q.resolve(emailStats);
                        }

                        var apiCall = new APIREQUEST.Class();

                        apiCall.initialize("ResourceUsage", "get_usages");
                        apiCall.addFilter("id", "contains", "email_accounts");

                        return this.deferred(apiCall).promise
                            .then(function(response) {
                                emailStats = {};
                                var stats;
                                if (response && response.length) {
                                    stats = response[0];
                                    emailStats.maximum = parseInt(stats.maximum, 10);
                                    emailStats.used = parseInt(stats.usage, 10);
                                    if (!isNaN(emailStats.maximum) && emailStats.maximum) {
                                        emailStats.available = emailStats.maximum - emailStats.used;
                                    } else {
                                        emailStats.available = -1;
                                    }

                                } else {
                                    return $q.reject();
                                }
                                return emailStats;
                            });

                    },

                    /**
                     * Gets domains
                     * @method getMailDomains
                     * @return {Promise} Returns a promise
                     */
                    getMailDomains: function() {
                        var apiCall = new APIREQUEST.Class();

                        apiCall.initialize("Email", "list_mail_domains");

                        return this.deferred(apiCall).promise
                            .then(function(response) {
                                var domains = _.map(response, _.property("domain"));
                                return domains;
                            });
                    },

                    /**
                     * Creates email account
                     * @method createEmail
                     * @param {Object} accountDetails Email account details
                     * @return {Promise} Returns a promise
                     */
                    createEmail: function(accountDetails) {
                        var apiCall = new APIREQUEST.Class();
                        if (!accountDetails.setPassword) {

                            var arg = {
                                "username": accountDetails.userName,
                                "domain": accountDetails.domain,
                                "alternate_email": accountDetails.recoveryEmail,
                                "send_invite": 1,
                                "services.email.enabled": 1,
                                "services.email.quota": accountDetails.quota
                            };

                            // need to email reset link
                            apiCall.initialize("UserManager", "create_user", arg);

                        } else {
                            var emailAccount = {
                                email: accountDetails.userName,
                                domain: accountDetails.domain,
                                password: accountDetails.password,
                                quota: accountDetails.quota,
                                send_welcome_email: accountDetails.sendWelcomeEmail ? 1 : 0
                            };
                            apiCall.initialize("Email", "add_pop", emailAccount);
                        }

                        return this.deferred(apiCall).promise
                            .then(function(response) {
                                emailStats.used = emailStats.used + 1;

                                if (emailStats.available !== -1) {
                                    emailStats.available = emailStats.available - 1;
                                }

                                return response;
                            });

                    },

                    /**
                     * Gets default account usage
                     * @method getDefaultAccountUsage
                     * @return {Promise} Returns a promise
                     */
                    getDefaultAccountUsage: function() {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("Email", "get_main_account_disk_usage");
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
                     * Gets whether or not UTF-8 Mailboxes names are enabled.
                     * @method isUTF8MailboxNamesEnabled
                     * @return {Promise} Returns a promise that resolves to a boolean indicating whether or not the call was successful.
                     */
                    isUTF8MailboxNamesEnabled: function() {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("Mailboxes", "has_utf8_mailbox_names");
                        return this._dataWrapper(apiCall);
                    },

                    /**
                     * Enables UTF-8 mailbox support
                     * @method enableUTF8MailboxNames
                     * @return {Promise} Returns a promise that resolves to a boolean indicating whether or not the call was successful.
                     */
                    enableUTF8MailboxNames: function() {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("Mailboxes", "set_utf8_mailbox_names");
                        apiCall.addArgument("enabled", 1);
                        return this._dataWrapper(apiCall);
                    },

                    /**
                     * Disables UTF-8 mailbox support
                     * @method disableUTF8MailboxNames
                     * @return {Promise} Returns a promise that resolves to a boolean indicating whether or not the call was successful.
                     */
                    disableUTF8MailboxNames: function() {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("Mailboxes", "set_utf8_mailbox_names");
                        apiCall.addArgument("enabled", 0);
                        return this._dataWrapper(apiCall);
                    },

                    /**
                     * Gets email account details
                     * @method getEmailAccountDetails
                     * @param {string} email email account
                     * @return {Promise} Returns a promise
                     */
                    getEmailAccountDetails: function(email) {
                        if (email) {
                            var apiCall = new APIREQUEST.Class();
                            apiCall.initialize("Email", "list_pops_with_disk");

                            apiCall.addFilter("email", "eq", email);
                            apiCall.addArgument("no_human_readable_keys", 1);
                            apiCall.addArgument("get_restrictions", 1);

                            return this._dataWrapper(apiCall)
                                .then(function(response) {
                                    if (_.isArray(response) && response.length === 0) {
                                        return $q.reject(LOCALE.maketext("You do not have an email account named “[_1]”.", _.escape(email)));
                                    }
                                    return decorateEmailObj(response[0]);
                                }, function(error) {
                                    return error;
                                });
                        }
                    },

                    /**
                     * Delete email account
                     * @method deleteEmail
                     * @param {string} email email account
                     * @return {Promise} Returns a promise
                     */
                    deleteEmail: function(email) {
                        if (email) {
                            var apiCall = new APIREQUEST.Class();
                            apiCall.initialize("Email", "delete_pop", { email: email });
                            return this.deferred(apiCall).promise
                                .then(function(response) {
                                    emailStats.used = emailStats.used - 1;

                                    if (emailStats.available !== -1) {
                                        emailStats.available = emailStats.available + 1;
                                    }

                                    return response;
                                });
                        }
                    },

                    /**
                     * Delete multiple emails
                     * @method deleteEmails
                     * @param {string[]} emails email accounts
                     * @return {Promise} Returns a promise
                     */
                    deleteEmails: function(emails) {
                        if (emails && emails.length > 0) {
                            var batchCalls = [];
                            for (var i = 0, len = emails.length; i < len; i++) {
                                var apiCall = new APIREQUEST.Class();
                                apiCall.initialize("Email", "delete_pop", { email: emails[i].email });
                                batchCalls.push(apiCall);
                            }

                            var batch = new BATCH.Class(batchCalls);

                            return this.deferred(batch).promise
                                .then(function(response) {
                                    emailStats.used = emailStats.used - emails.length;

                                    if (emailStats.available !== -1) {
                                        emailStats.available = emailStats.available + emails.length;
                                    }

                                    return response;
                                });
                        }
                    },

                    _createAPICall: function(method, attributes, messages) {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("Email", method, attributes);
                        return this._dataWrapper(apiCall).then(
                            function() {
                                return messages.success ? { method: method, type: "success", message: LOCALE.makevar(messages.success, attributes.fullEmail), autoClose: 10000 } : { method: method, type: "success" };
                            },
                            function(error) {
                                return messages.error ? { method: method, type: "danger", message: LOCALE.makevar(messages.error, attributes.fullEmail, error) } : { method: method, type: "danger" };
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
                            release_after_delete: (releaseAfterDelete) ? 1 : 0
                        });
                        return this._dataWrapper(apiCall);
                    },

                    _handleSuspensions: function(newSettings, currentSuspendedState, suspendOptions) {
                        var calls = [];
                        if (suspendOptions.incoming !== currentSuspendedState.incoming) {
                            if (!suspendOptions.incoming) {
                                calls.push(this._createAPICall(
                                    "unsuspend_incoming",
                                    {
                                        email: newSettings.email,
                                        fullEmail: newSettings.email
                                    },
                                    {
                                        success: LOCALE.translatable("You unsuspended incoming mail for “[_1]”."),
                                        error: LOCALE.translatable("We can’t unsuspend incoming mail for “[_1]”:“[_2]”")
                                    }
                                ));
                            } else {
                                calls.push(this._createAPICall(
                                    "suspend_incoming",
                                    {
                                        email: newSettings.email,
                                        fullEmail: newSettings.email
                                    },
                                    {
                                        success: LOCALE.translatable("You suspended incoming mail for “[_1]”."),
                                        error: LOCALE.translatable("We can’t suspend incoming mail for “[_1]”:“[_2]”")
                                    }
                                ));
                            }
                        }

                        if (suspendOptions.login !== currentSuspendedState.login) {
                            if (!suspendOptions.login) {
                                calls.push(this._createAPICall(
                                    "unsuspend_login",
                                    {
                                        email: newSettings.email,
                                        fullEmail: newSettings.email
                                    },
                                    {
                                        success: LOCALE.translatable("You unsuspended logins for “[_1]”."),
                                        error: LOCALE.translatable("We can’t unsuspend logins for “[_1]”:“[_2]”")
                                    }
                                ));
                            } else {
                                calls.push(this._createAPICall(
                                    "suspend_login",
                                    {
                                        email: newSettings.email,
                                        fullEmail: newSettings.email
                                    },
                                    {
                                        success: LOCALE.translatable("You suspended logins for “[_1]”."),
                                        error: LOCALE.translatable("We can’t suspend logins for “[_1]”:“[_2]”")
                                    }
                                ));
                            }
                        }

                        if (suspendOptions.outgoing !== currentSuspendedState.outgoing) {
                            if (suspendOptions.outgoing === "hold") {
                                calls.push(this._createAPICall(
                                    "hold_outgoing",
                                    {
                                        email: newSettings.email,
                                        fullEmail: newSettings.email
                                    },
                                    {
                                        success: LOCALE.translatable("We’re holding outgoing mail for “[_1]”."),
                                        error: LOCALE.translatable("We can’t hold mail for “[_1]”:“[_2]”")
                                    }
                                ));
                            } else if (suspendOptions.outgoing === "suspend") {
                                calls.push(this._createAPICall(
                                    "suspend_outgoing",
                                    {
                                        email: newSettings.email,
                                        fullEmail: newSettings.email
                                    },
                                    {
                                        success: LOCALE.translatable("You suspended outgoing mail for “[_1]”."),
                                        error: LOCALE.translatable("We can’t suspend outgoing mail for “[_1]”:“[_2]”")
                                    }
                                ));
                            }

                            if (currentSuspendedState.outgoing === "suspend") {
                                calls.push(this._createAPICall(
                                    "unsuspend_outgoing",
                                    {
                                        email: newSettings.email,
                                        fullEmail: newSettings.email
                                    },
                                    {
                                        success: LOCALE.translatable("You unsuspended outgoing mail for “[_1]”."),
                                        error: LOCALE.translatable("We can’t unsuspend outgoing mail for “[_1]”:“[_2]”")
                                    }
                                ));
                            }

                            if (currentSuspendedState.outgoing === "hold") {
                                calls.push(this._createAPICall(
                                    "release_outgoing",
                                    {
                                        email: newSettings.email,
                                        fullEmail: newSettings.email
                                    },
                                    {
                                        success: LOCALE.translatable("You unsuspended outgoing mail for “[_1]”."),
                                        error: LOCALE.translatable("We can’t unsuspend outgoing mail for “[_1]”:“[_2]”")
                                    }
                                ));
                            }
                        }

                        return calls;
                    },

                    /**
                     * Updates email account details
                     * @method updateEmail
                     * @param {Object} oldSettings old email account values
                     * @param {Object} newSettings new email account values
                     * @param {Object} currentSuspendedState current suspended state
                     * @param {Object} suspendOptions suspend options
                     * @return {Promise} Returns a promise
                     */
                    updateEmail: function(oldSettings, newSettings, currentSuspendedState, suspendOptions) {
                        var calls = [];

                        if (oldSettings && newSettings) {
                            if (typeof newSettings.password !== "undefined" && newSettings.password) {
                                calls.push(this._createAPICall(
                                    "passwd_pop",
                                    {
                                        email: newSettings.email,
                                        password: newSettings.password,
                                        domain: newSettings.domain,
                                        fullEmail: newSettings.email
                                    },
                                    {
                                        success: LOCALE.translatable("You updated the password for “[_1]”."),
                                        error: LOCALE.translatable("We can’t update the password for “[_1]”:“[_2]”")
                                    }
                                ));
                            }

                            if (Number(oldSettings.diskquota).toFixed(2) !== newSettings.quota.toFixed(2)) {
                                calls.push(this._createAPICall(
                                    "edit_pop_quota",
                                    {
                                        email: newSettings.user,
                                        domain: newSettings.domain,
                                        quota: newSettings.quota,
                                        fullEmail: newSettings.email
                                    },
                                    {
                                        success: LOCALE.translatable("You updated the storage space for “[_1]”."),
                                        error: LOCALE.translatable("We can’t update the storage space for “[_1]”:“[_2]”")
                                    }
                                ));
                            }

                            if (suspendOptions && currentSuspendedState) {

                                // Handle deletion of queued email before processing the account suspensions
                                if (suspendOptions.deleteHeldMessages) {
                                    var releaseAfterDelete = currentSuspendedState.outgoing === "hold" && suspendOptions.outgoing === "allow";
                                    var self = this;
                                    return this.deleteHeldMessages(newSettings.email, releaseAfterDelete).then(
                                        function(deletedCount) {
                                            if (releaseAfterDelete) {
                                                suspendOptions.outgoing = "hold";
                                            }
                                            var additionalCalls = self._handleSuspensions(newSettings, currentSuspendedState, suspendOptions);
                                            var allCalls = calls.concat(additionalCalls);
                                            if ( allCalls.length > 0 ) {
                                                return $q.all(allCalls);
                                            } else {
                                                return $timeout( function() {
                                                    return $q.resolve(
                                                        [{
                                                            type: "success",
                                                            method: "delete_held_messages",
                                                            message: LOCALE.maketext("[quant,_1,message has,messages have] been queued for deletion from the outgoing mail queue.", deletedCount)
                                                        }]
                                                    );
                                                }, 0);
                                            }

                                        },
                                        function(error) {
                                            return $timeout( function() {
                                                return $q.resolve(
                                                    [{ type: "danger", message: error }]
                                                );
                                            }, 0);
                                        }
                                    );

                                } else {
                                    var additionalCalls = this._handleSuspensions(newSettings, currentSuspendedState, suspendOptions);
                                    calls = calls.concat(additionalCalls);
                                }
                            }

                            if ( calls.length > 0 ) {
                                return $q.all(calls);
                            } else {
                                return $timeout( function() {
                                    return $q.resolve(
                                        [{ type: "success", message: LOCALE.maketext("Email account “[_1]” is up to date.", newSettings.email), autoClose: 10000 }]
                                    );
                                }, 0);
                            }

                        }
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
                        apiParams.include_main = 1;
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
                                    var rdatalen = rdata.length;
                                    for (var rd = 0; rd < rdatalen; rd++) {
                                        decorateEmailObj(rdata[rd]);
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

                });

                return new EmailAccountsService();
            }
        ]);
    }
);

(function(root) {
define("jquery-chosen", ["jquery"], function() {
  return (function() {
/*!
Chosen, a Select Box Enhancer for jQuery and Prototype
by Patrick Filler for Harvest, http://getharvest.com

Version 1.5.1
Full source at https://github.com/harvesthq/chosen
Copyright (c) 2011-2016 Harvest http://getharvest.com

MIT License, https://github.com/harvesthq/chosen/blob/master/LICENSE.md
This file is generated by `grunt build`, do not edit it by hand.
*/

(function() {
  var $, AbstractChosen, Chosen, SelectParser, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  SelectParser = (function() {
    function SelectParser() {
      this.options_index = 0;
      this.parsed = [];
    }

    SelectParser.prototype.add_node = function(child) {
      if (child.nodeName.toUpperCase() === "OPTGROUP") {
        return this.add_group(child);
      } else {
        return this.add_option(child);
      }
    };

    SelectParser.prototype.add_group = function(group) {
      var group_position, option, _i, _len, _ref, _results;
      group_position = this.parsed.length;
      this.parsed.push({
        array_index: group_position,
        group: true,
        label: this.escapeExpression(group.label),
        title: group.title ? group.title : void 0,
        children: 0,
        disabled: group.disabled,
        classes: group.className
      });
      _ref = group.childNodes;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        option = _ref[_i];
        _results.push(this.add_option(option, group_position, group.disabled));
      }
      return _results;
    };

    SelectParser.prototype.add_option = function(option, group_position, group_disabled) {
      if (option.nodeName.toUpperCase() === "OPTION") {
        if (option.text !== "") {
          if (group_position != null) {
            this.parsed[group_position].children += 1;
          }
          this.parsed.push({
            array_index: this.parsed.length,
            options_index: this.options_index,
            value: option.value,
            text: option.text,
            html: option.innerHTML,
            title: option.title ? option.title : void 0,
            selected: option.selected,
            disabled: group_disabled === true ? group_disabled : option.disabled,
            group_array_index: group_position,
            group_label: group_position != null ? this.parsed[group_position].label : null,
            classes: option.className,
            style: option.style.cssText
          });
        } else {
          this.parsed.push({
            array_index: this.parsed.length,
            options_index: this.options_index,
            empty: true
          });
        }
        return this.options_index += 1;
      }
    };

    SelectParser.prototype.escapeExpression = function(text) {
      var map, unsafe_chars;
      if ((text == null) || text === false) {
        return "";
      }
      if (!/[\&\<\>\"\'\`]/.test(text)) {
        return text;
      }
      map = {
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "`": "&#x60;"
      };
      unsafe_chars = /&(?!\w+;)|[\<\>\"\'\`]/g;
      return text.replace(unsafe_chars, function(chr) {
        return map[chr] || "&amp;";
      });
    };

    return SelectParser;

  })();

  SelectParser.select_to_array = function(select) {
    var child, parser, _i, _len, _ref;
    parser = new SelectParser();
    _ref = select.childNodes;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      child = _ref[_i];
      parser.add_node(child);
    }
    return parser.parsed;
  };

  AbstractChosen = (function() {
    function AbstractChosen(form_field, options) {
      this.form_field = form_field;
      this.options = options != null ? options : {};
      if (!AbstractChosen.browser_is_supported()) {
        return;
      }
      this.is_multiple = this.form_field.multiple;
      this.set_default_text();
      this.set_default_values();
      this.setup();
      this.set_up_html();
      this.register_observers();
      this.on_ready();
    }

    AbstractChosen.prototype.set_default_values = function() {
      var _this = this;
      this.click_test_action = function(evt) {
        return _this.test_active_click(evt);
      };
      this.activate_action = function(evt) {
        return _this.activate_field(evt);
      };
      this.active_field = false;
      this.mouse_on_container = false;
      this.results_showing = false;
      this.result_highlighted = null;
      this.allow_single_deselect = (this.options.allow_single_deselect != null) && (this.form_field.options[0] != null) && this.form_field.options[0].text === "" ? this.options.allow_single_deselect : false;
      this.disable_search_threshold = this.options.disable_search_threshold || 0;
      this.disable_search = this.options.disable_search || false;
      this.enable_split_word_search = this.options.enable_split_word_search != null ? this.options.enable_split_word_search : true;
      this.group_search = this.options.group_search != null ? this.options.group_search : true;
      this.search_contains = this.options.search_contains || false;
      this.single_backstroke_delete = this.options.single_backstroke_delete != null ? this.options.single_backstroke_delete : true;
      this.max_selected_options = this.options.max_selected_options || Infinity;
      this.inherit_select_classes = this.options.inherit_select_classes || false;
      this.display_selected_options = this.options.display_selected_options != null ? this.options.display_selected_options : true;
      this.display_disabled_options = this.options.display_disabled_options != null ? this.options.display_disabled_options : true;
      this.include_group_label_in_selected = this.options.include_group_label_in_selected || false;
      return this.max_shown_results = this.options.max_shown_results || Number.POSITIVE_INFINITY;
    };

    AbstractChosen.prototype.set_default_text = function() {
      if (this.form_field.getAttribute("data-placeholder")) {
        this.default_text = this.form_field.getAttribute("data-placeholder");
      } else if (this.is_multiple) {
        this.default_text = this.options.placeholder_text_multiple || this.options.placeholder_text || AbstractChosen.default_multiple_text;
      } else {
        this.default_text = this.options.placeholder_text_single || this.options.placeholder_text || AbstractChosen.default_single_text;
      }
      return this.results_none_found = this.form_field.getAttribute("data-no_results_text") || this.options.no_results_text || AbstractChosen.default_no_result_text;
    };

    AbstractChosen.prototype.choice_label = function(item) {
      if (this.include_group_label_in_selected && (item.group_label != null)) {
        return "<b class='group-name'>" + item.group_label + "</b>" + item.html;
      } else {
        return item.html;
      }
    };

    AbstractChosen.prototype.mouse_enter = function() {
      return this.mouse_on_container = true;
    };

    AbstractChosen.prototype.mouse_leave = function() {
      return this.mouse_on_container = false;
    };

    AbstractChosen.prototype.input_focus = function(evt) {
      var _this = this;
      if (this.is_multiple) {
        if (!this.active_field) {
          return setTimeout((function() {
            return _this.container_mousedown();
          }), 50);
        }
      } else {
        if (!this.active_field) {
          return this.activate_field();
        }
      }
    };

    AbstractChosen.prototype.input_blur = function(evt) {
      var _this = this;
      if (!this.mouse_on_container) {
        this.active_field = false;
        return setTimeout((function() {
          return _this.blur_test();
        }), 100);
      }
    };

    AbstractChosen.prototype.results_option_build = function(options) {
      var content, data, data_content, shown_results, _i, _len, _ref;
      content = '';
      shown_results = 0;
      _ref = this.results_data;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        data = _ref[_i];
        data_content = '';
        if (data.group) {
          data_content = this.result_add_group(data);
        } else {
          data_content = this.result_add_option(data);
        }
        if (data_content !== '') {
          shown_results++;
          content += data_content;
        }
        if (options != null ? options.first : void 0) {
          if (data.selected && this.is_multiple) {
            this.choice_build(data);
          } else if (data.selected && !this.is_multiple) {
            this.single_set_selected_text(this.choice_label(data));
          }
        }
        if (shown_results >= this.max_shown_results) {
          break;
        }
      }
      return content;
    };

    AbstractChosen.prototype.result_add_option = function(option) {
      var classes, option_el;
      if (!option.search_match) {
        return '';
      }
      if (!this.include_option_in_results(option)) {
        return '';
      }
      classes = [];
      if (!option.disabled && !(option.selected && this.is_multiple)) {
        classes.push("active-result");
      }
      if (option.disabled && !(option.selected && this.is_multiple)) {
        classes.push("disabled-result");
      }
      if (option.selected) {
        classes.push("result-selected");
      }
      if (option.group_array_index != null) {
        classes.push("group-option");
      }
      if (option.classes !== "") {
        classes.push(option.classes);
      }
      option_el = document.createElement("li");
      option_el.className = classes.join(" ");
      option_el.style.cssText = option.style;
      option_el.setAttribute("data-option-array-index", option.array_index);
      option_el.innerHTML = option.search_text;
      if (option.title) {
        option_el.title = option.title;
      }
      return this.outerHTML(option_el);
    };

    AbstractChosen.prototype.result_add_group = function(group) {
      var classes, group_el;
      if (!(group.search_match || group.group_match)) {
        return '';
      }
      if (!(group.active_options > 0)) {
        return '';
      }
      classes = [];
      classes.push("group-result");
      if (group.classes) {
        classes.push(group.classes);
      }
      group_el = document.createElement("li");
      group_el.className = classes.join(" ");
      group_el.innerHTML = group.search_text;
      if (group.title) {
        group_el.title = group.title;
      }
      return this.outerHTML(group_el);
    };

    AbstractChosen.prototype.results_update_field = function() {
      this.set_default_text();
      if (!this.is_multiple) {
        this.results_reset_cleanup();
      }
      this.result_clear_highlight();
      this.results_build();
      if (this.results_showing) {
        return this.winnow_results();
      }
    };

    AbstractChosen.prototype.reset_single_select_options = function() {
      var result, _i, _len, _ref, _results;
      _ref = this.results_data;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        result = _ref[_i];
        if (result.selected) {
          _results.push(result.selected = false);
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    AbstractChosen.prototype.results_toggle = function() {
      if (this.results_showing) {
        return this.results_hide();
      } else {
        return this.results_show();
      }
    };

    AbstractChosen.prototype.results_search = function(evt) {
      if (this.results_showing) {
        return this.winnow_results();
      } else {
        return this.results_show();
      }
    };

    AbstractChosen.prototype.winnow_results = function() {
      var escapedSearchText, option, regex, results, results_group, searchText, startpos, text, zregex, _i, _len, _ref;
      this.no_results_clear();
      results = 0;
      searchText = this.get_search_text();
      escapedSearchText = searchText.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      zregex = new RegExp(escapedSearchText, 'i');
      regex = this.get_search_regex(escapedSearchText);
      _ref = this.results_data;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        option = _ref[_i];
        option.search_match = false;
        results_group = null;
        if (this.include_option_in_results(option)) {
          if (option.group) {
            option.group_match = false;
            option.active_options = 0;
          }
          if ((option.group_array_index != null) && this.results_data[option.group_array_index]) {
            results_group = this.results_data[option.group_array_index];
            if (results_group.active_options === 0 && results_group.search_match) {
              results += 1;
            }
            results_group.active_options += 1;
          }
          option.search_text = option.group ? option.label : option.html;
          if (!(option.group && !this.group_search)) {
            option.search_match = this.search_string_match(option.search_text, regex);
            if (option.search_match && !option.group) {
              results += 1;
            }
            if (option.search_match) {
              if (searchText.length) {
                startpos = option.search_text.search(zregex);
                text = option.search_text.substr(0, startpos + searchText.length) + '</em>' + option.search_text.substr(startpos + searchText.length);
                option.search_text = text.substr(0, startpos) + '<em>' + text.substr(startpos);
              }
              if (results_group != null) {
                results_group.group_match = true;
              }
            } else if ((option.group_array_index != null) && this.results_data[option.group_array_index].search_match) {
              option.search_match = true;
            }
          }
        }
      }
      this.result_clear_highlight();
      if (results < 1 && searchText.length) {
        this.update_results_content("");
        return this.no_results(searchText);
      } else {
        this.update_results_content(this.results_option_build());
        return this.winnow_results_set_highlight();
      }
    };

    AbstractChosen.prototype.get_search_regex = function(escaped_search_string) {
      var regex_anchor;
      regex_anchor = this.search_contains ? "" : "^";
      return new RegExp(regex_anchor + escaped_search_string, 'i');
    };

    AbstractChosen.prototype.search_string_match = function(search_string, regex) {
      var part, parts, _i, _len;
      if (regex.test(search_string)) {
        return true;
      } else if (this.enable_split_word_search && (search_string.indexOf(" ") >= 0 || search_string.indexOf("[") === 0)) {
        parts = search_string.replace(/\[|\]/g, "").split(" ");
        if (parts.length) {
          for (_i = 0, _len = parts.length; _i < _len; _i++) {
            part = parts[_i];
            if (regex.test(part)) {
              return true;
            }
          }
        }
      }
    };

    AbstractChosen.prototype.choices_count = function() {
      var option, _i, _len, _ref;
      if (this.selected_option_count != null) {
        return this.selected_option_count;
      }
      this.selected_option_count = 0;
      _ref = this.form_field.options;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        option = _ref[_i];
        if (option.selected) {
          this.selected_option_count += 1;
        }
      }
      return this.selected_option_count;
    };

    AbstractChosen.prototype.choices_click = function(evt) {
      evt.preventDefault();
      if (!(this.results_showing || this.is_disabled)) {
        return this.results_show();
      }
    };

    AbstractChosen.prototype.keyup_checker = function(evt) {
      var stroke, _ref;
      stroke = (_ref = evt.which) != null ? _ref : evt.keyCode;
      this.search_field_scale();
      switch (stroke) {
        case 8:
          if (this.is_multiple && this.backstroke_length < 1 && this.choices_count() > 0) {
            return this.keydown_backstroke();
          } else if (!this.pending_backstroke) {
            this.result_clear_highlight();
            return this.results_search();
          }
          break;
        case 13:
          evt.preventDefault();
          if (this.results_showing) {
            return this.result_select(evt);
          }
          break;
        case 27:
          if (this.results_showing) {
            this.results_hide();
          }
          return true;
        case 9:
        case 38:
        case 40:
        case 16:
        case 91:
        case 17:
        case 18:
          break;
        default:
          return this.results_search();
      }
    };

    AbstractChosen.prototype.clipboard_event_checker = function(evt) {
      var _this = this;
      return setTimeout((function() {
        return _this.results_search();
      }), 50);
    };

    AbstractChosen.prototype.container_width = function() {
      if (this.options.width != null) {
        return this.options.width;
      } else {
        return "" + this.form_field.offsetWidth + "px";
      }
    };

    AbstractChosen.prototype.include_option_in_results = function(option) {
      if (this.is_multiple && (!this.display_selected_options && option.selected)) {
        return false;
      }
      if (!this.display_disabled_options && option.disabled) {
        return false;
      }
      if (option.empty) {
        return false;
      }
      return true;
    };

    AbstractChosen.prototype.search_results_touchstart = function(evt) {
      this.touch_started = true;
      return this.search_results_mouseover(evt);
    };

    AbstractChosen.prototype.search_results_touchmove = function(evt) {
      this.touch_started = false;
      return this.search_results_mouseout(evt);
    };

    AbstractChosen.prototype.search_results_touchend = function(evt) {
      if (this.touch_started) {
        return this.search_results_mouseup(evt);
      }
    };

    AbstractChosen.prototype.outerHTML = function(element) {
      var tmp;
      if (element.outerHTML) {
        return element.outerHTML;
      }
      tmp = document.createElement("div");
      tmp.appendChild(element);
      return tmp.innerHTML;
    };

    AbstractChosen.browser_is_supported = function() {
      if (/iP(od|hone)/i.test(window.navigator.userAgent)) {
        return false;
      }
      if (/Android/i.test(window.navigator.userAgent)) {
        if (/Mobile/i.test(window.navigator.userAgent)) {
          return false;
        }
      }
      if (/IEMobile/i.test(window.navigator.userAgent)) {
        return false;
      }
      if (/Windows Phone/i.test(window.navigator.userAgent)) {
        return false;
      }
      if (/BlackBerry/i.test(window.navigator.userAgent)) {
        return false;
      }
      if (/BB10/i.test(window.navigator.userAgent)) {
        return false;
      }
      if (window.navigator.appName === "Microsoft Internet Explorer") {
        return document.documentMode >= 8;
      }
      return true;
    };

    AbstractChosen.default_multiple_text = "Select Some Options";

    AbstractChosen.default_single_text = "Select an Option";

    AbstractChosen.default_no_result_text = "No results match";

    return AbstractChosen;

  })();

  $ = jQuery;

  $.fn.extend({
    chosen: function(options) {
      if (!AbstractChosen.browser_is_supported()) {
        return this;
      }
      return this.each(function(input_field) {
        var $this, chosen;
        $this = $(this);
        chosen = $this.data('chosen');
        if (options === 'destroy') {
          if (chosen instanceof Chosen) {
            chosen.destroy();
          }
          return;
        }
        if (!(chosen instanceof Chosen)) {
          $this.data('chosen', new Chosen(this, options));
        }
      });
    }
  });

  Chosen = (function(_super) {
    __extends(Chosen, _super);

    function Chosen() {
      _ref = Chosen.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    Chosen.prototype.setup = function() {
      this.form_field_jq = $(this.form_field);
      this.current_selectedIndex = this.form_field.selectedIndex;
      return this.is_rtl = this.form_field_jq.hasClass("chosen-rtl");
    };

    Chosen.prototype.set_up_html = function() {
      var container_classes, container_props;
      container_classes = ["chosen-container"];
      container_classes.push("chosen-container-" + (this.is_multiple ? "multi" : "single"));
      if (this.inherit_select_classes && this.form_field.className) {
        container_classes.push(this.form_field.className);
      }
      if (this.is_rtl) {
        container_classes.push("chosen-rtl");
      }
      container_props = {
        'class': container_classes.join(' '),
        'style': "width: " + (this.container_width()) + ";",
        'title': this.form_field.title
      };
      if (this.form_field.id.length) {
        container_props.id = this.form_field.id.replace(/[^\w]/g, '_') + "_chosen";
      }
      this.container = $("<div />", container_props);
      if (this.is_multiple) {
        this.container.html('<ul class="chosen-choices"><li class="search-field"><input type="text" value="' + this.default_text + '" class="default" autocomplete="off" style="width:25px;" /></li></ul><div class="chosen-drop"><ul class="chosen-results"></ul></div>');
      } else {
        this.container.html('<a class="chosen-single chosen-default"><span>' + this.default_text + '</span><div><b></b></div></a><div class="chosen-drop"><div class="chosen-search"><input type="text" autocomplete="off" /></div><ul class="chosen-results"></ul></div>');
      }
      this.form_field_jq.hide().after(this.container);
      this.dropdown = this.container.find('div.chosen-drop').first();
      this.search_field = this.container.find('input').first();
      this.search_results = this.container.find('ul.chosen-results').first();
      this.search_field_scale();
      this.search_no_results = this.container.find('li.no-results').first();
      if (this.is_multiple) {
        this.search_choices = this.container.find('ul.chosen-choices').first();
        this.search_container = this.container.find('li.search-field').first();
      } else {
        this.search_container = this.container.find('div.chosen-search').first();
        this.selected_item = this.container.find('.chosen-single').first();
      }
      this.results_build();
      this.set_tab_index();
      return this.set_label_behavior();
    };

    Chosen.prototype.on_ready = function() {
      return this.form_field_jq.trigger("chosen:ready", {
        chosen: this
      });
    };

    Chosen.prototype.register_observers = function() {
      var _this = this;
      this.container.bind('touchstart.chosen', function(evt) {
        _this.container_mousedown(evt);
        return evt.preventDefault();
      });
      this.container.bind('touchend.chosen', function(evt) {
        _this.container_mouseup(evt);
        return evt.preventDefault();
      });
      this.container.bind('mousedown.chosen', function(evt) {
        _this.container_mousedown(evt);
      });
      this.container.bind('mouseup.chosen', function(evt) {
        _this.container_mouseup(evt);
      });
      this.container.bind('mouseenter.chosen', function(evt) {
        _this.mouse_enter(evt);
      });
      this.container.bind('mouseleave.chosen', function(evt) {
        _this.mouse_leave(evt);
      });
      this.search_results.bind('mouseup.chosen', function(evt) {
        _this.search_results_mouseup(evt);
      });
      this.search_results.bind('mouseover.chosen', function(evt) {
        _this.search_results_mouseover(evt);
      });
      this.search_results.bind('mouseout.chosen', function(evt) {
        _this.search_results_mouseout(evt);
      });
      this.search_results.bind('mousewheel.chosen DOMMouseScroll.chosen', function(evt) {
        _this.search_results_mousewheel(evt);
      });
      this.search_results.bind('touchstart.chosen', function(evt) {
        _this.search_results_touchstart(evt);
      });
      this.search_results.bind('touchmove.chosen', function(evt) {
        _this.search_results_touchmove(evt);
      });
      this.search_results.bind('touchend.chosen', function(evt) {
        _this.search_results_touchend(evt);
      });
      this.form_field_jq.bind("chosen:updated.chosen", function(evt) {
        _this.results_update_field(evt);
      });
      this.form_field_jq.bind("chosen:activate.chosen", function(evt) {
        _this.activate_field(evt);
      });
      this.form_field_jq.bind("chosen:open.chosen", function(evt) {
        _this.container_mousedown(evt);
      });
      this.form_field_jq.bind("chosen:close.chosen", function(evt) {
        _this.input_blur(evt);
      });
      this.search_field.bind('blur.chosen', function(evt) {
        _this.input_blur(evt);
      });
      this.search_field.bind('keyup.chosen', function(evt) {
        _this.keyup_checker(evt);
      });
      this.search_field.bind('keydown.chosen', function(evt) {
        _this.keydown_checker(evt);
      });
      this.search_field.bind('focus.chosen', function(evt) {
        _this.input_focus(evt);
      });
      this.search_field.bind('cut.chosen', function(evt) {
        _this.clipboard_event_checker(evt);
      });
      this.search_field.bind('paste.chosen', function(evt) {
        _this.clipboard_event_checker(evt);
      });
      if (this.is_multiple) {
        return this.search_choices.bind('click.chosen', function(evt) {
          _this.choices_click(evt);
        });
      } else {
        return this.container.bind('click.chosen', function(evt) {
          evt.preventDefault();
        });
      }
    };

    Chosen.prototype.destroy = function() {
      $(this.container[0].ownerDocument).unbind("click.chosen", this.click_test_action);
      if (this.search_field[0].tabIndex) {
        this.form_field_jq[0].tabIndex = this.search_field[0].tabIndex;
      }
      this.container.remove();
      this.form_field_jq.removeData('chosen');
      return this.form_field_jq.show();
    };

    Chosen.prototype.search_field_disabled = function() {
      this.is_disabled = this.form_field_jq[0].disabled;
      if (this.is_disabled) {
        this.container.addClass('chosen-disabled');
        this.search_field[0].disabled = true;
        if (!this.is_multiple) {
          this.selected_item.unbind("focus.chosen", this.activate_action);
        }
        return this.close_field();
      } else {
        this.container.removeClass('chosen-disabled');
        this.search_field[0].disabled = false;
        if (!this.is_multiple) {
          return this.selected_item.bind("focus.chosen", this.activate_action);
        }
      }
    };

    Chosen.prototype.container_mousedown = function(evt) {
      if (!this.is_disabled) {
        if (evt && evt.type === "mousedown" && !this.results_showing) {
          evt.preventDefault();
        }
        if (!((evt != null) && ($(evt.target)).hasClass("search-choice-close"))) {
          if (!this.active_field) {
            if (this.is_multiple) {
              this.search_field.val("");
            }
            $(this.container[0].ownerDocument).bind('click.chosen', this.click_test_action);
            this.results_show();
          } else if (!this.is_multiple && evt && (($(evt.target)[0] === this.selected_item[0]) || $(evt.target).parents("a.chosen-single").length)) {
            evt.preventDefault();
            this.results_toggle();
          }
          return this.activate_field();
        }
      }
    };

    Chosen.prototype.container_mouseup = function(evt) {
      if (evt.target.nodeName === "ABBR" && !this.is_disabled) {
        return this.results_reset(evt);
      }
    };

    Chosen.prototype.search_results_mousewheel = function(evt) {
      var delta;
      if (evt.originalEvent) {
        delta = evt.originalEvent.deltaY || -evt.originalEvent.wheelDelta || evt.originalEvent.detail;
      }
      if (delta != null) {
        evt.preventDefault();
        if (evt.type === 'DOMMouseScroll') {
          delta = delta * 40;
        }
        return this.search_results.scrollTop(delta + this.search_results.scrollTop());
      }
    };

    Chosen.prototype.blur_test = function(evt) {
      if (!this.active_field && this.container.hasClass("chosen-container-active")) {
        return this.close_field();
      }
    };

    Chosen.prototype.close_field = function() {
      $(this.container[0].ownerDocument).unbind("click.chosen", this.click_test_action);
      this.active_field = false;
      this.results_hide();
      this.container.removeClass("chosen-container-active");
      this.clear_backstroke();
      this.show_search_field_default();
      return this.search_field_scale();
    };

    Chosen.prototype.activate_field = function() {
      this.container.addClass("chosen-container-active");
      this.active_field = true;
      this.search_field.val(this.search_field.val());
      return this.search_field.focus();
    };

    Chosen.prototype.test_active_click = function(evt) {
      var active_container;
      active_container = $(evt.target).closest('.chosen-container');
      if (active_container.length && this.container[0] === active_container[0]) {
        return this.active_field = true;
      } else {
        return this.close_field();
      }
    };

    Chosen.prototype.results_build = function() {
      this.parsing = true;
      this.selected_option_count = null;
      this.results_data = SelectParser.select_to_array(this.form_field);
      if (this.is_multiple) {
        this.search_choices.find("li.search-choice").remove();
      } else if (!this.is_multiple) {
        this.single_set_selected_text();
        if (this.disable_search || this.form_field.options.length <= this.disable_search_threshold) {
          this.search_field[0].readOnly = true;
          this.container.addClass("chosen-container-single-nosearch");
        } else {
          this.search_field[0].readOnly = false;
          this.container.removeClass("chosen-container-single-nosearch");
        }
      }
      this.update_results_content(this.results_option_build({
        first: true
      }));
      this.search_field_disabled();
      this.show_search_field_default();
      this.search_field_scale();
      return this.parsing = false;
    };

    Chosen.prototype.result_do_highlight = function(el) {
      var high_bottom, high_top, maxHeight, visible_bottom, visible_top;
      if (el.length) {
        this.result_clear_highlight();
        this.result_highlight = el;
        this.result_highlight.addClass("highlighted");
        maxHeight = parseInt(this.search_results.css("maxHeight"), 10);
        visible_top = this.search_results.scrollTop();
        visible_bottom = maxHeight + visible_top;
        high_top = this.result_highlight.position().top + this.search_results.scrollTop();
        high_bottom = high_top + this.result_highlight.outerHeight();
        if (high_bottom >= visible_bottom) {
          return this.search_results.scrollTop((high_bottom - maxHeight) > 0 ? high_bottom - maxHeight : 0);
        } else if (high_top < visible_top) {
          return this.search_results.scrollTop(high_top);
        }
      }
    };

    Chosen.prototype.result_clear_highlight = function() {
      if (this.result_highlight) {
        this.result_highlight.removeClass("highlighted");
      }
      return this.result_highlight = null;
    };

    Chosen.prototype.results_show = function() {
      if (this.is_multiple && this.max_selected_options <= this.choices_count()) {
        this.form_field_jq.trigger("chosen:maxselected", {
          chosen: this
        });
        return false;
      }
      this.container.addClass("chosen-with-drop");
      this.results_showing = true;
      this.search_field.focus();
      this.search_field.val(this.search_field.val());
      this.winnow_results();
      return this.form_field_jq.trigger("chosen:showing_dropdown", {
        chosen: this
      });
    };

    Chosen.prototype.update_results_content = function(content) {
      return this.search_results.html(content);
    };

    Chosen.prototype.results_hide = function() {
      if (this.results_showing) {
        this.result_clear_highlight();
        this.container.removeClass("chosen-with-drop");
        this.form_field_jq.trigger("chosen:hiding_dropdown", {
          chosen: this
        });
      }
      return this.results_showing = false;
    };

    Chosen.prototype.set_tab_index = function(el) {
      var ti;
      if (this.form_field.tabIndex) {
        ti = this.form_field.tabIndex;
        this.form_field.tabIndex = -1;
        return this.search_field[0].tabIndex = ti;
      }
    };

    Chosen.prototype.set_label_behavior = function() {
      var _this = this;
      this.form_field_label = this.form_field_jq.parents("label");
      if (!this.form_field_label.length && this.form_field.id.length) {
        this.form_field_label = $("label[for='" + this.form_field.id + "']");
      }
      if (this.form_field_label.length > 0) {
        return this.form_field_label.bind('click.chosen', function(evt) {
          if (_this.is_multiple) {
            return _this.container_mousedown(evt);
          } else {
            return _this.activate_field();
          }
        });
      }
    };

    Chosen.prototype.show_search_field_default = function() {
      if (this.is_multiple && this.choices_count() < 1 && !this.active_field) {
        this.search_field.val(this.default_text);
        return this.search_field.addClass("default");
      } else {
        this.search_field.val("");
        return this.search_field.removeClass("default");
      }
    };

    Chosen.prototype.search_results_mouseup = function(evt) {
      var target;
      target = $(evt.target).hasClass("active-result") ? $(evt.target) : $(evt.target).parents(".active-result").first();
      if (target.length) {
        this.result_highlight = target;
        this.result_select(evt);
        return this.search_field.focus();
      }
    };

    Chosen.prototype.search_results_mouseover = function(evt) {
      var target;
      target = $(evt.target).hasClass("active-result") ? $(evt.target) : $(evt.target).parents(".active-result").first();
      if (target) {
        return this.result_do_highlight(target);
      }
    };

    Chosen.prototype.search_results_mouseout = function(evt) {
      if ($(evt.target).hasClass("active-result" || $(evt.target).parents('.active-result').first())) {
        return this.result_clear_highlight();
      }
    };

    Chosen.prototype.choice_build = function(item) {
      var choice, close_link,
        _this = this;
      choice = $('<li />', {
        "class": "search-choice"
      }).html("<span>" + (this.choice_label(item)) + "</span>");
      if (item.disabled) {
        choice.addClass('search-choice-disabled');
      } else {
        close_link = $('<a />', {
          "class": 'search-choice-close',
          'data-option-array-index': item.array_index
        });
        close_link.bind('click.chosen', function(evt) {
          return _this.choice_destroy_link_click(evt);
        });
        choice.append(close_link);
      }
      return this.search_container.before(choice);
    };

    Chosen.prototype.choice_destroy_link_click = function(evt) {
      evt.preventDefault();
      evt.stopPropagation();
      if (!this.is_disabled) {
        return this.choice_destroy($(evt.target));
      }
    };

    Chosen.prototype.choice_destroy = function(link) {
      if (this.result_deselect(link[0].getAttribute("data-option-array-index"))) {
        this.show_search_field_default();
        if (this.is_multiple && this.choices_count() > 0 && this.search_field.val().length < 1) {
          this.results_hide();
        }
        link.parents('li').first().remove();
        return this.search_field_scale();
      }
    };

    Chosen.prototype.results_reset = function() {
      this.reset_single_select_options();
      this.form_field.options[0].selected = true;
      this.single_set_selected_text();
      this.show_search_field_default();
      this.results_reset_cleanup();
      this.form_field_jq.trigger("change");
      if (this.active_field) {
        return this.results_hide();
      }
    };

    Chosen.prototype.results_reset_cleanup = function() {
      this.current_selectedIndex = this.form_field.selectedIndex;
      return this.selected_item.find("abbr").remove();
    };

    Chosen.prototype.result_select = function(evt) {
      var high, item;
      if (this.result_highlight) {
        high = this.result_highlight;
        this.result_clear_highlight();
        if (this.is_multiple && this.max_selected_options <= this.choices_count()) {
          this.form_field_jq.trigger("chosen:maxselected", {
            chosen: this
          });
          return false;
        }
        if (this.is_multiple) {
          high.removeClass("active-result");
        } else {
          this.reset_single_select_options();
        }
        high.addClass("result-selected");
        item = this.results_data[high[0].getAttribute("data-option-array-index")];
        item.selected = true;
        this.form_field.options[item.options_index].selected = true;
        this.selected_option_count = null;
        if (this.is_multiple) {
          this.choice_build(item);
        } else {
          this.single_set_selected_text(this.choice_label(item));
        }
        if (!((evt.metaKey || evt.ctrlKey) && this.is_multiple)) {
          this.results_hide();
        }
        this.show_search_field_default();
        if (this.is_multiple || this.form_field.selectedIndex !== this.current_selectedIndex) {
          this.form_field_jq.trigger("change", {
            'selected': this.form_field.options[item.options_index].value
          });
        }
        this.current_selectedIndex = this.form_field.selectedIndex;
        evt.preventDefault();
        return this.search_field_scale();
      }
    };

    Chosen.prototype.single_set_selected_text = function(text) {
      if (text == null) {
        text = this.default_text;
      }
      if (text === this.default_text) {
        this.selected_item.addClass("chosen-default");
      } else {
        this.single_deselect_control_build();
        this.selected_item.removeClass("chosen-default");
      }
      return this.selected_item.find("span").html(text);
    };

    Chosen.prototype.result_deselect = function(pos) {
      var result_data;
      result_data = this.results_data[pos];
      if (!this.form_field.options[result_data.options_index].disabled) {
        result_data.selected = false;
        this.form_field.options[result_data.options_index].selected = false;
        this.selected_option_count = null;
        this.result_clear_highlight();
        if (this.results_showing) {
          this.winnow_results();
        }
        this.form_field_jq.trigger("change", {
          deselected: this.form_field.options[result_data.options_index].value
        });
        this.search_field_scale();
        return true;
      } else {
        return false;
      }
    };

    Chosen.prototype.single_deselect_control_build = function() {
      if (!this.allow_single_deselect) {
        return;
      }
      if (!this.selected_item.find("abbr").length) {
        this.selected_item.find("span").first().after("<abbr class=\"search-choice-close\"></abbr>");
      }
      return this.selected_item.addClass("chosen-single-with-deselect");
    };

    Chosen.prototype.get_search_text = function() {
      return $('<div/>').text($.trim(this.search_field.val())).html();
    };

    Chosen.prototype.winnow_results_set_highlight = function() {
      var do_high, selected_results;
      selected_results = !this.is_multiple ? this.search_results.find(".result-selected.active-result") : [];
      do_high = selected_results.length ? selected_results.first() : this.search_results.find(".active-result").first();
      if (do_high != null) {
        return this.result_do_highlight(do_high);
      }
    };

    Chosen.prototype.no_results = function(terms) {
      var no_results_html;
      no_results_html = $('<li class="no-results">' + this.results_none_found + ' "<span></span>"</li>');
      no_results_html.find("span").first().html(terms);
      this.search_results.append(no_results_html);
      return this.form_field_jq.trigger("chosen:no_results", {
        chosen: this
      });
    };

    Chosen.prototype.no_results_clear = function() {
      return this.search_results.find(".no-results").remove();
    };

    Chosen.prototype.keydown_arrow = function() {
      var next_sib;
      if (this.results_showing && this.result_highlight) {
        next_sib = this.result_highlight.nextAll("li.active-result").first();
        if (next_sib) {
          return this.result_do_highlight(next_sib);
        }
      } else {
        return this.results_show();
      }
    };

    Chosen.prototype.keyup_arrow = function() {
      var prev_sibs;
      if (!this.results_showing && !this.is_multiple) {
        return this.results_show();
      } else if (this.result_highlight) {
        prev_sibs = this.result_highlight.prevAll("li.active-result");
        if (prev_sibs.length) {
          return this.result_do_highlight(prev_sibs.first());
        } else {
          if (this.choices_count() > 0) {
            this.results_hide();
          }
          return this.result_clear_highlight();
        }
      }
    };

    Chosen.prototype.keydown_backstroke = function() {
      var next_available_destroy;
      if (this.pending_backstroke) {
        this.choice_destroy(this.pending_backstroke.find("a").first());
        return this.clear_backstroke();
      } else {
        next_available_destroy = this.search_container.siblings("li.search-choice").last();
        if (next_available_destroy.length && !next_available_destroy.hasClass("search-choice-disabled")) {
          this.pending_backstroke = next_available_destroy;
          if (this.single_backstroke_delete) {
            return this.keydown_backstroke();
          } else {
            return this.pending_backstroke.addClass("search-choice-focus");
          }
        }
      }
    };

    Chosen.prototype.clear_backstroke = function() {
      if (this.pending_backstroke) {
        this.pending_backstroke.removeClass("search-choice-focus");
      }
      return this.pending_backstroke = null;
    };

    Chosen.prototype.keydown_checker = function(evt) {
      var stroke, _ref1;
      stroke = (_ref1 = evt.which) != null ? _ref1 : evt.keyCode;
      this.search_field_scale();
      if (stroke !== 8 && this.pending_backstroke) {
        this.clear_backstroke();
      }
      switch (stroke) {
        case 8:
          this.backstroke_length = this.search_field.val().length;
          break;
        case 9:
          if (this.results_showing && !this.is_multiple) {
            this.result_select(evt);
          }
          this.mouse_on_container = false;
          break;
        case 13:
          if (this.results_showing) {
            evt.preventDefault();
          }
          break;
        case 32:
          if (this.disable_search) {
            evt.preventDefault();
          }
          break;
        case 38:
          evt.preventDefault();
          this.keyup_arrow();
          break;
        case 40:
          evt.preventDefault();
          this.keydown_arrow();
          break;
      }
    };

    Chosen.prototype.search_field_scale = function() {
      var div, f_width, h, style, style_block, styles, w, _i, _len;
      if (this.is_multiple) {
        h = 0;
        w = 0;
        style_block = "position:absolute; left: -1000px; top: -1000px; display:none;";
        styles = ['font-size', 'font-style', 'font-weight', 'font-family', 'line-height', 'text-transform', 'letter-spacing'];
        for (_i = 0, _len = styles.length; _i < _len; _i++) {
          style = styles[_i];
          style_block += style + ":" + this.search_field.css(style) + ";";
        }
        div = $('<div />', {
          'style': style_block
        });
        div.text(this.search_field.val());
        $('body').append(div);
        w = div.width() + 25;
        div.remove();
        f_width = this.container.outerWidth();
        if (w > f_width - 10) {
          w = f_width - 10;
        }
        return this.search_field.css({
          'width': w + 'px'
        });
      }
    };

    return Chosen;

  })(AbstractChosen);

}).call(this);


  }).apply(root, arguments);
});
}(this));

(function(root) {
define("angular-chosen", ["angular","jquery-chosen"], function() {
  return (function() {
/**
 * angular-chosen-localytics - Angular Chosen directive is an AngularJS Directive that brings the Chosen jQuery in a Angular way
 * @version v1.3.0
 * @link http://github.com/leocaseiro/angular-chosen
 * @license MIT
 */
(function() {
  var indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  angular.module('localytics.directives', []);

  angular.module('localytics.directives').directive('chosen', [
    '$timeout', function($timeout) {
      var CHOSEN_OPTION_WHITELIST, NG_OPTIONS_REGEXP, isEmpty, snakeCase;
      NG_OPTIONS_REGEXP = /^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+group\s+by\s+([\s\S]+?))?\s+for\s+(?:([\$\w][\$\w]*)|(?:\(\s*([\$\w][\$\w]*)\s*,\s*([\$\w][\$\w]*)\s*\)))\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?$/;
      CHOSEN_OPTION_WHITELIST = ['persistentCreateOption', 'createOptionText', 'createOption', 'skipNoResults', 'noResultsText', 'allowSingleDeselect', 'disableSearchThreshold', 'disableSearch', 'enableSplitWordSearch', 'inheritSelectClasses', 'maxSelectedOptions', 'placeholderTextMultiple', 'placeholderTextSingle', 'searchContains', 'singleBackstrokeDelete', 'displayDisabledOptions', 'displaySelectedOptions', 'width', 'includeGroupLabelInSelected', 'maxShownResults'];
      snakeCase = function(input) {
        return input.replace(/[A-Z]/g, function($1) {
          return "_" + ($1.toLowerCase());
        });
      };
      isEmpty = function(value) {
        var key;
        if (angular.isArray(value)) {
          return value.length === 0;
        } else if (angular.isObject(value)) {
          for (key in value) {
            if (value.hasOwnProperty(key)) {
              return false;
            }
          }
        }
        return true;
      };
      return {
        restrict: 'A',
        require: '?ngModel',
        priority: 1,
        link: function(scope, element, attr, ngModel) {
          var chosen, empty, initOrUpdate, match, options, origRender, startLoading, stopLoading, updateMessage, valuesExpr, viewWatch;
          scope.disabledValuesHistory = scope.disabledValuesHistory ? scope.disabledValuesHistory : [];
          element = $(element);
          element.addClass('localytics-chosen');
          options = scope.$eval(attr.chosen) || {};
          angular.forEach(attr, function(value, key) {
            if (indexOf.call(CHOSEN_OPTION_WHITELIST, key) >= 0) {
              return attr.$observe(key, function(value) {
                options[snakeCase(key)] = String(element.attr(attr.$attr[key])).slice(0, 2) === '{{' ? value : scope.$eval(value);
                return updateMessage();
              });
            }
          });
          startLoading = function() {
            return element.addClass('loading').attr('disabled', true).trigger('chosen:updated');
          };
          stopLoading = function() {
            element.removeClass('loading');
            if (angular.isDefined(attr.disabled)) {
              element.attr('disabled', attr.disabled);
            } else {
              element.attr('disabled', false);
            }
            return element.trigger('chosen:updated');
          };
          chosen = null;
          empty = false;
          initOrUpdate = function() {
            var defaultText;
            if (chosen) {
              return element.trigger('chosen:updated');
            } else {
              $timeout(function() {
                chosen = element.chosen(options).data('chosen');
              });
              if (angular.isObject(chosen)) {
                return defaultText = chosen.default_text;
              }
            }
          };
          updateMessage = function() {
            if (empty) {
              element.attr('data-placeholder', chosen.results_none_found).attr('disabled', true);
            } else {
              element.removeAttr('data-placeholder');
            }
            return element.trigger('chosen:updated');
          };
          if (ngModel) {
            origRender = ngModel.$render;
            ngModel.$render = function() {
              origRender();
              return initOrUpdate();
            };
            element.on('chosen:hiding_dropdown', function() {
              return scope.$apply(function() {
                return ngModel.$setTouched();
              });
            });
            if (attr.multiple) {
              viewWatch = function() {
                return ngModel.$viewValue;
              };
              scope.$watch(viewWatch, ngModel.$render, true);
            }
          } else {
            initOrUpdate();
          }
          attr.$observe('disabled', function() {
            return element.trigger('chosen:updated');
          });
          if (attr.ngOptions && ngModel) {
            match = attr.ngOptions.match(NG_OPTIONS_REGEXP);
            valuesExpr = match[7];
            scope.$watchCollection(valuesExpr, function(newVal, oldVal) {
              var timer;
              return timer = $timeout(function() {
                if (angular.isUndefined(newVal)) {
                  return startLoading();
                } else {
                  empty = isEmpty(newVal);
                  stopLoading();
                  return updateMessage();
                }
              });
            });
            return scope.$on('$destroy', function(event) {
              if (typeof timer !== "undefined" && timer !== null) {
                return $timeout.cancel(timer);
              }
            });
          }
        }
      };
    }
  ]);

}).call(this);


  }).apply(root, arguments);
});
}(this));

/*
# email_accounts/filters/encodeURIComponent.js                        Copyright(c) 2018 cPanel, Inc.
#                                                                               All rights Reserved.
# copyright@cpanel.net                                                             http://cpanel.net
# This code is subject to the cPanel license.                     Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/filters/encodeURIComponent',[
        "angular",
    ],
    function(angular) {

        "use strict";

        /**
         * A filter to provide a wrapper around window.encodeURIComponent for use in Angular markup, mostly useful for building links
         * @param  {string} value The value to provide to encodeURIComponent
         * @returns {string}       Returns the value filtered through window.encodeURIComponent
         *
         * @example
         * <a href="../some/page.html#/{{ someValue | encodeURIComponent }}" target="_blank">
         */

        var module;
        try {
            module = angular.module("cpanel.emailAccounts");
        } catch (e) {
            module = angular.module("cpanel.emailAccounts", []);
        }

        module.filter("encodeURIComponent", function() {
            return window.encodeURIComponent;
        });

    }
);

/*
# cjt/decorators/paginationDecorator.js             Copyright(c) 2014 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/decorators/paginationDecorator',[
        "angular",
        "cjt/core",
        "cjt/util/locale",
        "uiBootstrap"
    ],
    function(angular, CJT, LOCALE) {

        "use strict";

        var module;
        var MODULE_NAMESPACE = "cpanel.emailAccounts";

        try {
            module = angular.module(MODULE_NAMESPACE);
        } catch (e) {
            module = angular.module(MODULE_NAMESPACE, ["ui.bootstrap.pagination"]);
        }

        module.config(["$provide", function($provide) {

            // Extend the ngModelDirective to interpolate its name attribute
            $provide.decorator("uibPaginationDirective", ["$delegate", function($delegate) {
                var TEMPLATE_PATH = "decorators/pagination.phtml";
                var RELATIVE_PATH = "email_accounts/" + TEMPLATE_PATH;

                var uiPaginationDirective = $delegate[0];

                /**
                 * Update the ids in the page collection
                 *
                 * @method updateIds
                 * @param  {Array} pages
                 * @param  {string} id    Id of the directive, used as a prefix
                 */
                var updateIds = function(pages, id) {
                    if (!pages) {
                        return;
                    }

                    pages.forEach(function(page) {
                        page.id = id + "_" + page.text;
                    });
                };

                /**
                 * Update aria labels page collection
                 *
                 * @method updateIds
                 * @param  {Array} pages
                 */
                var updateAriaLabel = function(pages) {
                    if (!pages) {
                        return;
                    }

                    pages.forEach(function(page) {
                        page.ariaLabel = LOCALE.maketext("Go to page “[_1]”.", page.text);
                    });
                };

                /**
                 * Update current selected text
                 *
                 * @method updateCurrentSelectedText
                 * @param  {string} page - Current page number
                 * @param  {string} totalPages - Total pages
                 * @returns {string} Text to display
                 */
                var updateCurrentSelectedText = function(page, totalPages) {
                    return LOCALE.maketext("Page [numf,_1] of [numf,_2]", page, totalPages);
                };

                // Use a local template
                uiPaginationDirective.templateUrl = CJT.config.debug ? CJT.buildFullPath(RELATIVE_PATH) : TEMPLATE_PATH;

                // Extend the page model with the id field.
                var linkFn = uiPaginationDirective.link;

                /**
                 * Compile function for uiPagination Directive
                 *
                 * @method uiPaginationDirective.compile
                 */
                uiPaginationDirective.compile = function() {
                    return function(scope, element, attrs, ctrls) {
                        var paginationCtrl = ctrls[0];

                        linkFn.apply(this, arguments);

                        scope.parentId = attrs.id;
                        scope.ariaLabels = {
                            title: LOCALE.maketext("Pagination"),
                            firstPage: LOCALE.maketext("Go to first page."),
                            previousPage: LOCALE.maketext("Go to previous page."),
                            nextPage: LOCALE.maketext("Go to next page."),
                            lastPage: LOCALE.maketext("Go to last page."),
                        };

                        scope.updateCurrentSelectedText = updateCurrentSelectedText;

                        var render = paginationCtrl.render;
                        paginationCtrl.render = function() {
                            render.apply(paginationCtrl);
                            updateIds(scope.pages, scope.parentId);
                            updateAriaLabel(scope.pages);
                        };

                    };
                };

                return $delegate;
            }]);
        }]);

        return {
            namespace: MODULE_NAMESPACE
        };
    }
);

/*
# email_accounts/views/list.js                       Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define, PAGE */

define(
    'app/views/list',[
        "lodash",
        "angular",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/services/alertService",
        "cjt/directives/alert",
        "cjt/directives/alertList",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/searchDirective",
        "cjt/services/cpanel/componentSettingSaverService",
        "cjt/directives/pageSizeButtonDirective",
        "app/services/emailAccountsService",
        "cjt/directives/statsDirective",
        "cjt/directives/indeterminateState",
        "app/decorators/paginationDecorator",
        "cjt/directives/disableAnimations"
    ],
    function(_, angular, LOCALE) {
        "use strict";

        var app;
        try {
            app = angular.module("cpanel.emailAccounts");
        } catch (e) {
            app = angular.module("cpanel.emailAccounts", []);
        }

        app.value("PAGE", PAGE);

        /**
         * List Controller for Email
         *
         * @module ListController
         */
        var controller = app.controller(
            "ListController",
            [
                "$scope",
                "$location",
                "emailAccountsService",
                "PAGE",
                "alertService",
                "$timeout",
                "$routeParams",
                "$window",
                "componentSettingSaverService",
                "ONE_MEBIBYTE",
                function(
                    $scope,
                    $location,
                    emailAccountsService,
                    PAGE,
                    alertService,
                    $timeout,
                    $routeParams,
                    $window,
                    componentSettingSaverService,
                    ONE_MEBIBYTE
                ) {

                    var emailAccounts = this;

                    emailAccounts.isRTL = PAGE.isRTL;
                    emailAccounts.statsCssClass = "hide-stats";
                    emailAccountsService.getEmailStats().then(function(response) {
                        $scope.accountStats = response;
                        emailAccounts.statsCssClass = "animate-stats";
                    });

                    $scope.upgradeLink = emailAccountsService.getUpgradeUrl();

                    /**
                     * Redirects to create view
                     * @method createEmail
                     */
                    emailAccounts.createEmail = function() {
                        $location.path("/create");
                    };

                    var COMPONENT_NAME = "EmailAccountsTable";

                    var storageKeys = {
                        filter: "EmailAccountsListFilter",
                        currentPage: "EmailAccountsListCurrentPage",
                        quickFilter: "EmailAccountsListQuickFilter"
                    };

                    if (app.firstLoad) {

                        // clear local storage
                        _.forOwn(storageKeys, function(value) {
                            localStorage.removeItem(value);
                        } );
                    }

                    var MAX_NAME_WIDTH = 200;
                    var DEFAULT_TIMEOUT = 250;

                    emailAccounts.webmailEnabled = PAGE.webmailEnabled;
                    emailAccounts.dprefix = PAGE.dprefix;

                    emailAccounts.loadingEmailAccounts = false;
                    emailAccounts.filterTermPending = true;

                    emailAccounts.storageKeys = storageKeys;

                    emailAccounts.meta = {

                        // sort settings
                        sortReverse: false,
                        sortBy: "user",
                        sortDirection: "asc",
                        sortFields: ["user", "domain", "has_suspended", "_diskused", "_diskquota", "diskusedpercent_float"],

                        // pager settings
                        showPager: false,
                        maxPages: 5,
                        totalItems: 0,
                        currentPage: 1,
                        pageSizes: [20, 50, 100, 500],
                        pageSize: 20,
                        start: 0,
                        limit: 10
                    };

                    emailAccounts.multiDeleteSelected = false;
                    emailAccounts.checkedCount = 0;
                    emailAccounts.selectAllState = false;
                    var selectedItems = {};

                    var storageFilterValue = localStorage.getItem(emailAccounts.storageKeys.filter);
                    if ( storageFilterValue && (0 === storageFilterValue.indexOf(PAGE.securityToken + ":")) ) {
                        emailAccounts.meta.filterValue = storageFilterValue.substr( 1 + PAGE.securityToken.length );
                    } else {
                        emailAccounts.meta.filterValue = "";
                    }


                    var storageQuickFilterValue = localStorage.getItem(emailAccounts.storageKeys.quickFilter);
                    if ( storageQuickFilterValue && (0 === storageQuickFilterValue.indexOf(PAGE.securityToken + ":")) ) {
                        emailAccounts.quickFilter = storageQuickFilterValue.substr( 1 + PAGE.securityToken.length );
                    } else {
                        emailAccounts.quickFilter = "all";
                    }

                    var storageCurrentPageValue = localStorage.getItem(emailAccounts.storageKeys.currentPage);
                    if (storageCurrentPageValue && (0 === storageCurrentPageValue.indexOf(PAGE.securityToken + ":")) ) {
                        emailAccounts.meta.currentPage = storageCurrentPageValue.substr( 1 + PAGE.securityToken.length );
                    } else {
                        emailAccounts.meta.currentPage = 1;
                    }

                    if ( $routeParams.account && $routeParams.account !== emailAccounts.meta.filterValue ) {
                        emailAccounts.meta.filterValue = $routeParams.account;
                        emailAccounts.meta.accounts = undefined;
                    }

                    /**
                     * Clears selected state
                     *
                     * @method clearSelectedState
                     */
                    function clearSelectedState() {
                        emailAccounts.selectAllState = false;
                        emailAccounts.checkedCount = 0;
                        emailAccounts.multiDeleteSelected = false;
                    }

                    /**
                     * Helps decide to show or hide email in the expanded view based on email account length
                     * @method showInnerEmail
                     * @param {string} email
                     * @returns {Boolean}
                     */
                    function showInnerEmail(email) {
                        var el = document.getElementById("account-name_" + email);
                        if (el) {
                            var width = $window.getComputedStyle(el).width;

                            if (width) {
                                width = width.slice(0, -2);
                                return width >= MAX_NAME_WIDTH;
                            }
                        }

                        return true;
                    }

                    /**
                     * Updates locale storage
                     *
                     * @method updateLocalStorage
                     * @param {string} key
                     * @param {string} value
                     */
                    function updateLocalStorage(key, value) {
                        localStorage.setItem(
                            emailAccounts.storageKeys[key],
                            PAGE.securityToken + ":" + value
                        );
                    }

                    /**
                     * Sets the sort, paginiation, and page size settings based on the provided object
                     * @method setMetaFromComponentSettings
                     * @param  {Object} settings An object containing the settings
                     *  {
                     *      sortBy:        A string indicating which field to sort by, must be one of the values in meta.sortFields
                     *      sortDirection: A string indicating the sort direction, must be one of "asc" or "desc"
                     *      pageSize:      A string or integer indicating the page size, must be one of the values in meta.pageSizes
                     *  }
                     */
                    emailAccounts.setMetaFromComponentSettings = function(settings) {

                        if ( settings.hasOwnProperty("sortBy") && settings.sortBy && _.find(emailAccounts.meta.sortFields, function(f) {
                            return f === settings.sortBy;
                        }) ) {
                            emailAccounts.meta.sortBy = settings.sortBy;
                        }

                        if ( settings.hasOwnProperty("sortDirection") && settings.sortDirection && (settings.sortDirection === "asc" || settings.sortDirection === "desc" ) ) {
                            emailAccounts.meta.sortDirection = settings.sortDirection;
                        }

                        if ( settings.hasOwnProperty("pageSize") && settings.pageSize && _.find(emailAccounts.meta.pageSizes, function(s) {
                            return s === parseInt(settings.pageSize);
                        }) ) {
                            emailAccounts.meta.pageSize = parseInt(settings.pageSize);
                        }

                    };

                    /**
                     * Stores the current values of sortBy, sortDirection, pageSize
                     * @method saveMetaToComponentSettings
                     */
                    emailAccounts.saveMetaToComponentSettings = function() {
                        componentSettingSaverService.set(COMPONENT_NAME, {
                            sortBy: emailAccounts.meta.sortBy,
                            sortDirection: emailAccounts.meta.sortDirection,
                            pageSize: emailAccounts.meta.pageSize
                        });
                    };

                    /**
                     * Clears status
                     * @method clearStatus
                     * @param {Object} emailAccount
                     */
                    emailAccounts.clearStatus = function(emailAccount) {

                        // Account was deleted, remove it from the list
                        if ( emailAccount && emailAccount.deleted ) {

                            var index = emailAccounts.meta.accounts.indexOf(emailAccount);

                            // Don't remove anything if the item isn't found in the list
                            if ( index > -1 ) {
                                emailAccounts.meta.accounts.splice(index, 1);
                                emailAccounts.meta.totalItems--;

                                emailAccounts.meta.mobileItemCountText = LOCALE.maketext("[_1] - [_2] of [_3]",
                                    emailAccounts.meta.start, emailAccounts.meta.limit, emailAccounts.meta.totalItems
                                );
                            }

                            emailAccount.isExpanded = false;

                            // If we've removed all the items on the page, but there are more items in the result set, fetch them
                            if ( emailAccounts.meta.accounts.length === 0 && emailAccounts.meta.totalItems > emailAccounts.meta.pageSize ) {

                                // If we deleted the last item on the last page, go back by 1 page
                                if ( emailAccounts.meta.currentPage === emailAccounts.meta.totalPages ) {
                                    emailAccounts.meta.currentPage--;
                                }

                                return emailAccounts.fetch();
                            }

                        }
                    };

                    /**
                     * Callback for clicking on one of the table headers to sort by column
                     * @method sortList
                     */
                    emailAccounts.sortList = function() {

                        if ( emailAccounts.currentFetchTimeout ) {
                            $timeout.cancel(emailAccounts.currentFetchTimeout);
                        }

                        emailAccounts.currentFetchTimeout = $timeout(function() {
                            emailAccounts.saveMetaToComponentSettings();
                            clearSelectedState();
                            emailAccounts.meta.currentPage = 1;
                            updateLocalStorage("currentPage", emailAccounts.meta.currentPage);
                            return emailAccounts.fetch();
                        }, DEFAULT_TIMEOUT);
                    };

                    /**
                     * Callback for clicking on one of the pagination nav links to move between pages
                     * @method selectPage
                     */
                    emailAccounts.selectPage = function() {
                        if (emailAccounts.loadingEmailAccounts) {
                            return;
                        }

                        if ( emailAccounts.currentFetchTimeout ) {
                            $timeout.cancel(emailAccounts.currentFetchTimeout);
                        }

                        return emailAccounts.currentFetchTimeout = $timeout(function() {
                            clearSelectedState();
                            updateLocalStorage("currentPage", emailAccounts.meta.currentPage);
                            return emailAccounts.fetch();
                        }, DEFAULT_TIMEOUT);
                    };

                    /**
                     * Callback for selecting a page size from the pagination
                     * @method selectPageSize
                     */
                    emailAccounts.selectPageSize = function() {

                        if ( emailAccounts.currentFetchTimeout ) {
                            $timeout.cancel(emailAccounts.currentFetchTimeout);
                        }

                        emailAccounts.currentFetchTimeout = $timeout(function() {
                            emailAccounts.saveMetaToComponentSettings();
                            clearSelectedState();
                            emailAccounts.meta.currentPage = 1;
                            return emailAccounts.fetch();
                        }, DEFAULT_TIMEOUT);
                    };

                    /**
                     * Callback for entering filter input into the search bar
                     * @method searchList
                     */
                    emailAccounts.searchList = function() {
                        emailAccounts.filterTermPending = true;
                        emailAccounts.meta.currentPage = 1;
                        clearSelectedState();
                        updateLocalStorage("filter", emailAccounts.meta.filterValue);
                        updateLocalStorage("currentPage", emailAccounts.meta.currentPage);
                        return emailAccounts.fetch();
                    };

                    /**
                     * Gets selected state
                     * @method getSelectedState
                     * @returns {Boolean} returns if the checkbox is selected
                     */
                    emailAccounts.getSelectedState = function() {
                        return emailAccounts.checkedCount > 0 || emailAccounts.selectAllState;
                    };

                    /**
                     * Gets indeterminate state
                     * @method getIndeterminateState
                     * @returns {Boolean} returns indeterminate state
                     */
                    emailAccounts.getIndeterminateState = function() {
                        return emailAccounts.checkedCount > 0 && !emailAccounts.selectAllState;
                    };

                    /**
                     * Toggles selection
                     *
                     * @method toggleSelection
                     */
                    emailAccounts.toggleSelection = function(account) {
                        if (account.selected) {
                            emailAccounts.checkedCount++;
                            selectedItems[account.email] = true;
                        } else {
                            emailAccounts.checkedCount--;
                            delete selectedItems[account.email];
                        }
                        if (emailAccounts.checkedCount === 0) {
                            emailAccounts.multiDeleteSelected = false;
                        }
                        emailAccounts.selectAllState = emailAccounts.checkedCount === emailAccounts.meta.accounts.length;
                    };

                    /**
                     * Toggles select all
                     * @method toggleSelectAll
                     */
                    emailAccounts.toggleSelectAll = function() {
                        if (emailAccounts.meta.accounts.length === 0) {
                            return;
                        }

                        // if we are in an indeterminate state, make sure that select all unselects
                        var indeterminateState = emailAccounts.checkedCount > 0 && emailAccounts.checkedCount !== emailAccounts.meta.accounts.length;
                        if (indeterminateState) {
                            emailAccounts.selectAllState = !emailAccounts.selectAllState;
                        }

                        for (var i = 0, listLength = emailAccounts.meta.accounts.length; i < listLength; i++) {
                            var account = emailAccounts.meta.accounts[i];
                            if (account.isDefault) {
                                continue;
                            }
                            account.selected = emailAccounts.selectAllState;
                            if (emailAccounts.selectAllState) {
                                selectedItems[account.email] = emailAccounts.selectAllState;
                            } else {
                                delete selectedItems[account.email];
                            }
                        }
                        if (emailAccounts.selectAllState) {
                            emailAccounts.checkedCount = listLength;
                        } else {
                            emailAccounts.checkedCount = 0;
                            emailAccounts.multiDeleteSelected = false;
                        }
                    };

                    /**
                     * Get delete multiple messages
                     *
                     * @method getDeleteMultipleMsg
                     */
                    emailAccounts.getDeleteMultipleMsg = function() {
                        var selected;

                        if (emailAccounts.checkedCount > 1) {
                            return LOCALE.maketext("Delete the selected [quant,_1,email account,email accounts]?", emailAccounts.checkedCount);
                        } else if (emailAccounts.checkedCount === 1) {
                            for (var i = 0, listLength = emailAccounts.meta.accounts.length; i < listLength; i++) {
                                if (emailAccounts.meta.accounts[i].selected) {
                                    selected = emailAccounts.meta.accounts[i].email;
                                    break;
                                }
                            }
                            return LOCALE.maketext("Delete “[_1]”?", selected);
                        }
                    };

                    /**
                     * Gets text for multi delete
                     *
                     * @method getMultiDeleteButtonTxt
                     * @returns {string} delete text
                     */
                    emailAccounts.getMultiDeleteButtonTxt = function() {
                        return LOCALE.maketext("Delete ([numf,_1])", emailAccounts.checkedCount);
                    };

                    /**
                     * Callback for deleting an email account from the list
                     * @method delete
                     */
                    emailAccounts.delete = function(account) {

                        account.delete_requested = true;
                        account.removing = true;

                        // If we're removing the last item in the list, clear the green on the search box
                        if ( emailAccounts.meta.accounts.length === 1 && emailAccounts.meta.filterValue ) {
                            emailAccounts.filterTermPending = true;
                        }

                        return emailAccountsService.deleteEmail(account.email)
                            .then(function() {
                                emailAccounts.filterTermPending = false;

                                alertService.add({
                                    message: LOCALE.maketext("Account “[_1]” deleted.", account.user + "@" + account.domain),
                                    type: "success",
                                    closeable: true,
                                    autoClose: 10000,
                                    group: "emailAccounts"
                                });

                                account.delete_requested = false;
                                account.removing = false;
                                account.deleted = true;

                                delete selectedItems[account.email];
                                emailAccounts.checkedCount--;

                                // Special handling for when the last record is removed from a filtered list
                                // Allows the search to go red while the deleted status stays displayed for 10s
                                if ( emailAccounts.meta.filterValue && emailAccounts.meta.accounts.length === 1 && emailAccounts.meta.totalItems <= emailAccounts.meta.pageSize ) {
                                    emailAccounts.meta.accounts = [];
                                }

                                emailAccounts.clearStatus(account);
                            },
                            function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    group: "emailAccounts"
                                });
                                account.delete_requested = false;
                                account.removing = false;
                                account.deleted = false;
                            }
                            );
                    };

                    /**
                     * Deletes multiple emails
                     *
                     * @method deleteMultiple
                     */
                    emailAccounts.deleteMultiple = function() {
                        emailAccounts.removingMultiple = true;

                        var accounts = [];
                        for (var i = 0, listLength = emailAccounts.meta.accounts.length; i < listLength; i++) {
                            if (emailAccounts.meta.accounts[i].selected && !emailAccounts.meta.accounts[i].isDefault) {
                                accounts.push(emailAccounts.meta.accounts[i]);
                            }
                        }

                        // If we're removing the last item in the list, clear the green on the search box
                        if ( emailAccounts.meta.accounts.length === 1 && emailAccounts.meta.filterValue ) {
                            emailAccounts.filterTermPending = true;
                        }

                        return emailAccountsService.deleteEmails(accounts)
                            .then(function() {
                                var message = "";
                                if (accounts.length > 1) {
                                    message = LOCALE.maketext("Deleted [numf,_1] email accounts.", accounts.length);
                                } else if (accounts.length === 1) {
                                    message = LOCALE.maketext("Email account “[_1]” deleted.", accounts[0].user + "@" + accounts[0].domain);
                                }

                                alertService.add({
                                    message: message,
                                    type: "success",
                                    closeable: true,
                                    autoClose: 10000,
                                    group: "emailAccounts"
                                });

                                clearSelectedState();
                                emailAccounts.removingMultiple = false;

                                for (var i = 0, len = accounts.length; i < len; i++) {
                                    delete selectedItems[accounts[0]];
                                }

                                return emailAccounts.fetch();
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    group: "emailAccounts"
                                });
                                emailAccounts.removingMultiple = false;
                                emailAccounts.multiDeleteSelected = false;
                            });
                    };

                    /**
                     * Sets API params
                     * @method setApiParams
                     * @param {Object} emailAccounts
                     * @param {string} sortMethod
                     */
                    function setApiParams(emailAccounts, sortMethod) {
                        var apiParams = {
                            "api.sort": 1,
                            "api.sort_column_0": emailAccounts.meta.sortBy,
                            "api.sort_method_0": sortMethod,
                            "api.sort_reverse_0": emailAccounts.meta.sortDirection === "asc" ? 0 : 1,
                            "api.paginate": 1,
                            "api.paginate_start": ((emailAccounts.meta.currentPage - 1) * emailAccounts.meta.pageSize) + 1,
                            "api.paginate_size": emailAccounts.meta.pageSize,
                            "api.paginate_page": emailAccounts.meta.currentPage
                        };

                        if ( emailAccounts.meta.sortBy !== "user" ) {
                            apiParams["api.sort_column_1"] = "user";
                            apiParams["api.sort_method_1"] = "lexicographic";
                        }

                        switch (emailAccounts.quickFilter) {
                            case "restricted":
                                apiParams["api.filter_term_1"] = 1;
                                apiParams["api.filter_type_1"] = "eq";
                                apiParams["api.filter_column_1"] = "has_suspended";
                                break;
                            case "default":
                                apiParams["api.filter_term_1"] = "Main Account";
                                apiParams["api.filter_type_1"] = "eq";
                                apiParams["api.filter_column_1"] = "login";

                                // clearing search value on default quick filter
                                emailAccounts.meta.filterValue = "";
                                delete apiParams["api.paginate"];
                                delete apiParams["api.paginate_start"];
                                delete apiParams["api.paginate_size"];
                                delete apiParams["api.paginate_page"];
                                emailAccounts.meta.currentPage = 1;
                                break;
                            case "overUsed":
                                apiParams["api.filter_term_1"] = 100;
                                apiParams["api.filter_type_1"] = "gt";
                                apiParams["api.filter_column_1"] = "diskusedpercent";
                                break;
                        }

                        if ( emailAccounts.meta.filterValue && emailAccounts.meta.filterValue !== "" ) {
                            apiParams["api.filter"] = 1;
                            apiParams["api.filter_term_0"] = emailAccounts.meta.filterValue;
                            apiParams["api.filter_column_0"] = "login";
                        }
                        return apiParams;
                    }

                    /**
                     * Controls show/hide available accounts warings
                     * @method showNoAvailableAccountsWarning
                     */
                    emailAccounts.showNoAvailableAccountsWarning = function() {
                        $scope.showNoAvailableAccounts = !$scope.showNoAvailableAccounts;
                    };

                    /**
                     * Close callout
                     * @method closeCallout
                     */
                    emailAccounts.closeCallout = function() {
                        $scope.showNoAvailableAccounts = false;
                    };

                    /**
                     * Calls emailAccountsService.getEmailAccounts to load the email accounts for the current page
                     * @method fetch
                     */
                    emailAccounts.fetch = function() {

                        emailAccounts.loadingEmailAccounts = true;

                        var sortMethod = "lexicographic";

                        if ( emailAccounts.meta.sortBy === "_diskused" || emailAccounts.meta.sortBy === "diskusedpercent_float" || emailAccounts.meta.sortBy === "has_suspended" ) {
                            sortMethod = "numeric";
                        } else if ( emailAccounts.meta.sortBy === "_diskquota" ) {
                            sortMethod = "numeric_zero_as_max";
                        }

                        var apiParams = setApiParams(emailAccounts, sortMethod);

                        emailAccounts.meta.accounts = [];

                        // Setting min-height to the current height to prevent the page jumping
                        // around when the list is fetching
                        var container = angular.element("#popsAccountList");

                        if ( container && container[0] ) {
                            container.css({ minHeight: $window.getComputedStyle(container[0]).height });
                        }

                        var apiPromise = emailAccountsService.getEmailAccounts(apiParams);
                        emailAccounts.fetchPromise = apiPromise;

                        return apiPromise.then(
                            function(response) {

                                // We only want to actually process the response if it's the last request we sent
                                if ( emailAccounts.fetchPromise !== apiPromise ) {
                                    return;
                                }

                                clearSelectedState();

                                var data = response.data;
                                var metadata = response.meta;

                                emailAccounts.meta.totalItems = metadata.paginate.total_records;
                                emailAccounts.meta.totalPages = metadata.paginate.total_pages;
                                emailAccounts.meta.currentPage = metadata.paginate.current_page;

                                if (emailAccounts.meta.totalItems > _.min(emailAccounts.meta.pageSizes)) {
                                    emailAccounts.meta.showPager = true;
                                    var start = (emailAccounts.meta.currentPage - 1) * emailAccounts.meta.pageSize;
                                    emailAccounts.meta.start = start + 1;
                                    emailAccounts.meta.limit = start + data.length;

                                } else {

                                    // hide pager and pagination
                                    emailAccounts.meta.showPager = false;

                                    if (data.length === 0) {
                                        emailAccounts.meta.start = 0;
                                    } else {
                                        emailAccounts.meta.start = 1;
                                    }

                                    emailAccounts.meta.limit = data.length;
                                }

                                emailAccounts.meta.mobileItemCountText = LOCALE.maketext("[_1] - [_2] of [_3]",
                                    emailAccounts.meta.start, emailAccounts.meta.limit, emailAccounts.meta.totalItems
                                );

                                angular.element("#popsAccountList").css({ minHeight: "" });

                                for (var i = 0, len = data.length; i < len; i++) {
                                    if (selectedItems[data[i].email] && !data[i].isDefault) {
                                        data[i].selected = true;
                                        emailAccounts.checkedCount++;
                                    }
                                }

                                if (data.length > 0) {
                                    emailAccounts.selectAllState = emailAccounts.checkedCount === data.length;
                                } else {
                                    emailAccounts.selectAllState = false;
                                }

                                // This is done to improve performance of loading 100+ records at a time in Firefox
                                if (data.length > 100) {
                                    var tempEmailAccounts = [];
                                    var chunkSize = 50;

                                    while (data.length) {
                                        tempEmailAccounts.push(data.splice(0, chunkSize));
                                    }
                                    emailAccounts.meta.accounts = tempEmailAccounts.shift();

                                    bindEmailsToList(tempEmailAccounts);

                                } else {
                                    emailAccounts.meta.accounts = data;
                                }

                                emailAccounts.loadingEmailAccounts = false;
                                emailAccounts.filterTermPending = false;
                            },
                            function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    group: "emailAccounts"
                                });
                                emailAccounts.loadingEmailAccounts = false;
                                emailAccounts.filterTermPending = false;
                            }
                        );
                    };

                    function bindEmailsToList(items) {

                        // push them in chunks
                        var emails = items.shift();

                        if (typeof emails !== "undefined" && emails !== null) {
                            $timeout(function() {
                                emailAccounts.meta.accounts = emailAccounts.meta.accounts.concat(emails);
                                bindEmailsToList(items);
                            }, 0);
                        }
                    }

                    /**
                     * Filters email
                     * @method filterEmails
                     */
                    emailAccounts.filterEmails = function() {

                        if (emailAccounts.quickFilter) {
                            emailAccounts.meta.currentPage = 1;
                            updateLocalStorage("quickFilter", emailAccounts.quickFilter);
                            updateLocalStorage("currentPage", emailAccounts.meta.currentPage);
                            return emailAccounts.fetch();
                        }
                    };

                    /**
                     * Gets css class that should be assinged to search field
                     * @method getSearchClass
                     * @returns {string} css class to be assigned to search field
                     */
                    emailAccounts.getSearchClass = function() {
                        if ( !emailAccounts.filterTermPending && !emailAccounts.loadingEmailAccounts && emailAccounts.meta.filterValue ) {
                            return emailAccounts.meta.accounts && emailAccounts.meta.accounts.length > 0 ? "success" : "danger";
                        } else {
                            return "";
                        }
                    };

                    /**
                     * Gets email accuont details
                     * @method getDetails
                     * @param {Object} account email account
                     * @param {Object} isExpanded expanded state
                     */
                    emailAccounts.getDetails = function(account, isExpanded) {
                        if (isExpanded) {
                            account.displayInnerEmail = showInnerEmail(account.email);
                        }
                        account.isExpanded = isExpanded;
                    };

                    /**
                     * Redirects to connect Devices interface
                     *
                     * @param {Object} emailAccount email account
                     */
                    emailAccounts.connectDevices = function(emailAccount) {
                        var path = emailAccounts.dprefix + "mail/clientconf.html?acct=" + encodeURIComponent(emailAccount.email);

                        window.location.href = path;
                    };

                    /**
                     * Redirects to manage account
                     * @method manageAccount
                     * @param {Object} emailAccount
                     * @param {string} scrollTo
                     */
                    emailAccounts.manageAccount = function(emailAccount, scrollTo) {
                        if (emailAccount && emailAccount.isDefault) {
                            $location.path("/manageDefault/");
                        } else {

                            var path = "/manage/" + encodeURIComponent(emailAccount.email);

                            if (typeof scrollTo !== "undefined" && scrollTo) {
                                path = path + "/" + scrollTo;
                            }

                            $location.path(path);
                        }
                    };

                    $scope.$on("$destroy", function() {
                        componentSettingSaverService.unregister(COMPONENT_NAME);
                    });

                    /**
                     * initialze
                     * @method init
                     */
                    function init() {

                        if ( app.firstLoad && PAGE.nvdata && PAGE.nvdata.hasOwnProperty(COMPONENT_NAME) ) {
                            emailAccounts.setMetaFromComponentSettings(PAGE.nvdata[COMPONENT_NAME]);
                        }

                        app.firstLoad = false;

                        emailAccounts.loadingEmailAccounts = true;
                        return componentSettingSaverService.register(COMPONENT_NAME)
                            .then(
                                function(result) {
                                    if ( result ) {

                                        if ( $routeParams.account && $routeParams.account !== result.filterValue ) {
                                            result.filterValue = $routeParams.account;
                                            emailAccounts.meta.currentPage = 1;
                                            emailAccounts.meta.accounts = undefined;
                                            emailAccounts.saveMetaToComponentSettings();
                                        }

                                        emailAccounts.setMetaFromComponentSettings(result);
                                    }

                                    if ( !emailAccounts.meta.accounts ) {
                                        return emailAccounts.fetch();
                                    }

                                },
                                function() {
                                    if ( !emailAccounts.meta.accounts ) {
                                        return emailAccounts.fetch();
                                    }
                                }
                            );
                    }

                    init();
                }
            ]
        );

        return controller;
    }
);

/*
# email_accounts/validators/emailAccountFullLength.js                           Copyright 2018 cPanel, Inc.
#                                                                                      All rights Reserved.
# copyright@cpanel.net                                                                    http://cpanel.net
# This code is subject to the cPanel license.                            Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/validators/emailAccountFullLength',[
        "angular"
    ],
    function(angular) {

        "use strict";

        var module;

        /**
         * Directive that checks the full length of two form fields + 1 (for the @) to make sure an email address is a valid length
         * @attribute {Integer} emailFullLength The maximum allowed length for the two fields + 1
         * @attribute {String}  emailOtherValue The other form field to compare against
         *
         * @example
         * <form name="formName">
         *     <input type="text" name="account" email-full-length="254" email-other-value="formName.domain">
         *     <input type="text" name="domain">
         * </form>
         */

        try {
            module = angular.module("cpanel.emailAccount");
        } catch (e) {
            module = angular.module("cpanel.emailAccount", []);
        }

        module.directive("emailFulllength", function() {
            return {
                require: "ngModel",
                restrict: "A",
                link: function( scope, element, attrs, ngModel ) { // eslint-disable-line no-unused-vars

                    ngModel.$validators.emailFulllength = function(model, view) { // eslint-disable-line no-unused-vars

                        var ngOtherModel = getNgOtherModel();
                        if (!ngOtherModel) {
                            var value = view || "";
                            return (value.length + 1) <= attrs.emailFulllength;
                        }

                        var thisIsEmpty = ngModel.$isEmpty(view);
                        var otherIsEmpty = ngOtherModel.$isEmpty(ngOtherModel.$viewValue);
                        if (thisIsEmpty && otherIsEmpty) {

                            // Don't validate this condition if both values are empty
                            return true;
                        } else {

                            var thisValue = view || "";
                            var otherValue = (ngOtherModel.$pending || ngOtherModel.$invalid) ? ngOtherModel.$viewValue : ngOtherModel.$modelValue;

                            return (thisValue.length + otherValue.length + 1) <= attrs.emailFulllength;
                        }

                    };

                    scope.$watchGroup([
                        function() {
                            var ngOtherModel = getNgOtherModel();
                            return ngOtherModel && ngOtherModel.$viewValue;
                        },
                        function() {
                            var ngOtherModel = getNgOtherModel();
                            return ngOtherModel && ngOtherModel.$modelValue;
                        }
                    ], function() {
                        ngModel.$validate();
                    });

                    var _ngOtherModel;
                    function getNgOtherModel() {
                        if (!_ngOtherModel) {
                            _ngOtherModel = scope.$eval(attrs.emailOtherValue);
                        }
                        return _ngOtherModel;
                    }
                }
            };
        });
    }
);

/*
# email_accounts/views/create.js                     Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define, PAGE */

define(
    'app/views/create',[
        "angular",
        "lodash",
        "cjt/util/locale",
        "cjt/util/parse",
        "uiBootstrap",
        "cjt/validator/email-validator",
        "app/services/emailAccountsService",
        "app/validators/emailAccountFullLength",
        "cjt/directives/statsDirective",
        "cjt/directives/passwordFieldDirective",
        "cjt/services/alertService",
        "cjt/directives/alert",
        "cjt/directives/alertList",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/toggleLabelInfoDirective",
        "cjt/directives/labelSuffixDirective",
        "cjt/directives/validationContainerDirective",
        "cjt/directives/validationItemDirective",
        "cjt/directives/bytesInput",
        "cjt/services/cpanel/componentSettingSaverService"
    ],
    function(angular, _, LOCALE, PARSE) {
        "use strict";

        var app;

        try {
            app = angular.module("cpanel.emailAccounts");
        } catch (e) {
            app = angular.module("cpanel.emailAccounts", []);
        }

        app.value("PAGE", PAGE);

        /**
         * Create Controller for Email
         *
         * @module CreateController
         */
        var controller = app.controller(
            "CreateController",
            [
                "$scope",
                "$location",
                "$anchorScroll",
                "$timeout",
                "emailAccountsService",
                "PAGE",
                "alertService",
                "$routeParams",
                "componentSettingSaverService",
                "$q",
                function(
                    $scope,
                    $location,
                    $anchorScroll,
                    $timeout,
                    emailAccountsService,
                    PAGE,
                    alertService,
                    $routeParams,
                    componentSettingSaverService,
                    $q
                ) {

                    var emailAccount = this;
                    var redirectTimer;
                    var COMPONENT_NAME = "EmailAccountsCreate";
                    var domain = decodeURIComponent($routeParams.domain);
                    var storageKeys = {
                        stayOnPage: "EmailAccountsCreateStayOnPage",
                    };

                    $anchorScroll.yOffset = 70;

                    emailAccount.isRTL = PAGE.isRTL;
                    emailAccount.isLoading = true;
                    emailAccount.statsCssClass = "hide-stats";
                    emailAccount.details = {};
                    $scope.showAllHelp = false;
                    $scope.upgradeURL = emailAccountsService.getUpgradeUrl();
                    $scope.requiredPasswordStrength = PAGE.requiredPasswordStrength;
                    $scope.isInviteSubEnabled = !!PAGE.isInviteSubEnabled;
                    $scope.defaultQuota = PAGE.userDefinedQuotaDefaultValue ? PAGE.userDefinedQuotaDefaultValue : undefined;
                    $scope.maxQuota = PAGE.maxEmailQuota;
                    $scope.canSetUnlimited = PAGE.canSetUnlimited;
                    $scope.maxQuotaHelpText = LOCALE.maketext("Quotas cannot exceed [format_bytes,_1].", PAGE.maxEmailQuota * 1024 * 1024);
                    $scope.maxEmailQuotaText = PAGE.canSetUnlimited ? LOCALE.maketext("Unlimited") : LOCALE.maketext("[format_bytes,_1]", PAGE.maxEmailQuota * 1024 * 1024);
                    $scope.mailDomains = [];

                    /**
                     * Called on first load
                     *
                     * @method firstLoad
                     */
                    function firstLoad() {
                        return $q.all([
                            componentSettingSaverService.register(COMPONENT_NAME),
                            emailAccountsService.getMailDomains(),
                            emailAccountsService.getEmailStats()
                        ]).then(
                            function(responses) {
                                $scope.mailDomains = responses[1];
                                $scope.accountStats = responses[2];
                                emailAccount.statsCssClass = "animate-stats";
                                return initialize()
                                    .then(function(result) {
                                        emailAccount.details = result;
                                    });
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    replace: false,
                                    group: "emailAccounts"
                                });
                            }
                        ).finally(function() {
                            emailAccount.isLoading = false;
                        });
                    }

                    /**
                     * Initialization
                     *
                     * @method initialize
                     * @param {Boolean} keepDomain
                     */
                    function initialize(keepDomain) {
                        return componentSettingSaverService.get(COMPONENT_NAME)
                            .then(function(response) {
                                if (typeof response !== "undefined" && response) {
                                    $scope.showAllHelp = response.showAllHelp;
                                }

                                if ($scope.accountStats.available) {
                                    var accountDetails = {};
                                    accountDetails.userName = null;
                                    accountDetails.domain = null;

                                    if (keepDomain) {
                                        accountDetails.domain = emailAccount.details.domain;
                                    } else if ($scope.mailDomains.length > 0) {
                                        if (typeof domain !== "undefined" && domain) {
                                            if ($scope.mailDomains.indexOf(domain) !== -1) {
                                                accountDetails.domain = domain;
                                            } else {
                                                accountDetails.domain = PAGE.primaryDomain;
                                            }
                                        } else {
                                            accountDetails.domain = PAGE.primaryDomain;
                                        }
                                    }

                                    accountDetails.quota = $scope.defaultQuota;
                                    accountDetails.password = null;
                                    accountDetails.quotaType = PAGE.defaultQuotaSelected;
                                    accountDetails.sendWelcomeEmail = true;
                                    accountDetails.setPassword = true;
                                    accountDetails.recoveryEmail = null;
                                    accountDetails.assignMaxDiskspace = false;
                                    accountDetails.quotaUnit = "MB";
                                    accountDetails.stayOnView = PARSE.parseBoolean(emailAccountsService.getStoredValue(storageKeys.stayOnPage));

                                    return accountDetails;
                                } else {

                                    // 10 seconds delay
                                    redirectTimer = $timeout( function() {
                                        $location.path("/list");
                                    }, 10000 );
                                }

                            });
                    }

                    firstLoad();

                    /**
                     * Stores the current values in the component settings
                     * @method saveToComponentSettings
                     */
                    emailAccount.saveToComponentSettings = function() {
                        return componentSettingSaverService.set(COMPONENT_NAME, {
                            showAllHelp: $scope.showAllHelp
                        });
                    };

                    /**
                     * Called when stayOnPage checkbox is changed
                     *
                     * @method stayOnPageChanged
                     */
                    emailAccount.stayOnPageChanged = function() {

                        if (emailAccount.details.stayOnView) {
                            localStorage.setItem(
                                storageKeys.stayOnPage,
                                PAGE.securityToken + ":" + "true"
                            );
                        } else {

                            // clear local storage
                            localStorage.removeItem(storageKeys.stayOnPage);
                        }
                    };

                    /**
                     * Scrolls to missing domains section
                     *
                     * @method scrollToMissingDomains
                     */
                    emailAccount.scrollToMissingDomains = function() {
                        $anchorScroll("missingDomainSection");
                        var missingDomainsSec = angular.element( document.querySelector( "#missingDomainSection" ) );

                        missingDomainsSec.addClass("section-highlight");
                        $timeout(function() {
                            missingDomainsSec.removeClass("section-highlight");
                        }, 11000);
                    };

                    /**
                     * Called when create button is clicked
                     *
                     * @method create
                     * @param {Object} details
                     */
                    emailAccount.create = function(details) {
                        emailAccount.frmCreateEmail.$submitted = true;

                        if (!emailAccount.frmCreateEmail.$valid || emailAccount.frmCreateEmail.$pending) {
                            return;
                        }

                        if (typeof details !== "undefined" && details) {

                            if (details.quotaType === "unlimited") {
                                if (!$scope.canSetUnlimited) {
                                    details.quota = $scope.maxQuota;
                                } else {
                                    details.quota = 0;
                                }
                            }

                            return emailAccountsService.createEmail(details)
                                .then(function(response) {

                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("You created “[_1]” ([output,url,_2,View]).",
                                            details.userName + "@" + details.domain,
                                            "#/list/" + details.userName + "@" + details.domain
                                        ),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "emailAccounts"
                                    });

                                    // we use the data from this call to possibly redirect the
                                    // user to the list, so we need to wait until this finishes
                                    // before proceeding
                                    return emailAccountsService.getEmailStats()
                                        .then(function(response) {
                                            $scope.accountStats = response;
                                            if (!emailAccount.details.stayOnView) {
                                                emailAccount.backToListView();
                                            } else {
                                                return initialize(true)
                                                    .then(function(result) {
                                                        emailAccount.details = result;
                                                        emailAccount.frmCreateEmail.$setPristine();
                                                    });
                                            }
                                        });

                                }, function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        replace: false,
                                        group: "emailAccounts"
                                    });
                                });
                        }
                    };

                    /**
                     * Back to List View
                     * @method backToListView
                     */
                    emailAccount.backToListView = function() {
                        $location.path("/list");
                    };

                    /**
                     * Toggles help
                     *
                     * @method toggleHelp
                     */
                    emailAccount.toggleHelp = function() {
                        $scope.showAllHelp = !$scope.showAllHelp;
                        emailAccount.saveToComponentSettings();
                        $scope.$broadcast("showHideAllChange", $scope.showAllHelp);
                    };

                    $scope.$on("$destroy", function() {
                        localStorage.removeItem(storageKeys.stayOnPage);
                        componentSettingSaverService.unregister(COMPONENT_NAME);
                        $timeout.cancel( redirectTimer );
                    });
                }
            ]
        );

        return controller;
    }
);

/*
# email_accounts/views/manage.js                     Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define, PAGE */

define(
    'app/views/manage',[
        "angular",
        "lodash",
        "cjt/util/locale",
        "cjt/util/parse",
        "uiBootstrap",
        "app/services/emailAccountsService",
        "app/filters/encodeURIComponent",
        "cjt/services/alertService",
        "cjt/directives/alert",
        "cjt/directives/alertList",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/toggleSwitchDirective",
        "cjt/directives/toggleLabelInfoDirective",
        "cjt/directives/validationContainerDirective",
        "cjt/directives/validationItemDirective",
        "cjt/services/cpanel/componentSettingSaverService"
    ],
    function(angular, _, LOCALE, parse) {
        "use strict";

        var app = angular.module("cpanel.emailAccounts");
        app.value("PAGE", PAGE);

        /**
         * Manage Controller for Email
         *
         * @module ManageController
         */
        var controller = app.controller(
            "ManageController",
            ["$scope", "$location", "$anchorScroll", "$timeout", "emailAccountsService", "PAGE", "alertService", "$routeParams", "componentSettingSaverService",
                function($scope, $location, $anchorScroll, $timeout, emailAccountsService, PAGE, alertService, $routeParams, componentSettingSaverService) {

                    var emailAccount = this;
                    emailAccount.isLoading = true;
                    emailAccount.isRTL = PAGE.isRTL;

                    $anchorScroll.yOffset = 70;

                    var storageKeys = {
                        stayOnPage: "EmailAccountsManageStayOnPage",
                    };

                    $scope.showAllHelp = false;
                    var COMPONENT_NAME = "EmailAccountsManage";
                    componentSettingSaverService.register(COMPONENT_NAME);

                    emailAccount.dprefix = PAGE.dprefix;

                    emailAccount.webmailEnabled = parse.parseBoolean(PAGE.webmailEnabled);
                    emailAccount.requiredPasswordStrength = PAGE.requiredPasswordStrength;
                    emailAccount.externalAuthConfig = PAGE.externalAuthModulesConfigured;
                    emailAccount.showCalAndContacts = PAGE.showCalendarAndContactItems;
                    emailAccount.emailDiskUsageEnabled = PAGE.emailDiskUsageEnabled;
                    emailAccount.emailFiltersEnabled = PAGE.emailFiltersEnabled;
                    emailAccount.autoResponderEnabled = PAGE.autoResponderEnabled;

                    $scope.defaultQuota = PAGE.userDefinedQuotaDefaultValue ? PAGE.userDefinedQuotaDefaultValue : undefined;
                    $scope.maxQuota = PAGE.maxEmailQuota;
                    $scope.canSetUnlimited = PAGE.canSetUnlimited;
                    $scope.maxQuotaHelpText = LOCALE.maketext("Quotas cannot exceed [format_bytes,_1].", PAGE.maxEmailQuota * 1024 * 1024);
                    $scope.maxEmailQuotaText = PAGE.canSetUnlimited ? LOCALE.maketext("Unlimited") : LOCALE.maketext("[format_bytes,_1]", PAGE.maxEmailQuota * 1024 * 1024);

                    emailAccount.stayOnView = parse.parseBoolean(emailAccountsService.getStoredValue(storageKeys.stayOnPage));

                    $scope.showAllHelp = false;

                    // Get the variables from the URL
                    var email = decodeURIComponent($routeParams.emailAccount);

                    var scrollTo = $routeParams.scrollTo;

                    var currentAccountState = {};
                    emailAccount.currentSuspendedState = {};
                    emailAccount.suspendOptions = {};

                    /**
                     * Resets manage view
                     * @method resetData
                     */
                    function resetData() {
                        currentAccountState = {};
                        emailAccount.currentSuspendedState = {};
                        emailAccount.suspendOptions = {};
                        emailAccount.details = {};
                    }

                    /**
                     * Stores the current values in the component settings
                     * @method saveToComponentSettings
                     */
                    emailAccount.saveToComponentSettings = function() {
                        componentSettingSaverService.set(COMPONENT_NAME, {
                            showAllHelp: $scope.showAllHelp
                        });
                    };

                    /**
                     * scrolls to specified area
                     * @method _scrollToArea
                     */
                    function _scrollToArea() {
                        return $timeout( function() {
                            if (typeof scrollTo !== "undefined" && scrollTo) {
                                $anchorScroll(scrollTo);
                                var section = angular.element( document.querySelector("#" + scrollTo) );

                                section.addClass("restriction-section-highlight");
                                return $timeout(function() {
                                    section.removeClass("restriction-section-highlight");
                                }, 11000);
                            }

                        }, 1000 );
                    }

                    /**
                     * Initialize
                     * @method initialize
                     */
                    function initialize() {

                        componentSettingSaverService.get(COMPONENT_NAME).then(function(response) {
                            if (typeof response !== "undefined" && response) {
                                $scope.showAllHelp = response.showAllHelp;
                            }
                        });

                        return emailAccountsService.getEmailAccountDetails(email)
                            .then(function(response) {
                                currentAccountState = response;
                                emailAccount.details = response;

                                emailAccount.suspendOptions.login = emailAccount.currentSuspendedState.login = response.suspended_login;
                                emailAccount.suspendOptions.incoming = emailAccount.currentSuspendedState.incoming = response.suspended_incoming;
                                emailAccount.suspendOptions.suspended_outgoing = response.suspended_outgoing;
                                emailAccount.suspendOptions.hold_outgoing = response.hold_outgoing;
                                emailAccount.suspendOptions.has_suspended = response.has_suspended;
                                emailAccount.suspendOptions.outgoing = emailAccount.currentSuspendedState.outgoing = emailAccount.suspendOptions.suspended_outgoing === true ? "suspend" : emailAccount.suspendOptions.hold_outgoing === true ? "hold" : "allow";

                                if (emailAccount.suspendOptions.outgoing === "hold") {
                                    return emailAccountsService.getHeldMessageCount(email)
                                        .then(function(messageCount) {
                                            emailAccount.suspendOptions.currentlyHeld = messageCount;
                                            emailAccount.isLoading = false;
                                            return _scrollToArea();
                                        }, function(error) {
                                            alertService.add({
                                                type: "danger",
                                                message: error,
                                                closeable: true,
                                                replace: false,
                                                group: "emailAccounts"
                                            });
                                            emailAccount.isLoading = false;
                                        });
                                } else {
                                    emailAccount.isLoading = false;
                                    return _scrollToArea();
                                }
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    replace: false,
                                    group: "emailAccounts"
                                });
                                emailAccount.isLoading = false;
                                emailAccount.backToListView();
                            });

                    }

                    /**
                     * Called when stay on page checkbox changed
                     * @method stayOnPageChanged
                     */
                    emailAccount.stayOnPageChanged = function() {

                        if (emailAccount.stayOnView) {
                            localStorage.setItem(
                                storageKeys.stayOnPage,
                                PAGE.securityToken + ":" + "true"
                            );
                        } else {

                            // clear local storage
                            localStorage.removeItem(storageKeys.stayOnPage);
                        }
                    };

                    /**
                     * Toggles help text on view
                     * @method toggleHelp
                     */
                    emailAccount.toggleHelp = function() {
                        $scope.showAllHelp = !$scope.showAllHelp;
                        emailAccount.saveToComponentSettings();
                        $scope.$broadcast("showHideAllChange", $scope.showAllHelp);
                    };

                    /**
                     * Returns the correct text for how many messages are held.
                     * This is done here so that the JS logic for quant will work properly. If
                     * this was done in the template, the template toolkit logic only works on initial load
                     * and would not change if the value passed in changes.
                     *
                     * @param {number} number - the number of messages that are being held
                     * @return {string} a localized string
                     *
                     */
                    emailAccount.currentlyHeldMessageText = function(number) {
                        return LOCALE.maketext("Delete [quant,_1,message,messages] from the mail queue.", number);
                    };

                    /**
                     * Called when update is clicked
                     * @method update
                     * @param {Object} emailDetails email account details
                     */
                    emailAccount.update = function(emailDetails) {

                        emailAccount.frmManageAccount.$submitted = true;

                        if (!emailAccount.frmManageAccount.$valid || emailAccount.frmManageAccount.$pending) {
                            return;
                        }
                        if ( emailDetails.quotaType === "unlimited" && !$scope.canSetUnlimited ) {
                            emailDetails.quota = $scope.maxQuota;
                        } else if (emailDetails.quotaType === "unlimited") {
                            emailDetails.quota = 0;
                        }

                        return emailAccountsService.updateEmail(currentAccountState, emailDetails, emailAccount.currentSuspendedState, emailAccount.suspendOptions)
                            .then(function(data) {
                                var successCount = 0;
                                var successObj = [];

                                _.forEach(data, function(obj) {
                                    if (obj.type === "danger") {
                                        alertService.add({
                                            type: obj.type,
                                            message: obj.message,
                                            closeable: true,
                                            replace: false,
                                            autoClose: obj.autoClose,
                                            group: "emailAccounts"
                                        });
                                    } else if (obj.type === "success") {
                                        successObj.push(obj);
                                        successCount = successCount + 1;
                                    }
                                });

                                if (successCount) {
                                    if (successCount > 1) {
                                        alertService.add({
                                            type: "success",
                                            message: LOCALE.maketext("All of your changes to “[_1]” are saved.", emailDetails.email),
                                            closeable: true,
                                            replace: false,
                                            autoClose: 10000,
                                            group: "emailAccounts"
                                        });
                                    } else {
                                        alertService.add({
                                            type: "success",
                                            message: successObj[0].message,
                                            closeable: true,
                                            replace: false,
                                            autoClose: 10000,
                                            group: "emailAccounts"
                                        });
                                    }


                                    if (emailAccount.stayOnView) {
                                        emailAccount.isLoading = true;
                                        emailAccount.frmManageAccount.$setPristine();
                                        resetData();
                                        initialize();
                                    } else {
                                        emailAccount.backToListView();
                                    }

                                }
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error.message,
                                    closeable: true,
                                    replace: false,
                                    group: "emailAccounts"
                                });
                            });
                    };

                    /**
                     * Delete email account
                     * @method delete
                     * @param {string} email
                     */
                    emailAccount.delete = function(email) {
                        return emailAccountsService.deleteEmail(email)
                            .then(function() {
                                alertService.add({
                                    type: "success",
                                    message: LOCALE.maketext("You deleted “[_1]”.", email),
                                    closeable: true,
                                    replace: false,
                                    autoClose: 10000,
                                    group: "emailAccounts"
                                });

                                emailAccount.backToListView();

                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    replace: false,
                                    group: "emailAccounts"
                                });
                            });
                    };

                    /**
                     * Back to List View
                     * @method backToListView
                     */
                    emailAccount.backToListView = function() {
                        $location.path("/list");
                    };

                    $scope.$on("$destroy", function() {
                        componentSettingSaverService.unregister(COMPONENT_NAME);
                        localStorage.removeItem(storageKeys.stayOnPage);
                    });

                    initialize();

                }
            ]
        );

        return controller;
    }
);

/*
# email_accounts/views/mnageDefault.js               Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define, PAGE */

define(
    'app/views/manageDefault',[
        "angular",
        "lodash",
        "cjt/util/locale",
        "cjt/util/parse",
        "uiBootstrap",
        "app/services/emailAccountsService",
        "app/filters/encodeURIComponent",
        "cjt/services/alertService",
        "cjt/directives/alert",
        "cjt/directives/alertList",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/toggleSwitchDirective",
        "cjt/directives/toggleLabelInfoDirective",
        "cjt/directives/validationContainerDirective",
        "cjt/directives/validationItemDirective"
    ],
    function(angular, _, LOCALE, parse) {
        "use strict";

        var app = angular.module("cpanel.emailAccounts");
        app.value("PAGE", PAGE);

        /**
         * Manage default account controller for Email
         *
         * @module ManageController
         */
        var controller = app.controller(
            "ManageDefaultController",
            ["$scope", "$location", "emailAccountsService", "PAGE", "alertService", "$q",
                function($scope, $location, emailAccountsService, PAGE, alertService, $q) {

                    var emailAccount = this;
                    emailAccount.isLoading = true;
                    emailAccount.isRTL = PAGE.isRTL;

                    $scope.showAllHelp = false;

                    emailAccount.email = PAGE.mainEmailAccount;
                    emailAccount.webmailEnabled = parse.parseBoolean(PAGE.webmailEnabled);
                    emailAccount.emailDiskUsageEnabled = PAGE.emailDiskUsageEnabled;
                    emailAccount.defaultAddressEnabled = PAGE.defaultAddressEnabled;
                    emailAccount.dprefix = PAGE.dprefix;

                    /**
                     * Initialize
                     * @method initialize
                     */
                    function initialize() {

                        var getDefaultAccountusage = emailAccountsService.getDefaultAccountUsage()
                            .then(function(data) {
                                emailAccount.diskUsage = data;
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    replace: false,
                                    group: "emailAccounts"
                                });
                                emailAccount.backToListView();
                            });

                        var isSharedAddressBookEnabled = emailAccountsService.isSharedAddressBookEnabled()
                            .then(function(data) {
                                emailAccount.shareAddressBook = parse.parsePerlBoolean(data.shared);
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    replace: false,
                                    group: "emailAccounts"
                                });
                                emailAccount.backToListView();
                            });

                        var isUTF8MailboxNamesEnabled = emailAccountsService.isUTF8MailboxNamesEnabled()
                            .then(function(data) {
                                emailAccount.UTF8Mailbox = parse.parsePerlBoolean(data.enabled);
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    replace: false,
                                    group: "emailAccounts"
                                });
                                emailAccount.backToListView();
                            });

                        $q.all([getDefaultAccountusage, isSharedAddressBookEnabled, isUTF8MailboxNamesEnabled]).then(function() {
                            emailAccount.isLoading = false;
                        });
                    }

                    /**
                     * Show/hide help text
                     * @method toggleHelp
                     */
                    emailAccount.toggleHelp = function() {
                        $scope.showAllHelp = !$scope.showAllHelp;
                        $scope.$broadcast("showHideAllChange", $scope.showAllHelp);
                    };

                    /**
                     * Toggle shared address book state
                     * @method toggleSharedAddressBookStatus
                     */
                    emailAccount.toggleSharedAddressBookStatus = function() {
                        emailAccount.shareAddressBook = !emailAccount.shareAddressBook;

                        if (emailAccount.shareAddressBook) {
                            return emailAccountsService.enableSharedAddressBook()
                                .then(function(response) {
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("All of your email accounts can access the system-managed [output,em,Shared Address Book]."),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "emailAccounts"
                                    });
                                }, function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        replace: false,
                                        group: "emailAccounts"
                                    });
                                    emailAccount.backToListView();
                                });
                        } else {
                            return emailAccountsService.disableSharedAddressBook()
                                .then(function(response) {
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("Only your default email address can access the system-managed [output,em,Shared Address Book]."),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "emailAccounts"
                                    });
                                }, function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        replace: false,
                                        group: "emailAccounts"
                                    });
                                    emailAccount.backToListView();
                                });
                        }

                    };

                    /*
                     * Toggle UTF-8 mailbox support
                     * @method toggleUTF8MailboxNames
                     */
                    emailAccount.toggleUTF8MailboxNames = function() {
                        emailAccount.UTF8Mailbox = !emailAccount.UTF8Mailbox;

                        if (emailAccount.UTF8Mailbox) {
                            return emailAccountsService.enableUTF8MailboxNames()
                                .then(function(response) {
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("Mailbox names will now save as [asis,UTF-8]."),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "emailAccounts"
                                    });
                                }, function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        replace: false,
                                        group: "emailAccounts"
                                    });
                                    emailAccount.backToListView();
                                });
                        } else {
                            return emailAccountsService.disableUTF8MailboxNames()
                                .then(function(response) {
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("Mailbox names will no longer save as [asis,UTF-8]."),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "emailAccounts"
                                    });
                                }, function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        replace: false,
                                        group: "emailAccounts"
                                    });
                                    emailAccount.backToListView();
                                });
                        }

                    };

                    /**
                     * Back to List View
                     * @method backToListView
                     */
                    emailAccount.backToListView = function() {
                        $location.path("/list");
                    };

                    initialize();

                }
            ]
        );

        return controller;
    }
);

/*
# email_accounts/index.js                            Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/
/* global require: false, define: false, PAGE: false */

define(
    'app/index',[
        "angular",
        "cjt/core",
        "cjt/modules",
        "cjt/util/locale",
        "ngRoute",
        "uiBootstrap",
        "cjt/services/alertService",
        "cjt/directives/alert",
        "cjt/directives/alertList",
        "cjt/directives/callout",
        "app/services/emailAccountsService",
        "jquery-chosen",
        "angular-chosen"
    ],
    function(angular, LOCALE) {

        "use strict";

        return function() {

            // First create the application
            angular.module("cpanel.emailAccounts", [
                "ngRoute",
                "ui.bootstrap",
                "cjt2.cpanel",
                "cjt2.services.api",
                "cpanel.emailAccounts.service",
                "localytics.directives",
                "cjt2.directives.bytesInput"
            ]);

            // Then load the application dependencies
            var app = require(
                [
                    "cjt/bootstrap",
                    "cjt/util/locale",
                    "cjt/directives/breadcrumbs",
                    "app/services/emailAccountsService",
                    "app/filters/encodeURIComponent",
                    "app/views/list",
                    "app/views/create",
                    "app/views/manage",
                    "app/views/manageDefault"
                ], function(BOOTSTRAP, LOCALE) {

                    var app = angular.module("cpanel.emailAccounts");
                    app.value("PAGE", PAGE);
                    app.constant("ONE_MEBIBYTE", 1048576);

                    app.firstLoad = true;

                    app.config([
                        "$routeProvider",
                        function($routeProvider) {
                            $routeProvider.when("/list/:account?", {
                                controller: "ListController",
                                controllerAs: "emailAccounts",
                                templateUrl: "views/list.ptt",
                                breadcrumb: {
                                    id: "list",
                                    name: LOCALE.maketext("List Email Accounts"),
                                    path: "/list"
                                }
                            });

                            $routeProvider.when("/create/:domain?", {
                                controller: "CreateController",
                                controllerAs: "emailAccount",
                                templateUrl: "views/create.ptt",
                                breadcrumb: {
                                    id: "create",
                                    name: LOCALE.maketext("Create an Email Account"),
                                    path: "/create/",
                                    parentID: "list"
                                }
                            });

                            $routeProvider.when("/manage/:emailAccount/:scrollTo?", {
                                controller: "ManageController",
                                controllerAs: "emailAccount",
                                templateUrl: "views/manage.ptt",
                                breadcrumb: {
                                    id: "manage",
                                    name: LOCALE.maketext("Manage an Email Account"),
                                    path: "/manage/",
                                    parentID: "list"
                                }
                            });

                            $routeProvider.when("/manageDefault/", {
                                controller: "ManageDefaultController",
                                controllerAs: "emailAccount",
                                templateUrl: "views/manageDefault.ptt",
                                breadcrumb: {
                                    id: "manageDefault",
                                    name: LOCALE.maketext("Manage Default Email Account"),
                                    path: "/manageDefault/",
                                    parentID: "list"
                                }
                            });

                            $routeProvider.otherwise({
                                "redirectTo": "/list"
                            });
                        }
                    ]);

                    BOOTSTRAP("#content", "cpanel.emailAccounts");

                });

            return app;
        };
    }
);

