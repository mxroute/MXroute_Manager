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

define(
    [
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