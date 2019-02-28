/*
 * home/services/statisticsService.js        Copyright(c) 2015 cPanel, Inc.
 *                                                                 All rights Reserved.
 * copyright@cpanel.net                                               http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false */

define(
    [

        // Libraries
        "lodash",
        "angular",
        "cjt/io/uapi-request",
        "cjt/services/APICatcher",
    ],
    function(_, angular, APIREQUEST) {
        "use strict";

        // Fetch the current application
        var app = angular.module("App");

        /**
         * Setup the account list model's API service
         */
        app.factory("statisticsService", ["APICatcher",
            function(api) {

                function _mungeData(data) {
                    for (var i = 0; i < data.length; i++) {
                        var item = data[i];

                        item.maximum = item.maximum && parseInt( item.maximum, 10 );

                        var isLimited = (item.maximum !== null);
                        var percent = isLimited ? parseFloat((100 * item.usage / item.maximum).toFixed(2)) : 0;

                        _.assign(
                            item,
                            {
                                isLimited: isLimited,
                                percent: percent,
                                needFix: percent >= 60,
                            }
                        );
                    }

                    return data;
                }

                // return the factory interface
                return {

                    /**
                     * Get extended stats.
                     * @return {Promise} - Promise that will fulfill the request.
                     */
                    fetchExtendedStats: function() {
                        var apicall = new APIREQUEST.Class().initialize("ResourceUsage", "get_usages");
                        return api.promise(apicall).then( function(resp) {
                            _mungeData(resp.data);
                            return resp.data;
                        } );
                    }
                };
            }
        ]);
    }
);
