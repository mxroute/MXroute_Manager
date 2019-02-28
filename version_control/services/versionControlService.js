/*
 * versionControlService.js                           Copyright 2017 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false, PAGE: false */
define(
    [
        "angular",
        "cjt/util/locale",
        "cjt/util/parse",
        "cjt/io/uapi-request",
        "cjt/io/api",
        "cjt/io/uapi",
        "cjt/services/APIService",
        "cjt/filters/qaSafeIDFilter"
    ],
    function(angular, LOCALE, PARSE, UAPIREQUEST) {
        "use strict";

        var app = angular.module("cpanel.versionControl.service", []);
        app.value("PAGE", PAGE);

        app.factory("versionControlService", [
            "$q",
            "APIService",
            "$filter",
            "PAGE",
            "$timeout",
            "$rootScope",
            function($q, APIService, $filter, PAGE, $timeout, $rootScope) {

                var VersionControlService = function() {};
                var repos = [];

                var fileManagerPath = PAGE.fileManagerURL;
                var gitWebPath = PAGE.gitwebURL;

                /* Parse Head commit information
                * @method parseHeadCommitInformation
                * @params {Object} repoInfo Repository Information
                * @return {Object} Returns head commit information
                */
                function parseHeadCommitInformation(repoInfo) {

                    // HEAD commit
                    var commitInfo = {};

                    commitInfo.lastUpdateSHA = LOCALE.maketext("Not available.");
                    commitInfo.lastUpdateDate = LOCALE.maketext("Not available.");
                    commitInfo.commitMessage = LOCALE.maketext("Not available.");
                    commitInfo.author = LOCALE.maketext("Not available.");
                    commitInfo.hasHeadInformation = false;

                    if (typeof repoInfo.last_update !== "undefined" && repoInfo.last_update) {

                        commitInfo.hasHeadInformation = true;

                        if (typeof repoInfo.last_update.identifier !== "undefined" &&
                            repoInfo.last_update.identifier) {
                            commitInfo.lastUpdateSHA = repoInfo.last_update.identifier;
                        }

                        if (typeof repoInfo.last_update.date !== "undefined" &&
                            repoInfo.last_update.date) {
                            commitInfo.lastUpdateDate = getHumanReadableTime(repoInfo.last_update.date);
                        }

                        if (typeof repoInfo.last_update.author !== "undefined" &&
                            repoInfo.last_update.author) {
                            commitInfo.author = repoInfo.last_update.author;
                        }

                        if (typeof repoInfo.last_update.message !== "undefined" &&
                            repoInfo.last_update.message) {
                            commitInfo.commitMessage = repoInfo.last_update.message;
                        }
                    }

                    return commitInfo;
                }

                /* Parse Last Deployed Information
                * @method parseLastDeployedInformation
                * @params {Object} repoInfo Repository Information
                * @return {Object} Returns last deployed information
                */
                function parseLastDeployedInformation(repoInfo) {

                    var deployedInfo = {};

                    // last deployed information
                    deployedInfo.hasDeploymentInformation = false;
                    deployedInfo.lastDeployedSHA = LOCALE.maketext("Not available.");
                    deployedInfo.lastDeployedDate = LOCALE.maketext("Not available.");
                    deployedInfo.lastDeployedCommitDate = LOCALE.maketext("Not available.");
                    deployedInfo.lastDeployedCommitMessage = LOCALE.maketext("Not available.");
                    deployedInfo.lastDeployedAuthor = LOCALE.maketext("Not available.");

                    if (typeof repoInfo.last_deployment !== "undefined" && repoInfo.last_deployment) {

                        deployedInfo.hasDeploymentInformation = true;

                        if (typeof repoInfo.last_deployment.timestamps !== "undefined" &&
                            typeof repoInfo.last_deployment.timestamps.succeeded !== "undefined" &&
                            repoInfo.last_deployment.timestamps.succeeded) {
                            deployedInfo.lastDeployedDate = getHumanReadableTime(repoInfo.last_deployment.timestamps.succeeded);

                            if (typeof repoInfo.last_deployment.repository_state !== "undefined" &&
                                repoInfo.last_deployment.repository_state) {

                                if (typeof repoInfo.last_deployment.repository_state.identifier !== "undefined" &&
                                repoInfo.last_deployment.repository_state.identifier) {
                                    deployedInfo.lastDeployedSHA = repoInfo.last_deployment.repository_state.identifier;
                                }

                                if (typeof repoInfo.last_deployment.repository_state.date !== "undefined" &&
                                repoInfo.last_deployment.repository_state.date) {
                                    deployedInfo.lastDeployedCommitDate = getHumanReadableTime(repoInfo.last_deployment.repository_state.date);
                                }

                                if (typeof repoInfo.last_deployment.repository_state.message !== "undefined" &&
                                repoInfo.last_deployment.repository_state.message) {
                                    deployedInfo.lastDeployedCommitMessage = repoInfo.last_deployment.repository_state.message;
                                }

                                if (typeof repoInfo.last_deployment.repository_state.author !== "undefined" &&
                                repoInfo.last_deployment.repository_state.author) {
                                    deployedInfo.lastDeployedAuthor = repoInfo.last_deployment.repository_state.author;
                                }
                            }
                        }
                    }

                    return deployedInfo;
                }

                /* Render repository list
                * @method refineRepositoryInformation
                * @params {Object} repoInfo Repository Information
                * @return {Object} Returns a single formatted repository data instance.
                */
                function refineRepositoryInformation(repoInfo) {
                    if (repoInfo && typeof repoInfo !== "undefined") {

                        // For unique ids
                        repoInfo.qaSafeSuffix = $filter("qaSafeID")(repoInfo.repository_root);

                        // File manager url
                        if (fileManagerPath) {
                            repoInfo.fileManagerRedirectURL =  fileManagerPath + encodeURIComponent(repoInfo.repository_root);
                        } else {
                            repoInfo.fileManagerRedirectURL = "";
                        }

                        // gitweb url
                        if (gitWebPath) {
                            var projectPath = repoInfo.repository_root.replace(/^\/+/g, "") + "/.git";
                            repoInfo.gitWebURL = gitWebPath + encodeURIComponent(projectPath);
                        } else {
                            repoInfo.gitWebURL = "";
                        }

                        // has remote
                        repoInfo.hasRemote = typeof repoInfo.source_repository !== "undefined" &&  repoInfo.source_repository;

                        // Clone URL
                        if (typeof repoInfo.clone_urls !== "undefined" && repoInfo.clone_urls) {
                            repoInfo.cloneURL = repoInfo.clone_urls.read_write[0] || repoInfo.clone_urls.read_only[0];
                        }

                        // Branch information
                        repoInfo.activeBranch = LOCALE.maketext("Not available.");
                        repoInfo.hasActiveBranch = false;

                        if (typeof repoInfo.branch !== "undefined" && repoInfo.branch) {
                            repoInfo.activeBranch = repoInfo.branch;
                            repoInfo.hasActiveBranch = true;
                        }

                        // Head Commit information
                        var commitInfo = parseHeadCommitInformation(repoInfo);
                        repoInfo.lastUpdateSHA = commitInfo.lastUpdateSHA;
                        repoInfo.lastUpdateDate = commitInfo.lastUpdateDate;
                        repoInfo.commitMessage = commitInfo.commitMessage;
                        repoInfo.author = commitInfo.author;
                        repoInfo.hasHeadInformation = commitInfo.hasHeadInformation;

                        // Last deployed information
                        var lastDeployedInfo = parseLastDeployedInformation(repoInfo);
                        repoInfo.hasDeploymentInformation = lastDeployedInfo.hasDeploymentInformation;
                        repoInfo.lastDeployedSHA = lastDeployedInfo.lastDeployedSHA;
                        repoInfo.lastDeployedDate = lastDeployedInfo.lastDeployedDate;
                        repoInfo.lastDeployedCommitDate = lastDeployedInfo.lastDeployedCommitDate;
                        repoInfo.lastDeployedCommitMessage = lastDeployedInfo.lastDeployedCommitMessage;
                        repoInfo.lastDeployedAuthor = lastDeployedInfo.lastDeployedAuthor;

                        // Is deployable
                        repoInfo.deployable = PARSE.parsePerlBoolean(repoInfo.deployable);

                        repoInfo.cloneInProgress = false;
                        repoInfo.deployInProgress = false;

                        // Tasks (clone and deploy)
                        if (typeof repoInfo.tasks !== "undefined" &&
                            repoInfo.tasks &&
                            repoInfo.tasks.length > 0) {

                            for ( var i = 0, len = repoInfo.tasks.length; i < len; i++) {
                                if (repoInfo.tasks[i].action === "create") {
                                    repoInfo.cloneInProgress = true;
                                    repoInfo.cloneTaskID = repoInfo.tasks[i].id;
                                }

                                if (repoInfo.tasks[i].action === "deploy") {
                                    repoInfo.deployInProgress = true;
                                }
                            }
                        }

                    }
                    return repoInfo;
                }

                /* Convert Epoch Time to Human readable
                * @method getHumanReadableTime
                * @params {Number} epochTime Represents the DateTime in epoch format.
                * @return {String} Returns a human readable DateTime string.
                */
                function getHumanReadableTime(epochTime) {
                    return LOCALE.local_datetime(epochTime, "datetime_format_medium");
                }

                /* Modify Repository List
                * @method prepareList
                * @params {Array} data List of repositories
                * @return {Array} List of Repositories
                */
                function prepareList(data) {
                    var list = [];

                    if (typeof data !== "undefined" && data !== null ) {
                        for (var i = 0, len = data.length; i < len; i++) {
                            var value = refineRepositoryInformation(data[i]);
                            list.push(value);
                        }
                    }
                    return list;
                }

                /* Gets the index of specific repository in the list
                * @method getRepositoryIndex
                * @params {Array} reposList List of Repositories
                * @params {String} path Repository path to look for
                * @return {Number} Returns the index of the repository
                */
                function getRepositoryIndex(reposList, path) {
                    var index = null;
                    if (typeof reposList !== undefined && reposList) {
                        for (var repoIndex = 0, repoLength = reposList.length; repoIndex < repoLength; repoIndex++) {
                            if (reposList[repoIndex].repository_root === path) {
                                index = repoIndex;
                                break;
                            }
                        }
                    }

                    return index;
                }

                /* Copies supplied string to the user's clipboard
                * @method copyTextToClipboard
                * @params {String} text String to be copied to the user's clipboard.
                */
                function copyTextToClipboard(text) {
                    var textArea = document.createElement("textarea");
                    textArea.value = text;
                    document.body.appendChild(textArea);
                    textArea.select();
                    try {
                        document.execCommand("copy");
                    } catch (e) {
                        throw new Error(LOCALE.maketext("You cannot copy the “[_1]” clone [output,acronym,URL,Uniform Resource Locator] to the clipboard.", text));
                    }
                    document.body.removeChild(textArea);
                }

                // get repository list from PAGE data
                repos = prepareList(PAGE.repos);

                VersionControlService.prototype = new APIService();

                angular.extend(VersionControlService.prototype, {

                    /**
                    * Gets the list of cached repositories.
                    * Used for testing purposes
                    *
                    * @method getRepositoryList
                    * @return {Array} Array of cached repositories
                    */
                    getRepositoryList: function() {
                        return repos;
                    },

                    /**
                    * List repositories
                    *
                    * @method listRepositories
                    * @param {Boolean} forceLoad Forces the API request to take place, rather than pulling the data from the JS vars.
                    * @param {String} attributeStr Comma seperated list of fields that UI needs
                    * @return {Promise} When fulfilled, will return the list of repositories.
                    */
                    listRepositories: function(forceLoad, attributeStr) {

                        if (forceLoad) {
                            var apiCall = new UAPIREQUEST.Class();
                            apiCall.initialize("VersionControl", "retrieve");

                            if (attributeStr) {
                                apiCall.addArgument("fields", attributeStr);
                            }

                            return this.deferred(apiCall).promise
                                .then(function(response) {
                                    try {
                                        repos = prepareList(response.data);
                                        return $q.resolve(repos);
                                    } catch (err) {
                                        return $q.reject(err);
                                    }
                                })
                                .catch(function(error) {
                                    return $q.reject(error);
                                });
                        } else {
                            return $q.resolve(repos);
                        }
                    },

                    /**
                    * Gets information of a single repository
                    *
                    * @method getRepositoryInformation
                    * @param {String} repositoryPath Repository root path
                    * @param {String} attributeStr Fields to request
                    * @return {Promise} When fulfilled, will return repository information.
                    */
                    getRepositoryInformation: function(repositoryPath, attributeStr) {

                        var apiCall = new UAPIREQUEST.Class();
                        apiCall.initialize("VersionControl", "retrieve");

                        if (repositoryPath) {
                            apiCall.addFilter("repository_root", "eq", repositoryPath);
                            if (attributeStr) {
                                apiCall.addArgument("fields", attributeStr);
                            }
                        } else {
                            throw new Error(LOCALE.maketext("Repository path cannot be empty."));
                        }

                        var repository = [];
                        return this.deferred(apiCall).promise
                            .then(function(response) {
                                try {
                                    repository = prepareList(response.data);

                                    if (repository && repository.length > 0) {
                                        return $q.resolve(repository[0]);
                                    } else {
                                        throw new Error(LOCALE.maketext("Repository “[_1]” could not be found.", repositoryPath));
                                    }

                                } catch (err) {
                                    return $q.reject(err);
                                }
                            })
                            .catch(function(error) {
                                return $q.reject(error);
                            });
                    },

                    /**
                    * Clone to Clipboard
                    *
                    * @method cloneToClipboard
                    * @param {String} cloneUrl The URL to be used to clone repos.
                    * @return {Boolean} Returns true on success.
                    */
                    cloneToClipboard: function(cloneUrl) {
                        if (typeof cloneUrl === "string" && cloneUrl !== "") {

                        // set clipboard to the clone URL
                            copyTextToClipboard(cloneUrl);
                            return true;

                        } else {

                        // throw dev error
                            throw new Error(LOCALE.maketext("“[_1]” is not a valid clone [output,acronym,URL,Universal Resource Locator].", cloneUrl));
                        }
                    },

                    /**
                    * Creates or clones repository
                    *
                    * @method createRepository
                    * @return {Promise} When fulfilled, returns created repository information.
                    */
                    createRepository: function(name, fullPath, cloneURL) {

                        var apiCall = new UAPIREQUEST.Class();
                        apiCall.initialize("VersionControl", "create");

                        apiCall.addArgument("name", name);
                        apiCall.addArgument("repository_root", fullPath);

                        apiCall.addArgument("type", "git");

                        // Creates a new repository when cloneURL is not provided
                        if (typeof cloneURL !== "undefined" && cloneURL) {
                            apiCall.addArgument("source_repository", JSON.stringify({
                                "remote_name": "origin",
                                "url": cloneURL
                            }));
                        }

                        return this.deferred(apiCall).promise
                            .then(function(response) {
                                var processedData = {};

                                // update the repository list with data returned from create
                                if (response.data) {
                                    processedData = refineRepositoryInformation(response.data);
                                    repos.push(processedData);
                                }

                                return processedData;
                            })
                            .catch(function(error) {
                                return $q.reject(error);
                            });
                    },

                    /**
                    * Delete repository
                    *
                    * @method deleteRepository
                    * @param {String} repositoryRoot repository root path
                    * @return {Promise} Returns a promise.
                    */
                    deleteRepository: function(repositoryRoot) {
                        if (typeof repositoryRoot === "string" && repositoryRoot !== "") {
                            var apiCall = new UAPIREQUEST.Class();

                            apiCall.initialize("VersionControl", "delete");
                            apiCall.addArgument("repository_root", repositoryRoot);
                            return this.deferred(apiCall).promise
                                .then(function() {
                                    var index = getRepositoryIndex(repos, repositoryRoot);
                                    if (typeof index === "number" && index >= 0) {
                                        repos.splice(index, 1);
                                    }
                                    return $q.resolve();
                                })
                                .catch(function(error) {
                                    return $q.reject(error);
                                });
                        }
                    },

                    /**
                    * Updates repository
                    *
                    * @method updateRepository
                    * @param {String} repositoryRoot repository root path
                    * @param {String} repositoryName name of the repository
                    * @param {String} branch active branch name
                    * @return {Promise} Returns a promise.
                    */
                    updateRepository: function(repositoryRoot, repositoryName, branch) {
                        var apiCall = new UAPIREQUEST.Class();
                        apiCall.initialize("VersionControl", "update");

                        apiCall.addArgument("repository_root", repositoryRoot);

                        if (typeof repositoryName === "string" && repositoryName) {
                            apiCall.addArgument("name", repositoryName);
                        }

                        if (typeof branch === "string" && branch) {
                            apiCall.addArgument("branch", branch);
                        }

                        return this.deferred(apiCall).promise
                            .then(function(response) {

                                if (response.data) {
                                    var index = getRepositoryIndex(repos, repositoryRoot);
                                    if (typeof index === "number" && index >= 0) {
                                        repos[index] = refineRepositoryInformation(response.data);
                                    }
                                }
                                return response;
                            })
                            .catch(function(error) {
                                return $q.reject(error);
                            });

                    },

                    /**
                    * Updates changes from remote
                    *
                    * @method updateRepository
                    * @param {String} repositoryRoot repository root path
                    * @return {Promise} Returns a promise.
                    */
                    updateFromRemote: function(repositoryRoot, branch) {
                        var apiCall = new UAPIREQUEST.Class();
                        apiCall.initialize("VersionControl", "update");

                        apiCall.addArgument("repository_root", repositoryRoot);
                        apiCall.addArgument("branch", branch || "");

                        return this.deferred(apiCall).promise
                            .then(function(response) {
                                if (response.data) {
                                    var index = getRepositoryIndex(repos, repositoryRoot);
                                    if (typeof index === "number" && index >= 0) {
                                        repos[index] = refineRepositoryInformation(response.data);
                                    }
                                }
                                return response;
                            })
                            .catch(function(error) {
                                return $q.reject(error);
                            });

                    },

                    /**
                    * Deploy repository
                    *
                    * @method updateRepository
                    * @param {String} repositoryRoot repository root path
                    * @return {Promise} Returns a promise.
                    */
                    deployRepository: function(repositoryRoot) {
                        var apiCall = new UAPIREQUEST.Class();
                        apiCall.initialize("VersionControlDeployment", "create");

                        apiCall.addArgument("repository_root", repositoryRoot);

                        return this.deferred(apiCall).promise
                            .then(function(response) {
                                return response;
                            })
                            .catch(function(error) {
                                return $q.reject(error);
                            });
                    }
                });

                return new VersionControlService();
            }
        ]);
    }
);
