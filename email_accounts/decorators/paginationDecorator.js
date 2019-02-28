/*
# cjt/decorators/paginationDecorator.js             Copyright(c) 2014 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
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
