/*
 * services/sseCloneApi.js                            Copyright 2018 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false */

define([
    "angular",
    "lodash"
], function(
        angular,
        _
    ) {
    "use strict";

    var app = angular.module("cpanel.versionControl.sseAPIService", []);

    app.factory("sseAPIService", [
        "$rootScope",
        function(
            $rootScope
        ) {

            /**
             * Format the data based on the configuration requested.
             * Currently only has the option to convert from string to JSON if config.json is true.
             *
             * @param  {Object} config - SSE configuration
             * @param  {String} data
             * @return {Any}
             */
            var _formatData = function(config, data) {
                if (config && config.json && data) {
                    data = JSON.parse(data);
                }
                return data;
            };

            /**
             * Custom event sent when JSON parsing is requested but fails for some reason.
             *
             * @event sse:<eventName>:error
             * @property {Object} data
             *   @property {String} data.error - Error message from the JSON parser.
             *   @property {String} data.data  - Data passed with the message that could not be parsed.
             */

            /**
             * Custom event sent.
             *
             * @event sse:<eventName>
             * @property {Object} data
             */

            /**
             * Send a format error if the parsing fails
             *
             * @param {String} eventName
             * @param {String} exception
             * @param {String} data
             * @fires sse:<evenName>:error
             */
            var _sendFormatErrorEvent = function(eventName, exception, data) {
                $rootScope.$broadcast(
                    "sse:" + eventName + ":error",
                    {
                        data: data,
                        error: exception
                    }
                );
            };

            /**
             * Create a message event handler callback. The callback will annotate the event with
             * a eventName field and will generated an angularjs event with the following name:
             *
             *   sse:<eventName>
             *
             * If a data element is available it will send the data along with the event in the
             * data field.
             *
             *
             * @param  {String} eventName The name of the event.
             * @param  {Object} config configuration
             * @return {Function}
             */
            var makeHandler = function(eventName, config) {
                return function(e) {
                    e.eventName = eventName;
                    var data = e.data;
                    try {
                        data = _formatData(config, data);
                    } catch (exception) {
                        _sendFormatErrorEvent(eventName, exception, data);
                        return;
                    }

                    $rootScope.$broadcast("sse:" + eventName, data);
                };
            };

            /**
             * Fired when the sse process is done.
             *
             * @event sse:done
             */

            /**
             * Fired when sse generated an error.
             *
             * @event sse:error
             */

            /**
             * Fired when the sse is running and the page is being unloaded.
             *
             * @event sse:beforeunload
             */

            /**
             * Connect the specified SSE url fire an angular event for the requested events.
             *
             * @param {String} url - url to connect to the sse event source.
             * @param {Array[String]} [events]  - array of additional events to register.
             * @param {Object}        [config]  - optional configuration options
             *   @param {Boolean} [config.json] - if true, will parse the e.data as json. otherwise, just returns the data to the caller as is.
             * @fires sse:beforeunload, sse:error, sse:done, sse:*
             */
            var connect = function connect(url, events, config) {

                if (!events) {
                    events = [];
                }

                var sseConfig = config || {};

                var sse = new EventSource(url);

                // Setup known events
                if (events) {
                    events.forEach(function(event) {
                        sse.addEventListener(event, makeHandler(event, sseConfig));
                    });
                }

                // Setup the error event handler
                sse.onerror = function(e) {
                    $rootScope.$broadcast("sse:error", e);
                };

                // Setup the beforeunload event handler
                window.addEventListener("beforeunload", function(e) {
                    if (sse) {
                        sse.close();
                        sse = null;
                        $rootScope.$broadcast("sse:beforeunload", e);
                    }
                });

                return sse;
            };

            /**
             * Fired when the sse polyfill is loaded when needed. It will fire both
             * when the polyfill is needed and finished loading and when the polyfill
             * is not needed.
             *
             * @event sse:ready
             */

            /**
             * Initialize the SSE resources
             *
             * @param {Function} [ready] Optional callback to call when the sse is ready to run.
             * @fires sse:ready
             */
            var initialize = function initialize(ready) {

                // Microsoft browsers (including Edge)
                // don’t support SSE as of November 2017.
                // https://developer.microsoft.com/en-us/microsoft-edge/platform/status/serversenteventseventsource/
                if (!window.EventSource) {
                    var script = document.createElement("script");
                    script.src = "/libraries/eventsource-polyfill/eventsource.js";
                    script.onload = function() {
                        if (ready) {
                            ready();
                        }
                        $rootScope.$broadcast("sse:ready");
                    };
                    document.body.appendChild(script);
                } else {
                    if (ready) {
                        ready();
                    }
                    $rootScope.$broadcast("sse:ready");
                }
            };

            /**
             * Close the sse connection and clean up the sseApi state.
             *
             * @param {Object} SSE object
             */
            var close = function(sse) {
                if (sse) {
                    sse.close();
                }
            };

            return {
                initialize: initialize,
                connect: connect,
                close: close
            };
        }
    ]);
});
