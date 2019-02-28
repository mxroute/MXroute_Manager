/*
# file_and_directory_restoration/services/backupAPI.js             Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular",
        "cjt/util/locale",
        "cjt/util/parse",
        "cjt/io/uapi-request",
        "cjt/services/APIService",
        "cjt/io/uapi", // IMPORTANT: Load the driver so it's ready
    ],
    function(angular, LOCALE, PARSE, APIREQUEST) {
        "use strict";
        var app;
        try {
            app = angular.module("App"); // For runtime
        } catch (e) {
            app = angular.module("App", []); // Fall-back for unit testing
        }

        app.factory("backupAPIService", [
            "APIService",
            function(
                APIService
            ) {
                var validBackupTypes = {
                    "compressed": LOCALE.maketext("Compressed"),
                    "uncompressed": LOCALE.maketext("Uncompressed"),
                    "incremental": LOCALE.maketext("Incremental")
                };

                var validTypes = {
                    "file": LOCALE.maketext("File"),
                    "dir": LOCALE.maketext("Directory"),
                    "symlink": LOCALE.maketext("Symlink")
                };

                /**
                 * Parse raw data for consumption by front end
                 *
                 * @private
                 * @method parseBackupData
                 * @param  {object} backupData - raw data object
                 * @return {object} parsed data for front end
                 */
                function parseBackupData(backupData) {
                    var backups = backupData.data;
                    var parsedBackups = [];

                    backups.forEach(function(backup) {

                        // using "datetime_format_medium" doesn't work in cPanel if you
                        // are operating in debug mode (works in non-debug mode)
                        backup.lastModifiedTime = LOCALE.local_datetime(parseInt(backup.mtime, 10), "datetime_format_short");
                        if (validBackupTypes.hasOwnProperty(backup.backupType)) {
                            backup.backupType = validBackupTypes[backup.backupType];
                            backup.type = validTypes[backup.type];
                        } else {
                            throw "DEVELOPER ERROR: Invalid backup type";
                        }
                        parsedBackups.push(backup);
                    });

                    return parsedBackups;
                }

                function parseDirectoryContents(directoryContents) {
                    var parsedContents = [];

                    directoryContents.data.forEach(function(content) {
                        content.conflict = PARSE.parsePerlBoolean(content.conflict);
                        content.exists = PARSE.parsePerlBoolean(content.exists);
                        parsedContents.push(content);
                    });
                    directoryContents.data = parsedContents;
                    return directoryContents;
                }

                // Set up the service's constructor and parent
                var BackupAPIService = function() {};
                BackupAPIService.prototype = new APIService();

                // Extend the prototype with any class-specific functionality
                angular.extend(BackupAPIService.prototype, {

                    /**
                     * Get a list of all directories and files of a given path
                     * @public
                     * @method listDirectoryContents
                     * @param {string} path The full path of the directory
                     * @param {string} currentPage The current page of pagination
                     * @param {string} pageSize Number of items in each page requested
                     * @return {Promise} Promise that will fulfill the request.
                     */
                    listDirectoryContents: function(path, currentPage, pageSize) {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("Restore", "directory_listing");
                        apiCall.addArgument("path", path);

                        if (pageSize) {
                            apiCall.addPaging(currentPage, pageSize);
                        }
                        var deferred = this.deferred(apiCall, {
                            transformAPISuccess: parseDirectoryContents,

                            transformAPIFailure: function(response) {
                                return response.error;
                            }
                        });

                        return deferred.promise;
                    },

                    /**
                     * Get all backups of a particular file or directory
                     * @public
                     * @method listBackups
                     * @param {string} fullPath The full path of the file
                     * @return {Promise} Promise that will fulfill the request.
                     */
                    listBackups: function(fullPath, exists) {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("Restore", "query_file_info");
                        apiCall.addArgument("path", fullPath);
                        apiCall.addArgument("exists", exists);

                        var deferred = this.deferred(apiCall, {
                            transformAPISuccess: parseBackupData,

                            transformAPIFailure: function(response) {
                                return response.error;
                            }
                        });

                        return deferred.promise;
                    },

                    /**
                     * Restore a single file or a directory
                     * @public
                     * @method restoreBackup
                     * @param {string} fullPath The full path of the file
                     * @param {string} backupID The identification string for backup
                     * @return {Promise} Promise that will fulfill the request.
                     */
                    restoreBackup: function(fullPath, backupID) {
                        var apiCall = new APIREQUEST.Class();
                        apiCall.initialize("Restore", "restore_file");
                        apiCall.addArgument("backupID", backupID);
                        apiCall.addArgument("path", fullPath);
                        apiCall.addArgument("overwrite", 1);

                        var deferred = this.deferred(apiCall, {
                            transformAPISuccess: function(response) {
                                return response.data;
                            },
                            transformAPIFailure: function(response) {
                                return response.error;
                            }
                        });

                        return deferred.promise;
                    },
                });

                return new BackupAPIService();
            }
        ]);
    }
);
