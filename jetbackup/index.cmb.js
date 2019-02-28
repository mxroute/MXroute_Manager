/*
* base/frontend/paper_lantern/jetbackup/index.devel.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

/* global require: false */

// Loads the application with the non-combined files
require(
    [
        "master/master",
        "app/index"
    ],
    function(MASTER, APP) {
        MASTER();
        APP();
    }
);

/*
* base/frontend/paper_lantern/jetbackup/index.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

/* global require: false, define: false, PAGE: false */

define("app/index",[
		"angular",
		"cjt/util/locale",
		"app/libraries/utils",
		"cjt/modules",
		"jquery-chosen",
		"angular-chosen"
		// "ngRoute"
	],
	function(angular, LOCALE, UTILS) {
		return function() {
			// First create the application
			angular.module("cpanel.jetbackup", [
				"angular-growl",
				"cjt2.cpanel",
				"cjt2.services.api",
				"cjt2.views.applicationController",
				"ngAnimate",
				"localytics.directives"
			]);

			// Then load the application dependencies
			return require([
				"cjt/bootstrap",
				"app/controllers/fullBackups",
				"app/controllers/fileBackups",
				"app/controllers/cronBackups",
				"app/controllers/dnsBackups",
				"app/controllers/emailBackups",
				"app/controllers/dbBackups",
				"app/controllers/sslBackups",
				"app/controllers/listBackups",
				"app/controllers/fileManager",
				"app/controllers/snapshots",
				"app/controllers/queues",
				"app/controllers/gdpr",
				"app/controllers/settings",
				"app/filters/backupLocaleString",
				"app/services/jetapi",
				"app/directives/focusInput"
			], function(BOOTSTRAP) {

				angular.module("cpanel.jetbackup").config(["$animateProvider", "$routeProvider", function($animateProvider, $routeProvider) {
					$animateProvider.classNameFilter(/(action-module|disappearing-table-row)/);

					var mustAgree = function($location) {
						var gdpr = window.PAGE.info.gdpr;

						if(gdpr.enabled && !gdpr.termsagreed && $location.path() != '/gdpr') {
							$location.path('/gdpr');
						}
					};

					$routeProvider
					.when("/settings", { templateUrl: "views/settings.ptt", resolve: { mess: mustAgree } })
					.when("/gdpr", { templateUrl: "views/gdpr.ptt", resolve: { mess: mustAgree } })
					.when("/snapshots", { templateUrl: "views/snapshots.ptt", resolve: { mess: mustAgree } })
					.when("/queues", { templateUrl: "views/queues.ptt", resolve: { mess: mustAgree } })
					.when("/fileManager/:id", { templateUrl: "views/fileManager.ptt", resolve: { mess: mustAgree } })
					.when("/dbBackups", { templateUrl: "views/dbBackups.ptt", resolve: { mess: mustAgree } })
					.when("/sslBackups", { templateUrl: "views/sslBackups.ptt", resolve: { mess: mustAgree } })
					.when("/dnsBackups", { templateUrl: "views/dnsBackups.ptt", resolve: { mess: mustAgree } })
					.when("/emailBackups", { templateUrl: "views/emailBackups.ptt", resolve: { mess: mustAgree } })
					.when("/cronBackups", { templateUrl: "views/cronBackups.ptt", resolve: { mess: mustAgree } })
					.when("/fullBackups", { templateUrl: "views/fullBackups.ptt", resolve: { mess: mustAgree } })
					.when("/fileBackups", { templateUrl: "views/fileBackups.ptt", resolve: { mess: mustAgree } })
					.when("/", { templateUrl: "views/index.ptt", resolve: { mess: mustAgree } });


				}]).controller("baseController",
					["$scope", "$location", function($scope, $location) {
						$scope.LOCALE = LOCALE;
						$scope.UTILS = UTILS;
						$scope.PERMS = window.PAGE.permissions;

						$scope.changeView = function(view){
							$location.path(view); // path not hash
						};

						//$scope.pageTabs = [];
						//$scope.loading = true;
						//$scope.activeTab = -1;
						//$scope.backupsCount = PAGE.backupsCount;
					}]
				).animation(".action-module", ["$animateCss", function($animateCss) {
					return {
						enter: function(elem, done) {
							var height = elem[0].offsetHeight;
							return $animateCss(elem, {
								from: { height: "0" },
								to: { height: height + "px" },
								duration: 0.3,
								easing: "ease-out",
								event: "enter",
								structural: true
							})
							.start()
							.done(function() {
								elem[0].style.height = "";
								done();
							});
						},
						leave: function(elem, done) {
							var height = elem[0].offsetHeight;
							return $animateCss(elem, {
								event: "leave",
								structural: true,
								from: { height: height + "px" },
								to: { height: "0" },
								duration: 0.3,
								easing: "ease-out"
							})
							.start()
							.done(function() {
								done();
							});
						}
					};
				}]);

				BOOTSTRAP("#body-content", "cpanel.jetbackup");
			});
		};
	}
);

/*
* base/frontend/paper_lantern/jetbackup/controllers/listBackups.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

/* global define: false, PAGE: false */

