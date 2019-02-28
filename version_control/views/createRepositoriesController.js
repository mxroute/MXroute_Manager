/*
# version_control/views/CreateRepositoriesController.js      Copyright 2017 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define, PAGE */

define(
    [
        "angular",
        "cjt/util/locale",
        "uiBootstrap",
        "app/services/versionControlService",
        "cjt/services/alertService",
        "cjt/directives/alert",
        "cjt/directives/alertList",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/toggleSwitchDirective",
        "cjt/directives/toggleLabelInfoDirective",
        "app/services/versionControlService",
        "cjt/directives/validationContainerDirective",
        "cjt/directives/validationItemDirective",
        "cjt/validator/ascii-data-validators",
        "cjt/validator/path-validators",
        "app/services/directoryLookupService",
        "app/directives/cloneURLValidator",
        "cjt/filters/htmlFilter"
    ],
    function(angular, LOCALE) {
        "use strict";

        var app = angular.module("cpanel.versionControl");
        app.value("PAGE", PAGE);

        var controller = app.controller(
            "CreateRepositoriesController",
            ["$scope", "$location", "versionControlService", "PAGE", "alertService", "directoryLookupService",
                function($scope, $location, versionControlService, PAGE, alertService, directoryLookupService) {

                    var repository = this;

                    // home directory path
                    repository.homeDirPath = PAGE.homeDir + "/";

                    repository.displaySuccessSummary = false;

                    // initialize form data
                    repository.formData = {
                        repoName: "",
                        repoPath: "",
                        clone: true,
                        cloneURL: "",
                        createAnother: false
                    };

                    repository.pathExcludeList = "[^'\":\\\\*?<>|@&=%#`$(){};\\[\\]\\s]+";// This is for angular input validation.
                    var directoryLookupFilter = /[%*{}()=?`$@:|[\]'"<>&#;\s\\]+/g;// This is the same regex for directory lookup service filter.

                    /**
                     * Back to List View
                     * @method backToListView
                     */
                    repository.backToListView = function() {
                        $location.path("/list");
                    };

                    /**
                     * Reset Form Data
                     * @method resetFormData
                     */
                    repository.resetFormData = function() {
                        repository.formData = {
                            repoName: "",
                            repoPath: "",
                            clone: true,
                            cloneURL: "",
                            createAnother: false
                        };
                        repository.createRepoForm.$setPristine();
                    };

                    /**
                     * Create Repository
                     * @method createRepository
                     * @return {Promise} returns promise.
                     */
                    repository.createRepository = function() {

                        if (repository.formData.repoName &&
                            repository.formData.repoPath) {

                            var repositoryPath = repository.homeDirPath + repository.formData.repoPath;

                            if (!repository.formData.clone) {
                                repository.formData.cloneURL = null;
                            }

                            return versionControlService.createRepository(
                                repository.formData.repoName,
                                repositoryPath,
                                repository.formData.cloneURL).then(function(response) {

                                // Clone Repository Success
                                if (repository.formData.cloneURL) {
                                    alertService.add({
                                        type: "info",
                                        message: LOCALE.maketext("The system successfully initiated the clone process for the “[_1]” repository.", repository.formData.repoName) + " " + LOCALE.maketext("The system may require more time to clone large remote repositories."),
                                        closeable: true,
                                        replace: false,
                                        group: "versionControl",
                                        id: response.cloneTaskID,
                                        counter: false
                                    });

                                    if (!repository.formData.createAnother) {
                                        repository.backToListView();
                                    } else {
                                        repository.resetFormData();
                                    }

                                } else {

                                    // Create repository Success
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("The system successfully created the “[_1]” repository.", repository.formData.repoName),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "versionControl"
                                    });

                                    if (!repository.formData.createAnother) {
                                        var repoSummary = response;
                                        var cloneURL = repoSummary.cloneURL;

                                        if (typeof cloneURL !== "undefined" && cloneURL) {
                                            repository.displaySuccessSummary = true;

                                            repository.summary = {};
                                            repository.summary.remoteURL = cloneURL;
                                            var parts = repository.summary.remoteURL.split("/");

                                            if (parts && parts.length > 0) {
                                                repository.summary.directoryName = parts[parts.length - 1];
                                            } else {
                                                repository.summary.directoryName = "";
                                            }

                                            repository.summary.readOnly = repoSummary.clone_urls.read_write.length === 0 ? true : false;
                                        } else {
                                            repository.backToListView();
                                        }
                                    } else {
                                        repository.resetFormData();
                                    }
                                }

                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    replace: false,
                                    group: "versionControl"
                                });
                            });
                        }
                    };

                    /**
                     * Directory lookup
                     * @method completeDirectory
                     * @return {Promise} Returns an array of directory paths.
                     */
                    repository.completeDirectory = function(prefix) {
                        var directoryLookupPromise = directoryLookupService.complete(prefix);
                        var outputDirectories = [];

                        return directoryLookupPromise.then(function(directories) {

                            for ( var i = 0, len = directories.length; i < len; i++ ) {

                                var directoryName = directories[i];

                                if ( directoryName.search(directoryLookupFilter) === -1 ) {
                                    outputDirectories.push(directoryName);
                                }
                            }

                            return outputDirectories;
                        });
                    };

                    /**
                     * Toggle Status
                     * @method toggleStatus
                     * @return {Boolean} Returns true.
                     */
                    repository.toggleStatus = function() {
                        repository.formData.clone = !repository.formData.clone;
                        return true;
                    };

                    /**
                     * Autofill Repository path and name based on clone url
                     * @method autoFillPathAndName
                     */
                    repository.autoFillPathAndName = function() {
                        if (!repository.formData.repoName && !repository.formData.repoPath) {
                            if (repository.createRepoForm.repoCloneURL.$valid && repository.formData.cloneURL) {
                                var cloneUrl = repository.formData.cloneURL;
                                var repoPathPrefix = "repositories/";

                                // Removing training slash
                                cloneUrl = cloneUrl.replace(/\/+$/, "");

                                // finding last part of the url and replacing .git if present
                                var repoDirectory = cloneUrl.substr(cloneUrl.lastIndexOf("/") + 1).replace(".git", "");
                                repoDirectory = repoDirectory.replace(directoryLookupFilter, "_");

                                var repositoryPath = repoPathPrefix + repoDirectory;
                                repository.formData.repoPath = repositoryPath;
                                repository.formData.repoName = repoDirectory;
                            }
                        }
                    };
                }
            ]
        );

        return controller;
    }
);
