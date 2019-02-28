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