define("app/controllers/listBackups",[
        "lodash",
        "angular",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/loadingPanel",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/searchDirective",
        "cjt/directives/pageSizeDirective",
        "cjt/filters/startFromFilter",
        "cjt/decorators/paginationDecorator"
    ],
    function(_, angular, LOCALE) {

        var app;
        try {
            app = angular.module("cpanel.jetbackup");
        }
        catch(e) {
            app = angular.module("cpanel.jetbackup", []);
        }

        app.controller("listBackups",
            ["$rootScope", "$scope", "$interval", "$timeout", "jetapi", "growl", "$window", "$location",
                function($rootScope, $scope, $interval, $timeout, jetapi, growl, $window, $location) {

                    var COMPONENT_NAME = "BackupsTable";
                    $scope.backups = [];
                    $scope.filteredList = [];
					$scope.sortedRestoreList = {};
					$scope.sortedDownloadList = {};
					$scope.sortedSnapshotList = {};
                    $scope.loadingBackups = false;
					$scope.expandedBackup = undefined;
                    $scope.actionModule = undefined;
					$scope.downloadingBackup = false;
					$scope.restoringBackup = false;
					$scope.creatingSnapshot = false;
					$scope.canRestore = false;
					$scope.config = PAGE.config;
					$scope.conditionChecked = [];
					$scope.permissions = {};
					$scope.snapshotStatus = undefined;
					$scope.snapshotInQueue = false;
					$scope.snapshotRefresh = false;
					$scope.tableCols = 0;
					$scope.lastNote = '';

					$scope.meta = {
						// sort settings
						sortReverse: false,
						sortBy: "created",
						sortDirection: "desc",
						sortFields: ["flag_name", "created", "size", "location"],

						// search settings
						filterValue: "",

						// pager settings
						maxPages: 5,
						totalItems: $scope.backups.length,
						currentPage: 1,
						pageSize: 10,
						pageSizes: [10, 20, 50, 100, 500],
						start: 0,
						limit: 10
					};

					var statusInterval;

					$scope.openNotesEdit = function(backup) {
						backup.editing = true;
						$scope.lastNote = backup.notes;
					};

					$scope.saveNotes = function(backup) {

						// if the notes didn't changed, don't send them to the API
						if($scope.lastNote === backup.notes)
						{
							backup.editing = false;
							return;
						}

						return jetapi.manageBackup({ _id: backup._id, notes: backup.notes }).then(function(response) {
							backup.editing = false;
						}, function(error) {
							backup.editing = false;
						});
					};

					$scope.checkStatus = function () {

						if(angular.isDefined(statusInterval)) return;

						var runCheckStatus = false;
						$scope.sortedDownloadList = {};
						$scope.sortedRestoreList = {};
						$scope.sortedSnapshotList = {};

						for(var i in $scope.filteredList)
						{
							if($scope.filteredList[i].queue.download)
							{
								$scope.sortedDownloadList[$scope.filteredList[i].queue.download] = $scope.filteredList[i];
								runCheckStatus = true;
							}

							if($scope.filteredList[i].queue.restore)
							{
								$scope.sortedRestoreList[$scope.filteredList[i].queue.restore] = $scope.filteredList[i];
								runCheckStatus = true;
							}
						}

						if(!runCheckStatus) runCheckStatus = $scope.snapshotInQueue;

						if(!runCheckStatus) return;

						statusInterval = $interval(function() {

							var apiPromise = jetapi.listQueueItems();
							$scope.fetchPromise = apiPromise;

							apiPromise.then(
								function(response) {

									// We only want to actually process the response if it's the last request we sent
									if( $scope.fetchPromise !== apiPromise ) return;

									var data = response.data.queue;
									var queued = 0;

									for(var i in data)
									{
										var _id = data[i]._id;

										if(data[i].status >= 100)
										{
											switch(data[i].type)
											{
												// Restore
												case 1:
													if($scope.sortedRestoreList[_id] === undefined) continue;
													$scope.sortedRestoreList[_id].queue.restore = false;
												break;

												// Download
												case 2:
													if($scope.sortedDownloadList[_id] === undefined) continue;
													$scope.sortedDownloadList[_id].queue.download = false;
													if(data[i].status === 100) $scope.sortedDownloadList[_id].download = data[i].download_id;
												break;

												case 3:
													if($scope.snapshotInQueue && _id === $scope.snapshotInQueue)
													{
														if(data[i].status >= 100) $scope.snapshotInQueue = false;
														if(!$scope.snapshotRefresh)
														{
															$scope.snapshotRefresh = true;

															if(data[i].status === 100)
															{
																$scope.snapshotStatus = {
																	message: LOCALE.maketext("Snapshot Created successfully"),
																	type: "success",
																	closeable: true
																};
																$scope.fetch();
															}
															else
															{
																$scope.snapshotStatus = {
																	message: LOCALE.maketext("Failed to create Snapshot"),
																	type: "danger",
																	closeable: true
																};
															}
														}
													}
												break;
											}
										}
										else
										{
											queued++;
										}
									}

									if(!queued)
									{
										$interval.cancel(statusInterval);
										statusInterval=undefined;
									}
								},
								function(error) {
									growl.error(error);
								}
							);
						}, 5000);
					};

					$scope.isConditionsAgreed = function() {

						for(var i in $scope.config.restore_conditions)
						{
							if($scope.config.restore_conditions[i].type !== 0 && $scope.config.restore_conditions[i].type !== $scope.backupType) continue;
							if(!$scope.config.restore_conditions[i].checked) return true
						}

						return false;
					};

                    $scope.setMetaFromComponentSettings = function(settings) {

                        if( settings.hasOwnProperty("sortBy") && settings.sortBy && _.find($scope.meta.sortFields, function(f) { return f === settings.sortBy; }) ) {
                            $scope.meta.sortBy = settings.sortBy;
                        }

                        if( settings.hasOwnProperty("sortDirection") && settings.sortDirection && (settings.sortDirection === "asc" || settings.sortDirection === "desc" ) ) {
                            $scope.meta.sortDirection = settings.sortDirection;
                        }

                        if( settings.hasOwnProperty("pageSize") && settings.pageSize && _.find($scope.meta.pageSizes, function(s) { return s === parseInt(settings.pageSize); }) ) {
                            $scope.meta.pageSize = parseInt(settings.pageSize);
                        }

                        if( settings.hasOwnProperty("filterValue") ) {
                            $scope.meta.filterValue = settings.filterValue;
                        }

                    };

					$scope.clearStatus = function() {
						if($scope.expandedBackup !== undefined) $scope.expandedBackup.status = undefined;
						$scope.snapshotStatus = undefined;
					};

					$scope.cancelAction = function() {
						$scope.expandedBackup = undefined;
						$scope.actionModule = undefined;
					};

					$scope.collapseFinished = function() {
						if( $scope.actionModule === undefined ) {
							$scope.expandedBackup = undefined;
						}
					};

					$scope.onClickCreateSnapshot = function() {

						$scope.clearStatus();
						$scope.creatingSnapshot = true;

						return jetapi.addQueueSnapshot().then(function(response) {
							$scope.snapshotStatus = {
								message: LOCALE.maketext(response.messages[0].content),
								type: response.status ? "success" : "danger",
								closeable: true,
								ttl: 10000
							};
							$scope.snapshotInQueue = response.data.status < 100 ? response.data._id : false;
							$scope.creatingSnapshot = false;
							$scope.snapshotRefresh = false;
							$scope.checkStatus();
						}, function(error) {
							$scope.snapshotStatus = {
								message: error,
								type: "danger",
								closeable: true,
								ttl: 10000
							};
							$scope.creatingSnapshot = false;
						});
					};

					$scope.onClickDeleteDownload = function(backup) {
						if( $scope.expandedBackup === backup && $scope.actionModule === "deletedownload" ) {
							$scope.actionModule = undefined;
						}
						else {

							if( $scope.expandedBackup ) {
								$scope.expandedBackup.status = undefined;
							}

							$scope.actionModule = "deletedownload";
							$scope.expandedBackup = backup;
						}
					};

					$scope.onClickDeleteDownloadConfirm = function() {

						$scope.deletingDownload = true;
						$scope.expandedBackup.status = undefined;
						$scope.expandedBackup.deleting = true;

						return jetapi.deleteDownload({ _id: $scope.expandedBackup.download }).then(function(response) {

							$scope.expandedBackup.download = false;

							$scope.expandedBackup.status = {
								message: LOCALE.maketext(response.messages[0].content),
								type: response.status ? "success" : "danger",
								closeable: true,
								ttl: 10000
							};

							$scope.deletingDownload = false;
							$scope.actionModule = undefined;
						}, function(error) {
							$scope.expandedBackup.status = { type: "danger", message: error };
							$scope.deletingDownload = false;
						});
					};

					$scope.onClickRestore = function(backup) {
						if( $scope.expandedBackup === backup && $scope.actionModule === "restore" ) {
							$scope.actionModule = undefined;
						}
						else {

							if( $scope.expandedBackup ) {
								$scope.expandedBackup.status = undefined;
							}

							$scope.actionModule = "restore";
							$scope.expandedBackup = backup;
						}
					};

					$scope.onClickRestoreConfirm = function() {

						$scope.restoringBackup = true;
						$scope.expandedBackup.status = undefined;
						$scope.expandedBackup.restoring = true;

						var apiParams = { _id: $scope.expandedBackup._id };

						if($scope.expandedBackup.require_encryption_key && !$scope.expandedBackup.encryption_key) {
							$scope.expandedBackup.status = {
								message: "You must provide encryption key in order to restore form this backup",
								type: 'danger',
								closeable: true,
								ttl: 10000
							};
							return;
						}

						if($scope.expandedBackup.encryption_key) apiParams.encryption_key = $scope.expandedBackup.encryption_key;

						return jetapi.addQueueRestore(apiParams).then(function(response) {

							$scope.expandedBackup.encryption_key = '';

							// Only for full backup restore - for non full restore ser the restore var individually
							if($scope.backupType === 127)
							{
								for(var i = 0; i < $scope.filteredList.length; i++)
								{
									$scope.filteredList[i].queue.restore = response.data._id;
								}
							}
							else
							{
								$scope.expandedBackup.queue.restore = response.data._id;
							}

							$scope.checkStatus();

							$scope.expandedBackup.status = {
								message: LOCALE.maketext(response.messages[0].content),
								type: response.status ? "success" : "danger",
								closeable: true,
								ttl: 10000
							};

							$scope.restoringBackup = false;
							$scope.actionModule = undefined;
						}, function(error) {
							$scope.expandedBackup.status = { type: "danger", message: error };
							$scope.restoringBackup = false;
						});
					};

					$scope.onClickDownload = function(backup) {
						if( $scope.expandedBackup === backup && $scope.actionModule === "download" ) {
							$scope.actionModule = undefined;
						}
						else {

							if( $scope.expandedBackup ) {
								$scope.expandedBackup.status = undefined;
							}

							$scope.actionModule = "download";
							$scope.expandedBackup = backup;
						}
					};

					var redirectToDownload = function(filename) {
						var match = window.location.pathname.match(/^\/cpsess[^\/]+\//);
						if(match[0] !== undefined && filename) {
							window.location = match[0] + 'download?file=.jbm/downloads/' + filename;
							return true;
						}
						return false;
					};

					$scope.onClickDownloadConfirm = function(backup) {

						$scope.downloadingBackup = true;

						if(backup === undefined) backup = $scope.expandedBackup;

						backup.status = undefined;
						backup.downloading = true;


						if(backup.download) {

							jetapi.getDownload({ _id: backup.download }).then(function(response) {

								console.log(response);

								if(!response.status) {
									backup.status = {
										message: LOCALE.maketext(response.message),
										type: 'danger',
										closeable: true,
										ttl: 10000
									};
									return;
								}

								var parts = response.data.path.split('/');

								if(!redirectToDownload(parts[parts.length-1]))
								{
									backup.status = {
										message: LOCALE.maketext("Unable to get cPanel session ID"),
										type: "danger",
										closeable: true,
										ttl: 10000
									};
									$scope.downloadingBackup = false;
									$scope.actionModule = undefined;
								}
							});

						} else {
							var apiParams = { _id: backup._id };

							if(backup.require_encryption_key && !backup.encryption_key) {
								backup.status = {
									message: LOCALE.maketext("You must provide encryption key in order to generate download for this backup"),
									type: 'danger',
									closeable: true,
									ttl: 10000
								};
								$scope.downloadingBackup = false;
								$scope.actionModule = undefined;
								return;
							}

							if(backup.encryption_key) apiParams.encryption_key = backup.encryption_key;

							return jetapi.addQueueDownload(apiParams).then(function(response) {

								if(response.data.ready)
								{
									if(!redirectToDownload(response.data.filename))
									{
										backup.status = {
											message: LOCALE.maketext("Unable to get cPanel session ID"),
											type: "danger",
											closeable: true,
											ttl: 10000
										};
										$scope.downloadingBackup = false;
										$scope.actionModule = undefined;
										return;
									}
								}

								backup.encryption_key = '';
								backup.queue.download = response.data._id;
								$scope.checkStatus();
								$scope.downloadingBackup = false;
								$scope.actionModule = undefined;

							}, function(error) {
								backup.status = {
									message: LOCALE.maketext(error),
									type: "danger",
									closeable: true,
									ttl: 10000
								};
								$scope.downloadingBackup = false;
								$scope.actionModule = undefined;
							});
						}
					};

                    $scope.sortList = function() {

                        if( $scope.currentFetchTimeout ) {
                            $timeout.cancel($scope.currentFetchTimeout);
                        }

                        $scope.currentFetchTimeout = $timeout(function() {
                            $scope.meta.currentPage = 1;
                            $scope.fetch();
                        }, 250);
                    };

                    $scope.selectPage = function() {

                        if( $scope.currentFetchTimeout ) {
                            $timeout.cancel($scope.currentFetchTimeout);
                        }

                        $scope.currentFetchTimeout = $timeout(function() {
                            $scope.fetch();
                        }, 250);
                    };

                    $scope.selectPageSize = function() {

                        if( $scope.currentFetchTimeout ) {
                            $timeout.cancel($scope.currentFetchTimeout);
                        }

                        $scope.currentFetchTimeout = $timeout(function() {
                            $scope.meta.currentPage = 1;
                            $scope.fetch();
                        }, 250);
                    };

                    $scope.searchList = function() {

                        $scope.filterTermPending = true;

                        if( $scope.currentFetchTimeout ) {
                            $timeout.cancel($scope.currentFetchTimeout);
                        }

                        $scope.currentFetchTimeout = $timeout(function() {
                            $scope.meta.currentPage = 1;
                            $scope.fetch();
                        }, 250);
                    };

                    $scope.fetch = function() {

						$scope.tableCols = angular.element("#BackupList .table th").length;
						$scope.loadingBackups = true;
                        $scope.meta.mobileItemCountText = undefined;

						var apiPromise;

                        if($scope.backupIsSnapshots)
						{
							apiPromise = jetapi.listQueueItems();
							$scope.fetchPromise = apiPromise;

							apiPromise.then(
								function(response) {

									// We only want to actually process the response if it's the last request we sent
									if( $scope.fetchPromise !== apiPromise ) return;

									var data = response.data.queue;

									for(var i in data)
									{
										if(data[i].type === 3)
										{
											if(data[i].status < 100)
											{
												$scope.snapshotInQueue = data[i]._id;
												return;
											}
											else
											{
												$scope.snapshotRefresh = true;
												$scope.snapshotInQueue = false;
											}
										}
									}
								},
								function(error) {
									growl.error(error);
								}
							);

						}
                        var apiParams = {
                            sort: {},
                            skip: ($scope.meta.currentPage - 1) * $scope.meta.pageSize,
                            limit: $scope.meta.pageSize,
							type: $scope.backupType
                        };

						apiParams['sort'][$scope.meta.sortBy] = ($scope.meta.sortDirection == "asc" ? 1 : -1);
						apiParams['sort'] = JSON.stringify(apiParams['sort']);
						if($scope.backupIsSnapshots !== undefined && $scope.backupIsSnapshots) apiParams['only_snapshots'] = 1;

                        if( $scope.meta.filterValue && $scope.meta.filterValue !== "" ) {
                            apiParams["filter"] = $scope.meta.filterValue;
                        }

                        $scope.filteredList = [];

                        // Setting min-height to the current height to prevent the page jumping
                        // around when the list is fetching
                        var container = angular.element("#BackupList");

                        if( container && container[0] ) {
                            container.css({ minHeight: $window.getComputedStyle(container[0]).height });
                        }

                        apiPromise = jetapi.listBackups(apiParams);
                        $scope.fetchPromise = apiPromise;

                        apiPromise.then(
                            function(response) {

                                // We only want to actually process the response if it's the last request we sent
                                if( $scope.fetchPromise !== apiPromise ) {
                                    return;
                                }

								$scope.permissions = response.data.permissions;

								var data = response.data.backups;

								/*
								for(i in data)
								{
									if(!data[i].notes) data[i].notes = "Click to add Notes...";
								}
								*/

                                $scope.meta.totalItems = response.data.total;//metadata.paginate.total_records;

                                if ($scope.meta.totalItems > _.min($scope.meta.pageSizes)) {
                                    $scope.showPager = true;
                                    var start = ($scope.meta.currentPage - 1) * $scope.meta.pageSize;
                                    $scope.meta.start = start + 1;
                                    $scope.meta.limit = start + data.length;

                                } else {
                                // hide pager and pagination
                                    $scope.showPager = false;

                                    if (data.length === 0) {
                                        $scope.meta.start = 0;
                                    } else {
                                    // table statistics
                                        $scope.meta.start = 1;
                                    }

                                    $scope.meta.limit = data.length;
                                }

                                $scope.meta.mobileItemCountText = LOCALE.maketext("Displaying [_1] to [_2] out of [_3] records",
                                    $scope.meta.start, $scope.meta.limit, $scope.meta.totalItems
                                );

                                angular.element("#BackupList").css({ minHeight: "" });
                                $scope.filteredList = data;
                                $scope.loadingBackups = false;
                                $scope.filterTermPending = false;
								$scope.checkStatus();

								$timeout(function() {
									$scope.tableCols = angular.element("#BackupList .table th").length;
								});
							},
                            function(error) {
                                growl.error(error);
                                $scope.loadingBackups = false;
                                $scope.filterTermPending = false;
                            }
                        );

                    };

                    $scope.getSearchClass = function() {
                        if( !$scope.filterTermPending && !$scope.loadingBackups && $scope.meta.filterValue ) {
                            return $scope.filteredList.length > 0 ? "success" : "danger";
                        }
                        else {
                            return "";
                        }
                    };

                    if( PAGE.nvdata && PAGE.nvdata.hasOwnProperty(COMPONENT_NAME) ) {
                        $scope.setMetaFromComponentSettings(PAGE.nvdata[COMPONENT_NAME]);
                    }

                    $timeout($scope.fetch);
                }]
        );

    }
);

/*
* base/frontend/paper_lantern/jetbackup/controllers/cronBackups.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

/* global define: false, PAGE: false */

define("app/controllers/cronBackups",[
        "lodash",
        "angular",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/loadingPanel",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/searchDirective",
        "cjt/directives/pageSizeDirective",
        "cjt/filters/startFromFilter",
        "cjt/decorators/paginationDecorator"
    ],
    function(_, angular, LOCALE) {

        var app;
        try {
            app = angular.module("cpanel.jetbackup");
        }
        catch(e) {
            app = angular.module("cpanel.jetbackup", []);
        }

        app.controller("cronBackups",
            ["$rootScope", "$scope",
                function($rootScope, $scope) {
        			$scope.backupType = 16;
				}
			]
        );

    }
);

/*
* base/frontend/paper_lantern/jetbackup/controllers/fullBackups.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

/* global define: false, PAGE: false */

define("app/controllers/fullBackups",[
        "lodash",
        "angular",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/loadingPanel",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/searchDirective",
        "cjt/directives/pageSizeDirective",
        "cjt/filters/startFromFilter",
        "cjt/decorators/paginationDecorator"
    ],
    function(_, angular, LOCALE) {

        var app;
        try {
            app = angular.module("cpanel.jetbackup");
        }
        catch(e) {
            app = angular.module("cpanel.jetbackup", []);
        }

        app.controller("fullBackups",
            ["$rootScope", "$scope",
                function($rootScope, $scope) {
        			$scope.backupType = 127;
				}
			]
        );

    }
);

/*
* base/frontend/paper_lantern/jetbackup/controllers/fileBackups.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

/* global define: false, PAGE: false */

define("app/controllers/fileBackups",[
        "lodash",
        "angular",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/loadingPanel",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/searchDirective",
        "cjt/directives/pageSizeDirective",
        "cjt/filters/startFromFilter",
        "cjt/decorators/paginationDecorator"
    ],
    function(_, angular, LOCALE) {

        var app;
        try {
            app = angular.module("cpanel.jetbackup");
        }
        catch(e) {
            app = angular.module("cpanel.jetbackup", []);
        }

        app.controller("fileBackups",
            ["$rootScope", "$scope",
                function($rootScope, $scope) {
        			$scope.backupType = 2;
				}
			]
        );

    }
);

/*
* base/frontend/paper_lantern/jetbackup/controllers/dnsBackups.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

/* global define: false, PAGE: false */

define("app/controllers/dnsBackups",[
        "lodash",
        "angular",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/loadingPanel",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/searchDirective",
        "cjt/directives/pageSizeDirective",
        "cjt/filters/startFromFilter",
        "cjt/decorators/paginationDecorator"
    ],
    function(_, angular, LOCALE) {

        var app;
        try {
            app = angular.module("cpanel.jetbackup");
        }
        catch(e) {
            app = angular.module("cpanel.jetbackup", []);
        }

        app.controller("dnsBackups",
            ["$rootScope", "$scope",
                function($rootScope, $scope) {
        			$scope.backupType = 32;
				}
			]
        );

    }
);

/*
* base/frontend/paper_lantern/jetbackup/controllers/emailBackups.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

/* global define: false, PAGE: false */

define("app/controllers/emailBackups",[
        "lodash",
        "angular",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/loadingPanel",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/searchDirective",
        "cjt/directives/pageSizeDirective",
        "cjt/filters/startFromFilter",
        "cjt/decorators/paginationDecorator"
    ],
    function(_, angular, LOCALE) {

        var app;
        try {
            app = angular.module("cpanel.jetbackup");
        }
        catch(e) {
            app = angular.module("cpanel.jetbackup", []);
        }

        app.controller("emailBackups",
            ["$rootScope", "$scope",
                function($rootScope, $scope) {
        			$scope.backupType = 8;
				}
			]
        );

    }
);

/*
* base/frontend/paper_lantern/jetbackup/controllers/dbBackups.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

/* global define: false, PAGE: false */

define("app/controllers/dbBackups",[
        "lodash",
        "angular",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/loadingPanel",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/searchDirective",
        "cjt/directives/pageSizeDirective",
        "cjt/filters/startFromFilter",
        "cjt/decorators/paginationDecorator"
    ],
    function(_, angular, LOCALE) {

        var app;
        try {
            app = angular.module("cpanel.jetbackup");
        }
        catch(e) {
            app = angular.module("cpanel.jetbackup", []);
        }

        app.controller("dbBackups",
            ["$rootScope", "$scope",
                function($rootScope, $scope) {
        			$scope.backupType = 4;
				}
			]
        );

    }
);

/*
* base/frontend/paper_lantern/jetbackup/controllers/sslBackups.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

/* global define: false, PAGE: false */

define("app/controllers/sslBackups",[
        "lodash",
        "angular",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/loadingPanel",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/searchDirective",
        "cjt/directives/pageSizeDirective",
        "cjt/filters/startFromFilter",
        "cjt/decorators/paginationDecorator"
    ],
    function(_, angular, LOCALE) {

        var app;
        try {
            app = angular.module("cpanel.jetbackup");
        }
        catch(e) {
            app = angular.module("cpanel.jetbackup", []);
        }

        app.controller("sslBackups",
            ["$rootScope", "$scope",
                function($rootScope, $scope) {
        			$scope.backupType = 64;
				}
			]
        );

    }
);

/*
* base/frontend/paper_lantern/jetbackup/controllers/snapshots.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

/* global define: false, PAGE: false */

define("app/controllers/snapshots",[
        "lodash",
        "angular",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/loadingPanel",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/searchDirective",
        "cjt/directives/pageSizeDirective",
        "cjt/filters/startFromFilter",
        "cjt/decorators/paginationDecorator"
    ],
    function(_, angular, LOCALE) {

        var app;
        try {
            app = angular.module("cpanel.jetbackup");
        }
        catch(e) {
            app = angular.module("cpanel.jetbackup", []);
        }

        app.controller("snapshots",
            ["$rootScope", "$scope",
                function($rootScope, $scope) {
        			$scope.backupType = 127;
					$scope.backupIsSnapshots = true;
				}
			]
        );

    }
);

/*
* base/frontend/paper_lantern/jetbackup/controllers/fileManager.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

/* global define: false, PAGE: false */

define("app/controllers/fileManager",[
		"lodash",
		"angular",
		"cjt/util/locale",
		"uiBootstrap",
		"ngRoute",
		"cjt/directives/actionButtonDirective",
		"cjt/directives/loadingPanel",
		"cjt/directives/toggleSortDirective",
		"cjt/directives/searchDirective",
		"cjt/directives/pageSizeDirective",
		"cjt/filters/startFromFilter",
		"cjt/decorators/paginationDecorator"
	],
	function(_, angular, LOCALE) {

		var app;
		try {
			app = angular.module("cpanel.jetbackup");
		}
		catch(e) {
			app = angular.module("cpanel.jetbackup", []);
		}

		app.controller("fileManager",
			["$rootScope", "$scope", "$interval", "$timeout", "jetapi", "growl", "$window", "$routeParams", "$location",
				function($rootScope, $scope, $interval, $timeout, jetapi, growl, $window, $routeParams, $location) {

					$scope.backupId = $routeParams.id;
					$scope.files = [];
					$scope.loadingFiles = false;
					$scope.LOCALE = LOCALE;
					$scope.currentPath = '';
					$scope.breadcrumbs = [];
					$scope.filesIndex = {};
					$scope.actionStatus = undefined;
					$scope.actionModule = undefined;
					$scope.config = PAGE.config;
					$scope.restoringBackup = false;
					$scope.downloadingBackup = false;
					$scope.downloads = [];
					$scope.restores = [];
					$scope.sortedDownloadList = {};
					$scope.sortedRestoreList = {};

					$scope.clearStatus = function() {
						$scope.actionStatus = undefined;
					};

					$scope.cancelAction = function() {
						$scope.actionStatus = undefined;
						$scope.actionModule = undefined;
					};

					$scope.changeView = function(view){
						$location.path(view); // path not hash
					};

					$scope.onClickRestore = function() {
						var selected = getSelected();

						if(!selected.length)
						{
							$scope.actionStatus = {
								message: "Please select files to restore",
								type: "danger",
								closeable: true,
								ttl: 10000
							};
							return;
						}

						$scope.actionModule = ($scope.actionModule === 'restore') ? undefined : 'restore';
					};

					$scope.onClickRestoreConfirm = function() {

						$scope.restoringBackup = true;
						$scope.actionStatus = undefined;

						var selected = JSON.stringify(getSelected());

						return jetapi.addQueueRestore({ _id: $scope.backupId, files: selected }).then(function(response) {

							if(response.status)
							{
								var text = '';
								if(response.data.status === 100) text = LOCALE.maketext("Restore Completed");
								else if(response.data.status > 100) text = LOCALE.maketext("Restore Failed");
								else text = LOCALE.maketext("Restore in Progress");

								var item = {
									_id: response.data._id,
									ready: response.data.status >= 100,
									status: response.data.status,
									created: response.data.created,
									text: text
								};
								$scope.restores.push(item);
								$scope.sortedRestoreList[response.data._id] = item;
							}

							$scope.checkStatus();

							$scope.actionStatus = {
								message: LOCALE.maketext(response.messages[0].content),
								type: response.status ? "success" : "danger",
								closeable: true,
								ttl: 10000
							};

							$scope.restoringBackup = false;
							$scope.actionModule = undefined;
							$scope.uncheckAll();
						}, function(error) {
							$scope.actionStatus = { type: "danger", message: error };
							$scope.restoringBackup = false;
						});
					};

					$scope.onClickDownload = function() {

						var selected = getSelected();

						if(!selected.length)
						{
							$scope.actionStatus = {
								message: "Please select files to download",
								type: "danger",
								closeable: true,
								ttl: 10000
							};

							return;
						}

						$scope.actionModule = ($scope.actionModule === 'download') ? undefined : 'download';
					};

					$scope.onClickDownloadConfirm = function() {

						$scope.downloadingBackup = true;
						$scope.actionStatus = undefined;

						var selected = JSON.stringify(getSelected());

						return jetapi.addQueueDownload({ _id: $scope.backupId, files: selected }).then(function(response) {

							if(response.status)
							{
								var item = {
									queue_id: response.data._id,
									ready: response.data.ready,
									filename: response.data.filename
								};
								$scope.downloads.push(item);
								$scope.sortedDownloadList[response.data._id] = item;
							}

							$scope.checkStatus();

							$scope.actionStatus = {
								message: LOCALE.maketext(response.messages[0].content),
								type: response.status ? "success" : "danger",
								closeable: true,
								ttl: 10000
							};

							$scope.downloadingBackup = false;
							$scope.actionModule = undefined;
							$scope.uncheckAll();
						}, function(error) {
							$scope.actionStatus = { type: "danger", message: error };
							$scope.downloadingBackup = false;
						});
					};

					$scope.isConditionsAgreed = function() {

						for(var i in $scope.config.restore_conditions)
						{
							if($scope.config.restore_conditions[i].type !== 0 && $scope.config.restore_conditions[i].type !== $scope.backupType) continue;
							if(!$scope.config.restore_conditions[i].checked) return true
						}

						return false;
					};

					var getSelected = function() {

						var selected = [];

						for(var i in $scope.filesIndex)
						{
							for(var j in $scope.filesIndex[i].data.files)
							{
								if($scope.filesIndex[i].data.files[j] != null && $scope.filesIndex[i].data.files[j].checked !== undefined && $scope.filesIndex[i].data.files[j].checked)
								{
									selected.push($scope.filesIndex[i].data.files[j].path);
								}
							}
						}

						return selected;
					};

					$scope.canPerformAction = function () {

						for(var i in $scope.filesIndex)
						{
							for(var j in $scope.filesIndex[i].data.files)
							{
								if($scope.filesIndex[i].data.files[j] != null && $scope.filesIndex[i].data.files[j].checked !== undefined && $scope.filesIndex[i].data.files[j].checked)
								{
									return false;
								}
							}
						}

						return true;
					};

					$scope.isDisabled = function() {
						var file = this.file.parent;
						while(!file.checked && file.parent) file = file.parent;
						return file.checked;
					};

					$scope.isChecked= function() {
						var file = this.file;
						while(!file.checked && file.parent) file = file.parent;
						return file.checked;
					};

					$scope.calculateInput = function(value) {

						if(value === undefined)
						{
							var file = this.file;
							while(!file.checked && file.parent) file = file.parent;
							return file.checked;
						}

						this.file.checked = value;
					};

					var manageBreadcrumbs = function(file) {
						if(file.path === '/') file.name = '/backup-root';
						$scope.breadcrumbs.unshift(file);
						if(file.parent !== undefined) manageBreadcrumbs(file.parent);
					};

					var handleResponse = function(response, file) {
						angular.element("#FilesList").css({ minHeight: "" });
						$scope.filesIndex[file.path] = response;
						$scope.files = response.data.files;
						$scope.loadingFiles = false;
					};

					$scope.fetch = function(file) {

						if(file.path === undefined) file.path = '/';

						$scope.loadingFiles = true;
						$scope.files = [];

						$scope.breadcrumbs = [];
						manageBreadcrumbs(file);

						var container = angular.element("#FilesList");

						if( container && container[0] ) {
							container.css({ minHeight: $window.getComputedStyle(container[0]).height });
						}

						if($scope.filesIndex[file.path] !== undefined)
						{
							handleResponse($scope.filesIndex[file.path], file);
							return;
						}

						apiParams = {};
						apiParams['_id'] = $scope.backupId;
						apiParams['path'] = file.path;

						var apiPromise = jetapi.fileManager(apiParams);
						$scope.fetchPromise = apiPromise;

						apiPromise.then(
							function(response) {

								// We only want to actually process the response if it's the last request we sent
								if( $scope.fetchPromise !== apiPromise ) {
									return;
								}

								for(var i = 0; i < response.data.files.length; i++)
								{
									response.data.files[i].path = file.path + (file.path === '/' ? '' : '/') + response.data.files[i].name;
									response.data.files[i].parent = file;
								}

								handleResponse(response, file);
							},
							function(error) {
								growl.error(error);
								$scope.loadingFiles = false;
							}
						);

					};

					$scope.uncheckAll = function () {

						for(var i in $scope.filesIndex)
						{
							for(var j in $scope.filesIndex[i].data.files)
							{
								if($scope.filesIndex[i].data.files[j] != null && $scope.filesIndex[i].data.files[j].checked !== undefined && $scope.filesIndex[i].data.files[j].checked)
								{
									$scope.filesIndex[i].data.files[j].checked = false;
								}
							}
						}

					};

					$scope.directDownload = function(filename) {

						var match = window.location.pathname.match(/^\/cpsess[^\/]+\//);
						if(match[0] !== undefined)
						{
							window.location = match[0] + 'download?file=.jbm/downloads/' + filename;
						}
					};

					$scope.getDownloads = function () {

						$scope.loadingDownloads = true;
						$scope.downloads = [];

						return jetapi.getBackupDownloads({ _id: $scope.backupId }).then(function(response) {
							if(response.data) $scope.downloads = response.data.downloads;
							$scope.loadingDownloads = false;
							$scope.checkStatus();
						}, function(error) {
							growl.error(error);
							$scope.loadingDownloads = false;
						});
					};

					$scope.getRestores = function () {

						$scope.loadingRestores = true;
						$scope.restores = [];

						return jetapi.listQueueItems().then(function(response) {

							for(var i in response.data.queue)
							{
								var data = response.data.queue[i];
								if(data.type !== 1) continue;

								var text = '';
								if(data.status === 100) text = LOCALE.maketext("Restore Completed");
								else if(data.status > 100) text = LOCALE.maketext("Restore Failed");
								else text = LOCALE.maketext("Restore in Progress");

								var item = {
									_id: data._id,
									ready: data.status >= 100,
									status: data.status,
									created: data.created,
									text: text
								};

								$scope.restores.push(item);
							}

							$scope.loadingRestores = false;
							$scope.checkStatus();
						}, function(error) {
							growl.error(error);
							$scope.loadingRestores = false;
						});
					};

					var statusInterval;

					$scope.checkStatus = function () {

						if(angular.isDefined(statusInterval)) return;

						var runCheckStatus = false;
						$scope.sortedDownloadList = {};
						$scope.sortedRestoreList = {};

						for(var i in $scope.downloads)
						{
							if(!$scope.downloads[i].ready)
							{
								$scope.sortedDownloadList[$scope.downloads[i].queue_id] = $scope.downloads[i];
								runCheckStatus = true;
							}
						}

						for(var i in $scope.restores)
						{
							if(!$scope.restores[i].ready)
							{
								$scope.sortedRestoreList[$scope.restores[i]._id] = $scope.restores[i];
								runCheckStatus = true;
							}
						}

						if(!runCheckStatus) return;

						statusInterval = $interval(function() {

							return jetapi.listQueueItems().then(function(response) {

									var data = response.data.queue;
									var queued = 0;

									for(var i in data)
									{
										var _id = data[i]._id;

										if(data[i].status >= 100)
										{
											switch(data[i].type)
											{
												// Restore
												case 1:
													if($scope.sortedRestoreList[_id] === undefined) continue;
													$scope.sortedRestoreList[_id].status = data[i].status;
													$scope.sortedRestoreList[_id].ready = data[i].status >= 100;

													var text = '';
													if(data[i].status === 100) text = LOCALE.maketext("Restore Completed");
													else if(data[i].status > 100) text = LOCALE.maketext("Restore Failed");
													else text = LOCALE.maketext("Restore in Progress");

													$scope.sortedRestoreList[_id].text = text;
													break;

												// Download
												case 2:
													if($scope.sortedDownloadList[_id] === undefined) continue;
													if(data[i].status === 100)
													{
														$scope.sortedDownloadList[_id].filename = data[i].filename;
														$scope.sortedDownloadList[_id].ready = true;
													}
													else
													{
														$scope.sortedDownloadList[_id].filename = 'Failed to Download';
													}
													break;
											}
										}
										else
										{
											queued++;
										}
									}

									if(!queued)
									{
										$interval.cancel(statusInterval);
										statusInterval=undefined;
									}
								},
								function(error) {
									growl.error(error);
								}
							);
						}, 5000);
					};

					$scope.init = function () {
						$scope.getDownloads();
						$scope.getRestores();
						$scope.fetch({path: '/'});
					};

					$timeout($scope.init());
				}]
		);

	}
);

/*
* base/frontend/paper_lantern/jetbackup/controllers/settings.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

/* global define: false, PAGE: false */

define("app/controllers/settings",[
        "lodash",
        "angular",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/loadingPanel",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/searchDirective",
        "cjt/directives/pageSizeDirective",
        "cjt/filters/startFromFilter",
        "cjt/decorators/paginationDecorator"
    ],
    function(_, angular, LOCALE) {

        var app;
        try {
            app = angular.module("cpanel.jetbackup");
        }
        catch(e) {
            app = angular.module("cpanel.jetbackup", []);
        }

        app.controller("settings",
            ["$rootScope", "$scope", "$interval", "$timeout", "jetapi", "growl", "$window",
                function($rootScope, $scope, $interval, $timeout, jetapi, growl, $window) {

                    var COMPONENT_NAME = "SettingsTable";

					$scope.saveChangesStatus = undefined;
					$scope.settings = {};
					/*
					if(!PAGE.settings.status)
						for(var i=0;i<PAGE.settings.errors.length;i++)
							growl.error(PAGE.settings.errors[i]);
					$scope.settings=PAGE.settings.data;
					*/


					$scope.clearStatus = function () {
						$scope.saveChangesStatus = undefined;
					};

					$scope.saveChanges = function() {

						var formOrder = ["email"];

						if( $scope.settingsForm.$invalid ) {
							$scope.settingsForm.$setSubmitted();
							var focused = false;

							angular.forEach(formOrder, function(name) {
								if( $scope.settingsForm[name] && $scope.settingsForm[name].$invalid ) {
									$scope.settingsForm[name].$setDirty();
									if( !focused ) {
										angular.element("[name='settingsForm'] [name='" + name + "']").focus();
										focused = true;
									}
								}
							});

							return;
						}

						var apiParams = {
							email: $scope.settings.email
						};

						$scope.savingChanges = true;
						$scope.saveChangesStatus = undefined;

						return jetapi.manageAccount(apiParams).then(
							function(data) {
								$scope.savingChanges = false;

								$scope.saveChangesStatus = {
									message: LOCALE.maketext("Settings saved successfully"),
									type: 'success',
									closeable: true,
									ttl: 10000
								};

								$scope.settingsForm.$setPristine();
								$scope.settingsForm.$setUntouched();
							},
							function(error) {
								$scope.saveChangesStatus = {
									message: error,
									type: 'danger',
									closeable: true,
									ttl: 10000
								};

								$scope.savingChanges = false;
							}
						);
					};

					$scope.fetch = function () {
						return jetapi.getAccountDetails().then(function(response) {

							$scope.settings = response.data;

						}, function(error) {
							$scope.saveChangesStatus = {
								message: error,
								type: "danger",
								closeable: true,
								ttl: 10000
							};
						});

					};

                    $timeout($scope.fetch);
                }]
        );

    }
);

/*
* base/frontend/paper_lantern/jetbackup/controllers/queues.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

/* global define: false, PAGE: false */

define("app/controllers/queues",[
        "lodash",
        "angular",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/loadingPanel",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/searchDirective",
        "cjt/directives/pageSizeDirective",
        "cjt/filters/startFromFilter",
        "cjt/decorators/paginationDecorator"
    ],
    function(_, angular, LOCALE) {

        var app;
        try {
            app = angular.module("cpanel.jetbackup");
        }
        catch(e) {
            app = angular.module("cpanel.jetbackup", []);
        }

        app.controller("queues",
            ["$rootScope", "$scope", "$interval", "$timeout", "jetapi", "growl", "$window",
                function($rootScope, $scope, $interval, $timeout, jetapi, growl, $window) {

                    var COMPONENT_NAME = "QueueTable";
                    $scope.queues = [];
					$scope.loadingQueue = false;
					$scope.sortedList = {};

					$scope.meta = {
						// pager settings
						maxPages: 5,
						totalItems: $scope.queues.length,
						currentPage: 1,
						pageSize: 10,
						pageSizes: [10, 20, 50, 100, 500],
						start: 0,
						limit: 10
					};

					var statusInterval;

					$scope.checkStatus = function () {

						if(angular.isDefined(statusInterval)) return;

						var runCheckStatus = false;
						$scope.sortedList = {};

						for(var i in $scope.queues)
						{
							if($scope.queues[i].status < 100)
							{
								$scope.sortedList[$scope.queues[i]._id] = $scope.queues[i];
								runCheckStatus = true;
							}
						}

						if(!runCheckStatus) return;

						statusInterval = $interval(function() {

							var apiPromise = jetapi.listQueueItems();
							$scope.fetchPromise = apiPromise;

							apiPromise.then(
								function(response) {

									// We only want to actually process the response if it's the last request we sent
									if( $scope.fetchPromise !== apiPromise ) return;

									var data = response.data.queue;
									var queued = 0;

									for(var i in data) {
										var _id = data[i]._id;
										if($scope.sortedList[_id] === undefined) continue;
										for(var k in data[i]) $scope.sortedList[_id][k] = data[i][k];
										if(data[i].status < 100) queued++;
									}

									if(!queued)
									{
										$interval.cancel(statusInterval);
										statusInterval=undefined;
									}
								},
								function(error) {
									growl.error(error);
								}
							);
						}, 5000);
					};

					$scope.fetch = function() {

						$scope.loadingQueue = true;
						$scope.meta.mobileItemCountText = undefined;

						var container = angular.element("#QueueList");

						if( container && container[0] ) {
							container.css({ minHeight: $window.getComputedStyle(container[0]).height });
						}

						var apiParams = {
							"skip": ($scope.meta.currentPage - 1) * $scope.meta.pageSize,
							"limit": $scope.meta.pageSize
						};

						var apiPromise = jetapi.listQueueItems(apiParams);
						$scope.fetchPromise = apiPromise;

						apiPromise.then(
							function(response) {

								// We only want to actually process the response if it's the last request we sent
								if( $scope.fetchPromise !== apiPromise ) {
									return;
								}

								var data = response.data.queue;
								$scope.meta.totalItems = response.data.total;

								if ($scope.meta.totalItems > _.min($scope.meta.pageSizes)) {
									$scope.showPager = true;
									var start = ($scope.meta.currentPage - 1) * $scope.meta.pageSize;
									$scope.meta.start = start + 1;
									$scope.meta.limit = start + data.length;

								} else {
									// hide pager and pagination
									$scope.showPager = false;

									if (data.length === 0) {
										$scope.meta.start = 0;
									} else {
										// table statistics
										$scope.meta.start = 1;
									}

									$scope.meta.limit = data.length;
								}

								$scope.meta.mobileItemCountText = LOCALE.maketext("Displaying [_1] to [_2] out of [_3] records",
									$scope.meta.start, $scope.meta.limit, $scope.meta.totalItems
								);

								angular.element("#QueueList").css({ minHeight: "" });
								$scope.queues = data;
								$scope.loadingQueue = false;
								$scope.checkStatus();
							},
							function(error) {
								growl.error(error);
								$scope.loadingQueue = false;
							}
						);

					};

                    $timeout($scope.fetch);
                }]
        );

    }
);

/*
* base/frontend/paper_lantern/jetbackup/controllers/settings.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

/* global define: false, PAGE: false */

define("app/controllers/gdpr",[
        "lodash",
        "angular",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/loadingPanel",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/searchDirective",
        "cjt/directives/pageSizeDirective",
        "cjt/filters/startFromFilter",
        "cjt/decorators/paginationDecorator"
    ],
    function(_, angular, LOCALE) {

        var app;
        try {
            app = angular.module("cpanel.jetbackup");
        }
        catch(e) {
            app = angular.module("cpanel.jetbackup", []);
        }

        app.controller("gdpr",
            ["$rootScope", "$scope", "$interval", "$timeout", "jetapi",
                function($rootScope, $scope, $interval, $timeout, jetapi) {

					$scope.status = undefined;
					$scope.settings = {enabled:false};
					$scope.showTerms = false;
					$scope.encryptionKey = '';
					$scope.submitEncryptionKey = '';
					$scope.loading = false;

					$scope.userAgreement = 0;
					$scope.privacyPolicy = 0;
					$scope.backupDestinations = 0;

					$scope.confirmTerms = function() {

						if(!$scope.showTerms) return;

						$scope.status = undefined;

						if(!$scope.userAgreement || !$scope.privacyPolicy || !$scope.backupDestinations){
							$scope.status = {
								message: LOCALE.maketext("You must agree to all terms in order to continue"),
								type: 'danger',
								closeable: true,
								ttl: 10000
							};
							return;
						}

						jetapi.manageGDPR({ iapprove: 1 }).then(function () {
							$scope.showTerms = false;
							window.PAGE.info.gdpr.termsagreed = true;
							$scope.fetch();
						}, function(error) {
							$scope.status = {
								message: LOCALE.maketext(error),
								type: 'danger',
								closeable: true,
								ttl: 10000
							};
						});
					};

					$scope.clearStatus = function () {
						$scope.saveChangesStatus = undefined;
					};

					$scope.saveChanges = function() {

						if($scope.settings.secretKey && !$scope.submitEncryptionKey) {
							$scope.status = {
								message: LOCALE.maketext("You must provide the encryption key"),
								type: 'danger',
								closeable: true,
								ttl: 10000
							};
							return;
						}

						$scope.encryptionKey = '';

						var apiParams = Object.assign({}, $scope.settings);
						delete apiParams.userAgreement;
						delete apiParams.privacyPolicy;

						for(var i in apiParams) if(typeof(apiParams[i]) === "boolean") apiParams[i] = apiParams[i] ? 1 : 0;

						if($scope.submitEncryptionKey) apiParams.secretKey = $scope.submitEncryptionKey;
						$scope.savingChanges = true;
						$scope.status = undefined;

						return jetapi.manageGDPR(apiParams).then(
							function(response) {
								$scope.savingChanges = false;
								$scope.submitEncryptionKey = '';
								$scope.status = {
									message: LOCALE.maketext("GDPR Settings saved successfully"),
									type: 'success',
									closeable: true,
									ttl: 10000
								};

								if(response.data.secret_key) {
									$scope.settings.secretKey = true;
									$scope.encryptionKey = response.data.secret_key;
								}

							},
							function(error) {
								$scope.savingChanges = false;
								$scope.submitEncryptionKey = '';
								$scope.status = {
									message: error,
									type: 'danger',
									closeable: true,
									ttl: 10000
								};
							}
						);
					};

					$scope.fetch = function () {
						if($scope.loading) return;
						$scope.loading = true;

						return jetapi.getGDPR().then(function(response) {

							$scope.loading = false;
							$scope.settings = response.data;
							$scope.showTerms = !$scope.settings.termsAgreed;

						}, function(error) {

							$scope.loading = false;
							$scope.saveChangesStatus = {
								message: error,
								type: "danger",
								closeable: true,
								ttl: 10000
							};
						});

					};

                    $timeout($scope.fetch);
                }]
        );

    }
);

/*
* base/frontend/paper_lantern/jetbackup/services/jetapi.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/
'use strict';

define("app/services/jetapi",[
		// Libraries
		"angular",
		"cjt/io/api",
		"cjt/io/uapi-request",
		"cjt/util/locale"
	],
	function(angular, API, APIREQUEST, LOCALE) {

	var app;
	try {
		app = angular.module("cpanel.jetbackup"); // For runtime
	}
	catch (e) {
		app = angular.module("cpanel.jetbackup", []); // Fall-back for unit testing
	}

	app.factory('jetapi', ["$q","APIService", function ($q, APIService) {

		var jetapi = function() {};
		jetapi.prototype = new APIService();

		angular.extend(jetapi.prototype, {
			getSettings: function (apiParams, callback, params) { return this._exec('getSettings', apiParams, callback, params); },
			manageSettings: function (apiParams, callback, params) { return this._exec('manageSettings', apiParams, callback, params); },
			getGDPR: function (apiParams, callback, params) { return this._exec('getGDPR', apiParams, callback, params); },
			manageGDPR: function (apiParams, callback, params) { return this._exec('manageGDPR', apiParams, callback, params); },
			getAccountDetails: function (apiParams, callback, params) { return this._exec('getAccountDetails', apiParams, callback, params); },
			getAccount: function (apiParams, callback, params) { return this._exec('getAccount', apiParams, callback, params); },
			manageAccount: function (apiParams, callback, params) { return this._exec('manageAccount', apiParams, callback, params); },
			getBackup: function (apiParams, callback, params) { return this._exec('getBackup', apiParams, callback, params); },
			listBackups: function (apiParams, callback, params) { return this._exec('listBackups', apiParams, callback, params); },
			manageBackup: function (apiParams, callback, params) { return this._exec('manageBackup', apiParams, callback, params); },
			addQueueRestore: function (apiParams, callback, params) { return this._exec('addQueueRestore', apiParams, callback, params); },
			addQueueSnapshot: function (apiParams, callback, params) { return this._exec('addQueueSnapshot', apiParams, callback, params); },
			calculateBackupSize: function (apiParams, callback, params) { return this._exec('calculateBackupSize', apiParams, callback, params); },
			deleteDownload: function (apiParams, callback, params) { return this._exec('deleteDownload', apiParams, callback, params); },
			getDownload: function (apiParams, callback, params) { return this._exec('getDownload', apiParams, callback, params); },
			getBackupDownloads: function (apiParams, callback, params) { return this._exec('getBackupDownloads', apiParams, callback, params); },
			addQueueDownload: function (apiParams, callback, params) { return this._exec('addQueueDownload', apiParams, callback, params); },
			getQueueItem: function (apiParams, callback, params) { return this._exec('getQueueItem', apiParams, callback, params); },
			listQueueItems: function (apiParams, callback, params) { return this._exec('listQueueItems', apiParams, callback, params); },
			cancelQueueItem: function (apiParams, callback, params) { return this._exec('cancelQueueItem', apiParams, callback, params); },
			fileManager: function (apiParams, callback, params) { return this._exec('fileManager', apiParams, callback, params); },

			_exec: function(cmd, apiParams, callback, params) {
				if (!apiParams) apiParams = {};
				apiParams.function = cmd;

				var apiCall = new APIREQUEST.Class();

				apiCall.initialize("JetBackup", cmd, apiParams);

				var deferred = $q.defer();
				var service = this;

				this.currentGetRequest = new APIService.AngularAPICall(apiCall, {
					done: function(response) {

						service.currentGetRequest = undefined;

						if( response.parsedResponse.error ) {
							deferred.reject(response.parsedResponse.error);
						}
						else {
							var result = response.parsedResponse;
							deferred.resolve(result);
						}
					},
					fail: function(a,b,c) {
						console.log(cmd,a,b,c);

						service.currentGetRequest = undefined;
					}
				});


				deferred.promise.then(function(response) {
					if(callback !== undefined && typeof callback === 'function') callback(response.data, params);
				});

				return deferred.promise;
			}
		});

		return new jetapi();
	}]);
});

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

define("app/filters/backupLocaleString",[
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

/*
* base/frontend/paper_lantern/jetbackup/directives/autoFocus.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

/* global define: false */

define("app/directives/focusInput",[
		// Libraries
		"angular"
	],
	function(angular) {

		var app;
		try {
			app = angular.module("cpanel.jetbackup"); // For runtime
		}
		catch (e) {
			app = angular.module("cpanel.jetbackup", []); // Fall-back for unit testing
		}

		app.directive('focusInput', [
			"$timeout",
			function($timeout) {

				return function(scope, element, attrs) {
					scope.$watch(attrs.focusInput,
						function (newValue) {
							$timeout(function() {
								newValue && element.focus();
							});
						},true);
				};
			}
		]);

	}
);

/*
* base/frontend/paper_lantern/jetbackup/libraries/utils.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

'use strict';

define("app/libraries/utils",[

	], function() {
	var UTILS = function() {};

	UTILS.prototype = {
		_timezone: null,
		_dateformat: { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' },
		_options: {
			code: "en-US",
			date: {
				short: { weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric' },
				shorttime: { weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' },
				long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
				longtime: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' }
			}
		},
		sizeToHumanReadable: function(bytes, si) {
			if(si === undefined) si = false;
			var unit = si ? 1000 : 1024;
			if (bytes < unit) return bytes + " B";
			var exp = parseInt(Math.log(bytes)/Math.log(unit));
			var pre = (si ? "kMGTPE" : "KMGTPE");
			pre = pre[exp-1];// + (si ? "" : "i");
			return (bytes/Math.pow(unit, exp)).toFixed(2) + " " + pre + "B";
		},
		setTimezone: function (timezone) {
			this._timezone = timezone;
		},
		date: function(time, format) {

			if(this._options.date[format] !== undefined) format = this._options.date[format];
			else format = this._dateformat;

			var date = new Date(time);
			if(this._timezone) format.timeZone = this._timezone;
			return date.toLocaleDateString(this._options.code, format);

		}
	};

	return new UTILS();
});

/*
* base/frontend/paper_lantern/jetbackup/index.dist.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

/* global require: false */


require(
	[
		"frameworksBuild",
		"locale!cjtBuild",
		"locale!app/index.cmb"
	],
	function(){
		require(
			[
				"master/master",
				"app/index"
			],
			function(MASTER, APP){
				MASTER();
				APP();
			}
		);
	}
);

