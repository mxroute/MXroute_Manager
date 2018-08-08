(function() {

    "use strict";

    /* -----------------------------------------------*/
    /* Explicit JSHINT RULES                         */
    /* -----------------------------------------------*/
    /* jshint sub:true */
    /* global CPANEL:true, YAHOO:true, window:true */
    /* -----------------------------------------------*/

    // Shortcuts
    var DOM = YAHOO.util.Dom;
    var EVENT = YAHOO.util.Event;
    var SSL = CPANEL.Applications.SSL;

    // Access page globals
    var PAGE = window.PAGE;

    var MINIMUM_MODULUS_LENGTH = CPANEL.ssl.DEFAULT_KEY_SIZE;

    /**
     * This module contains all the code necessary to add the interactions
     * for the List/Generate Private Key (KEYS) form.
     * @module PAGE.Modules.GenerateKEYModule
     */

    /**
     * Initialize the page validation
     * @method initialize
     */
    var initialize = function() {

        /**
         * Sets focus to the key size fields unless there is only one
         * valid key size, in which case, it moves on to the name field.
         * @method generate_set_focus
         */
        var generate_set_focus = function() {
            var keySizeEl = DOM.get("keysize");
            if (keySizeEl && keySizeEl.options.length >= 1 && keySizeEl.options[0].value !== "") {

                // Focus on keys if there are choices
                keySizeEl.focus();
            } else {

                // Otherwise, start at name.
                DOM.get("gen-fname").focus();
            }
        };

        /**
         * Sets focus to the first link in the lister if available.
         * @method lister_set_focus
         */
        var lister_set_focus = function() {
            var firstAction = DOM.get("view-key-0");
            if (firstAction) {
                firstAction.focus();
            }
        };

        if (!window.location.hash) {
            if (!PAGE.properties.has_keys_data) {
                generate_set_focus();
            } else {
                lister_set_focus();
            }
        }

        EVENT.on(["upload-link", "upload2-link"], "click", function(e) {
            EVENT.preventDefault(e);
            var windowScroll = new CPANEL.animate.WindowScroll("upload");

            windowScroll.onComplete.subscribe(function() {
                var field = DOM.get("key");
                if (field) {
                    field.focus();
                }
            });
            windowScroll.animate();
            return false;
        });

        EVENT.on(["generate-link", "generate2-link"], "click", function(e) {
            EVENT.preventDefault(e);
            var windowScroll = new CPANEL.animate.WindowScroll("generate");

            windowScroll.onComplete.subscribe(generate_set_focus);
            windowScroll.animate();
            return false;
        });

        EVENT.on(["list-link", "list2-link"], "click", function(e) {
            EVENT.preventDefault(e);
            var windowScroll = new CPANEL.animate.WindowScroll("top");
            windowScroll.onComplete.subscribe(lister_set_focus);
            windowScroll.animate();
            return false;
        });

        var search_warning = {
            "#ssltable .modulus-critical td.size-column": LOCALE.maketext("A key that does not use at least [numf,_1]-bit encryption does not provide adequate security.", MINIMUM_MODULUS_LENGTH)
        };

        for (var search in search_warning) {
            var els = CPANEL.Y.all(search);
            for (var e = els.length - 1; e >= 0; e--) {
                var cell = els[e];
                new CPANEL.widgets.Touch_Tooltip({
                    context: CPANEL.Y(cell).one("img"),
                    container: cell,
                    text: search_warning[search]
                });
            }
        }

        // Setup the single submit lockouts
        EVENT.on("uploadkey", "submit", handle_single_submission_lockout);
        EVENT.on("uploadkey2", "submit", handle_single_submission_lockout);
        EVENT.on("genkey", "submit", handle_single_submission_lockout);
    };

    // Register startup events.
    YAHOO.util.Event.onDOMReady(initialize);

}());
