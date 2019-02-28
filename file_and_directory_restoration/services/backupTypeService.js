/*
# file_and_directory_restoration/services/backupAPI.js
#                                                    Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular"
    ],
    function(angular) {
        "use strict";

        var app;
        try {
            app = angular.module("App"); // For runtime
        } catch (e) {
            app = angular.module("App", []); // Fall-back for unit testing
        }

        app.factory("backupTypeService", function() {
            var backupType;

            return {

                /**
                 * Get the type of backup selected
                 *
                 * @method getBackupType
                 * @return {String} - describes the backup type selected (dir, file, symlink)
                 * @throw {String} - error indicating that backup type is not defined
                 */
                getBackupType: function() {

                    if (backupType) {
                        return backupType;
                    } else {
                        throw "DEVELOPER ERROR: backup type is not defined";
                    }

                },

                /**
                 * Set the backup type
                 *
                 * @method setBackupType
                 * @param  {String} backupTypeSelected - backup type selected
                 * @return {String} - backup type selected
                 */
                setBackupType: function(backupTypeSelected) {
                    if (!backupTypeSelected || typeof backupTypeSelected !== "string") {
                        throw "DEVELOPER ERROR: backup type is not valid";
                    }
                    backupType = backupTypeSelected;
                    return backupType;
                }
            };
        });
    });
