/*
* base/frontend/paper_lantern/jetbackup/filters/backupLocaleString.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

/* global define: false */

define(
    [
        "angular",
        "cjt/util/locale"
    ],
    function(angular, LOCALE) {

        var module;

        try {
            module = angular.module("cpanel.jetbackup");
        }
        catch(e) {
            module = angular.module("cpanel.jetbackup", []);
        }

        module.filter("backupLocaleString", function (){
            return function(backup, localeString) {
                return LOCALE.makevar(localeString, backup);
            };
        });

    }
);