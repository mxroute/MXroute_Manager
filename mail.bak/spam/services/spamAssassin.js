/*
 * mail/spam/services/spamAssassin.js                 Copyright 2018 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define, PAGE */
define(
    [
        "angular",
        "lodash",
        "cjt/util/locale",
        "cjt/io/uapi-request",
        "cjt/io/uapi",
        "cjt/services/APICatcher",
        "cjt/services/alertService"
    ],
    function(angular, _, LOCALE, APIREQUEST) {

        "use strict";

        var app = angular.module("cpanel.apacheSpamAssassin.spamAssassin.service", []);
        app.value("PAGE", PAGE);

        app.factory("spamAssassin", ["$q", "$filter", "APICatcher", "PAGE", "alertService", function($q, $filter, APICatcher, PAGE, alertService) {

            var SpamAssassin = function() {};

            var SPAM_BOX_FOLDER_NAME = "INBOX.spam";
            var _defaultAutoDeleteScore = 5;
            var _defaultRequiredScore = 5;
            var _settingsBooleanKeys = ["rewrites_subjects", "spam_as_acl", "spam_auto_delete", "spam_box_enabled", "spam_enabled", "spam_status_changeable"];

            SpamAssassin.prototype = APICatcher;

            function _alertSuccess(message) {
                alertService.add({
                    message: message,
                    type: "success",
                    replace: false
                });
            }

            /* APIs */

            function getSpamAssassinSettings() {
                var self = this;
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("Email", "get_spam_settings");

                return self.promise(apiCall).then(function(result) {
                    var settings = result.data;
                    angular.forEach(settings, function(value, key) {
                        if (key === "spam_auto_delete_score") {
                            self.spamAssassinSettings[key] = parseInt(value, 10);
                            self.spamAssassinSettings[key] = isNaN(self.spamAssassinSettings[key]) ? _defaultAutoDeleteScore : self.spamAssassinSettings[key];
                        } else if (_settingsBooleanKeys.indexOf(key) !== -1) {
                            self.spamAssassinSettings[key] = value.toString() === "1";
                        } else {
                            self.spamAssassinSettings[key] = settings[key];
                        }

                    });
                    return self.spamAssassinSettings;
                });
            }

            function enableSpamAssassin() {
                var self = this;
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("Email", "enable_spam_assassin");

                return self.promise(apiCall).then(function(result) {
                    self.spamAssassinSettings.spam_enabled = true;
                    _alertSuccess(LOCALE.maketext("[asis,Apache SpamAssassin] has been enabled."));
                    return result;
                });
            }

            function disableSpamAssassin() {
                var self = this;
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("Email", "disable_spam_assassin");

                return self.promise(apiCall).then(function(result) {
                    self.spamAssassinSettings.spam_enabled = false;
                    _alertSuccess(LOCALE.maketext("[asis,Apache SpamAssassin] has been disabled."));
                    if (self.spamAssassinSettings.spam_box_enabled) {
                        self.disableSpamBox();
                    }
                    if (self.spamAssassinSettings.spam_auto_delete) {
                        self.disableAutoDelete();
                    }
                    return result;
                });
            }

            function getSymbolicTestNames() {
                var self = this;
                if (self.symbolicTestNames.length) {
                    return $q.resolve(self.symbolicTestNames);
                }

                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("SpamAssassin", "get_symbolic_test_names");

                return self.promise(apiCall).then(function(result) {
                    self.symbolicTestNames = result.data.map(function(testName) {
                        return {
                            "key": testName.key,
                            "rule_type": testName.rule_type,
                            "score": testName.score
                        };
                    });
                    return self.symbolicTestNames;
                });
            }

            /* AutoDelete APIs */

            function enableAutoDelete(requiredScore) {
                var self = this;
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("Email", "add_spam_filter", {
                    required_score: requiredScore
                });

                function _done(result) {
                    if (self.spamAssassinSettings.spam_auto_delete) {

                        // was already enabled, must be updated the auto-delete score
                        _alertSuccess(LOCALE.maketext("The Auto-Delete Threshold Score has been updated to [_1].", requiredScore));
                    } else {
                        _alertSuccess(LOCALE.maketext("Spam Auto-Delete has been enabled."));
                    }
                    self.spamAssassinSettings.spam_auto_delete = true;
                    self.spamAssassinSettings.spam_auto_delete_score = requiredScore;
                    return result;
                }

                if (!self.spamAssassinSettings.spam_enabled) {
                    return self.enableSpamAssassin().then(function() {
                        return self.promise(apiCall).then(_done);
                    });
                } else {
                    return this.promise(apiCall).then(_done);
                }
            }

            function disableAutoDelete() {
                var self = this;
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("Email", "disable_spam_autodelete");

                return this.promise(apiCall).then(function(result) {
                    self.spamAssassinSettings.spam_auto_delete = false;
                    _alertSuccess(LOCALE.maketext("Spam Auto-Delete has been disabled."));
                    return result;
                });
            }

            /* SpamBox APIs */

            function enableSpamBox() {
                var self = this;
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("Email", "enable_spam_box");

                function _done(result) {
                    self.spamAssassinSettings.spam_box_enabled = true;
                    _alertSuccess(LOCALE.maketext("Spam Box has been enabled."));
                    return result;
                }

                if (!self.spamAssassinSettings.spam_enabled) {
                    return self.enableSpamAssassin().then(function() {
                        return self.promise(apiCall).then(_done);
                    });
                } else {
                    return this.promise(apiCall).then(_done);
                }
            }

            function disableSpamBox() {
                var self = this;
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("Email", "disable_spam_box");

                return this.promise(apiCall).then(function(result) {
                    self.spamAssassinSettings.spam_box_enabled = false;
                    _alertSuccess(LOCALE.maketext("Spam Box has been disabled."));
                    return result;
                });
            }

            function clearSpamBoxFolder() {
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("Mailboxes", "expunge_mailbox_messages", {
                    account: _getCpanelUser(),
                    query: "all",
                    mailbox: SPAM_BOX_FOLDER_NAME
                });

                return this.promise(apiCall).then(function(result) {
                    _alertSuccess(LOCALE.maketext("Expunged the Spam Box folder for “[_1]”.", _getCpanelUser()));
                    return result;
                });
            }

            function clearAllSpamBoxFolders() {
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("SpamAssassin", "clear_spam_box");

                return this.promise(apiCall).then(function(result) {
                    _alertSuccess(LOCALE.maketext("All Spam Box folders expunged."));
                    return result;
                });
            }

            function getSpamBoxSize() {
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("Mailboxes", "get_mailbox_status_list", {
                    account: _getCpanelUser()
                });

                apiCall.addFilter("mailbox", "eq", SPAM_BOX_FOLDER_NAME);

                return this.promise(apiCall).then(function(result) {
                    var box = result.data.shift();
                    if (!box) {
                        return 0;
                    }
                    var parsedValue = parseInt(box.vsize, 10);
                    return isNaN(parsedValue) ? 0 : parsedValue;
                });
            }

            /* configurationAPIs */

            function _parseUserPreferences(preferences) {
                var self = this;
                if (!preferences) {
                    return self.userPreferences;
                }
                angular.forEach(preferences, function(setting, key) {
                    if (key === "required_score") {
                        self.userPreferences[key] = Number(setting.shift(), 10) || _defaultRequiredScore;
                        self.userPreferences[key] = isNaN(self.userPreferences[key]) ? _defaultRequiredScore : self.userPreferences[key];
                    } else if (key === "score") {
                        self.userPreferences[key] = setting.filter(function(score) {

                            // We only want valid scores, those containing a key, and one, or four scores
                            var scoreSplit = score.trim().split(/\s+/);
                            return scoreSplit.length === 2 || scoreSplit.length === 5;
                        }).map(function(score) {

                            // If a score is a key and four scores, we only want the last
                            // beacuse in cPanel we always have bayes and network tests enabled
                            var scoreSplit = score.trim().split(/\s+/);
                            return scoreSplit.shift() + " " + scoreSplit.pop();
                        });
                    } else {
                        self.userPreferences[key] = setting;
                    }
                });

                return self.userPreferences;
            }

            function getUserPreferences() {
                var self = this;
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("SpamAssassin", "get_user_preferences");

                return this.promise(apiCall).then(function(result) {
                    self.userPreferences.whitelist_from = [];
                    self.userPreferences.blacklist_from = [];
                    self.userPreferences.required_score = 5;
                    self.userPreferences.score = [];
                    return self._parseUserPreferences(result.data);
                });
            }

            function updateUserPreference(key, values) {
                var self = this;
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("SpamAssassin", "update_user_preference", { preference: key });
                apiCall.addArgument("value", values);

                return this.promise(apiCall).then(function(result) {
                    _alertSuccess(LOCALE.maketext("The [asis,Apache SpamAssassin] user preferences have been updated."));
                    return self._parseUserPreferences(result.data);
                });
            }

            /* Other Data Functions */

            function _getCpanelUser() {
                return PAGE.user;
            }

            function hasFeature(feature) {
                if (feature === "spamBox") {
                    return PAGE.feature_spam_box.toString() === "1";
                } else if (feature === "spamAutoDelete") {
                    return PAGE.feature_spam_assassin.toString() === "1";
                }

                return true;
            }

            function getValidRoutes(routes) {
                return _.filter(routes, function(route) {
                    return hasFeature(route.id);
                });
            }

            angular.extend(SpamAssassin.prototype, {
                symbolicTestNames: [],
                spamAssassinSettings: {},
                userPreferences: {},
                _parseUserPreferences: _parseUserPreferences,
                hasFeature: hasFeature,
                getValidRoutes: getValidRoutes.bind(SpamAssassin.prototype),
                getSpamAssassinSettings: getSpamAssassinSettings.bind(SpamAssassin.prototype),
                enableSpamAssassin: enableSpamAssassin.bind(SpamAssassin.prototype),
                disableSpamAssassin: disableSpamAssassin.bind(SpamAssassin.prototype),
                enableAutoDelete: enableAutoDelete.bind(SpamAssassin.prototype),
                disableAutoDelete: disableAutoDelete.bind(SpamAssassin.prototype),
                enableSpamBox: enableSpamBox.bind(SpamAssassin.prototype),
                disableSpamBox: disableSpamBox.bind(SpamAssassin.prototype),
                getSpamBoxSize: getSpamBoxSize.bind(SpamAssassin.prototype),
                clearSpamBoxFolder: clearSpamBoxFolder.bind(SpamAssassin.prototype),
                getUserPreferences: getUserPreferences.bind(SpamAssassin.prototype),
                updateUserPreference: updateUserPreference.bind(SpamAssassin.prototype),
                getSymbolicTestNames: getSymbolicTestNames.bind(SpamAssassin.prototype),
                clearAllSpamBoxFolders: clearAllSpamBoxFolders.bind(SpamAssassin.prototype)
            });

            return new SpamAssassin();
        }]);
    }
);
