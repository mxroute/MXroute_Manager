(function() {

    "use strict";

    /* -----------------------------------------------*/
    /* Explicit JSHINT RULES                         */
    /* -----------------------------------------------*/
    /* jshint sub:true */
    /* global CPANEL:true, YAHOO:true, window:true, LOCALE */
    /* -----------------------------------------------*/

    // Shortcuts
    var VALIDATION = CPANEL.validate;
    var DOM = YAHOO.util.Dom;
    var EVENT = YAHOO.util.Event;
    var SSL = CPANEL.Applications.SSL;

    var MINIMUM_MODULUS_LENGTH = CPANEL.ssl.DEFAULT_KEY_SIZE;

    // Access page globals
    var PAGE = window.PAGE;

    var INSTALLABLE_DOMAINS = PAGE.properties.installable_domains;

    /**
     * This module contains all the code necessary to add the interactions
     * for the Generate Self-Signed Certificate (CRTS) form.
     * @module PAGE.Modules.GenerateCRTModule
     */

    /**
     * Contains the list of validators for the CSR form
     * @type {Array}
     */
    var VALIDATORS = [];

    var cjt_domain_warning;

    /**
     * Handles the domain validate success event
     * @method onSuccess
     */
    var onDomainsValidateSuccess = function(type, args) {
        if (cjt_domain_warning && INSTALLABLE_DOMAINS) {
            var domains = DOM.get("domains").value.trim().split(/[\s,;]+/);
            var domainCount = domains.length - 1;
            var nonMatchingDomains = [];
            while (domains[domainCount]) {
                if (domains[domainCount].length && !CPANEL.ssl.doesDomainMatchOneOf(domains[domainCount], INSTALLABLE_DOMAINS)) {
                    nonMatchingDomains.push(domains[domainCount]);
                }
                domainCount--;
            }

            if (nonMatchingDomains.length) {
                if (nonMatchingDomains.length === 1) {
                    cjt_domain_warning.setBody(LOCALE.maketext("You do not control this domain."));
                } else {
                    cjt_domain_warning.setBody(LOCALE.maketext("[numf,_1] of the [numerate,_2,domain,domains] that you have entered [numerate,_1,is a domain,are domains] that you do not control.", nonMatchingDomains.length, domains.length));
                }
                cjt_domain_warning.show();
            } else {
                cjt_domain_warning.hide();
            }
        }
    };

    /**
     * Handles the domain validate failure event.  It just hides the warning for now
     * @method onFailure
     */
    var onDomainsValidateFailure = function(type, args) {
        if (cjt_domain_warning) {
            cjt_domain_warning.hide();
        }
    };

    /**
     * Refresh the UI's display of the certificate's salient features.
     */

    function showCertParse() {
        var certText = DOM.get("crt").value.trim();
        var container = DOM.get("cert_parse");

        var shown = CPANEL.widgets.ssl.showCertificateParse(certText, container);
        DOM.setStyle(container, "display", shown ? "" : "none");
    }

    /**
     * Initialize the page: validation and event listeners
     * @method initialize
     */
    var initialize = function() {

        var search_warning = {
            "#ssltable .modulus-critical td.modulus-column": LOCALE.maketext("A key that does not use at least [numf,_1]-bit encryption does not provide adequate security.", MINIMUM_MODULUS_LENGTH)
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

        var i, l;

        cjt_domain_warning = new YAHOO.widget.Overlay("cjt_domain_warning", {
            visible: false,
            context: ["domains"].concat(CPANEL.validate.get_page_overlay_context_arguments())
        });
        cjt_domain_warning.render(document.body);
        DOM.addClass(cjt_domain_warning.element, "form-element-side-warning");

        var validation;

        validation = new VALIDATION.validator(LOCALE.maketext("Domain"));
        validation.add("domains", SSL.areValidSSLDomains, LOCALE.maketext("You can only enter valid domains."));
        validation.validateSuccess.subscribe(onDomainsValidateSuccess, this);
        validation.validateFailure.subscribe(onDomainsValidateFailure, this);
        VALIDATORS.push(validation);

        validation = new VALIDATION.validator(LOCALE.maketext("City"));
        validation.add("city", "min_length(%input%, 1)", LOCALE.maketext("The “[_1]” field cannot be left blank.", LOCALE.maketext("City")));
        VALIDATORS.push(validation);

        validation = new VALIDATION.validator(LOCALE.maketext("State"));
        validation.add("state", "min_length(%input%, 1)", LOCALE.maketext("The “[_1]” field cannot be left blank.", LOCALE.maketext("State")));
        VALIDATORS.push(validation);

        validation = new VALIDATION.validator(LOCALE.maketext("Country"));
        validation.add("country", "min_length(%input%, 2)", LOCALE.maketext("Choose a country."));
        VALIDATORS.push(validation);

        validation = new VALIDATION.validator(LOCALE.maketext("Company"));
        validation.add("company", "min_length(%input%, 1)", LOCALE.maketext("The “[_1]” field cannot be left blank.", LOCALE.maketext("Company")));
        validation.add("company", "max_length(%input%, 64)", LOCALE.maketext("The company name must be no longer than [quant,_1,character,characters].", 64));
        VALIDATORS.push(validation);

        validation = new VALIDATION.validator(LOCALE.maketext("Company Division"));
        validation.add("companydivision", "min_length(%input%, 1)", LOCALE.maketext("The “[_1]” field cannot be left blank.", LOCALE.maketext("Company Division")), SSL.isOptionalIfUndefined);
        validation.add("companydivision", "max_length(%input%, 64)", LOCALE.maketext("The company division must be no longer than [quant,_1,character,characters].", 64), SSL.isOptionalIfUndefined);
        VALIDATORS.push(validation);

        validation = new VALIDATION.validator(LOCALE.maketext("Email"));
        validation.add("email", "min_length(%input%, 1)", LOCALE.maketext("The “[_1]” field cannot be left blank.", LOCALE.maketext("Email")), SSL.isOptionalIfUndefined);
        validation.add("email", "email(%input%)", LOCALE.maketext("Please use an email format (for example: [asis,user@example.com])."), SSL.isOptionalIfUndefined);
        VALIDATORS.push(validation);

        // Attach the validators.
        for (i = 0, l = VALIDATORS.length; i < l; i++) {
            VALIDATORS[i].attach();
        }

        VALIDATION.attach_to_form("submit-button", VALIDATORS, {
            no_panel: true,
            success_callback: handle_single_submission_lockout
        });

        var events_to_listen = CPANEL.dom.has_oninput ? ["input"] : ["paste", "keyup", "change"];
        events_to_listen.forEach(function(evt) {
            EVENT.on("crt", evt, showCertParse);
        });

        showCertParse();

        /**
         * Sets focus to the key fields unless there is only one
         * valid key, in which case, it moves on to the domain field.
         * @method generate_set_focus
         */
        var generate_set_focus = function() {
            var keysEl = DOM.get("key_id");
            if (keysEl && keysEl.options.length >= 1 && keysEl.options[0].value !== "") {

                // Focus on keys if there are choices
                keysEl.focus();
                keysEl.selectedIndex = 0;
            } else {

                // Otherwise, start at domain.
                var domainsEl = DOM.get("domains");
                if (domainsEl) {
                    domainsEl.focus();
                }
            }
        };

        /**
         * Sets focus to the first link in the lister if available.
         * @method lister_set_focus
         */
        var lister_set_focus = function() {
            var firstAction = DOM.get("show-cert-0");
            if (firstAction) {
                firstAction.focus();
            }
        };

        if (!window.location.hash) {
            if (!PAGE.properties.has_certs_data) {
                generate_set_focus();
            } else {
                lister_set_focus();
            }
        }

        if (PAGE.properties.desiredKey) {

            // The user generated a new key to use for this so select it.
            var desiredKey = PAGE.properties.desiredKey;
            var keysEl = DOM.get("key_id");
            if (keysEl && keysEl.options.length > 0) {
                for (i = 0, l = keysEl.options.length; i < l; i++) {
                    var opt = keysEl.options[i];
                    if (opt.value === desiredKey) {
                        keysEl.selectedIndex = i;
                    }
                }
            }
        }

        EVENT.on("upload", "submit", handle_single_submission_lockout);

        if (DOM.get("view-key")) {
            var updateViewKeyLink = function(e) {
                var selectedIndex = this.selectedIndex;
                if (selectedIndex > -1) {
                    if (this.options[selectedIndex].value) {
                        DOM.setStyle("view-key", "visibility", "");
                    } else {
                        DOM.setStyle("view-key", "visibility", "hidden");
                    }
                }
            };

            updateViewKeyLink.call(DOM.get("key_id"));

            EVENT.on("key_id", "change", updateViewKeyLink);

            EVENT.on("view-key", "click", function(e) {
                EVENT.preventDefault(e);
                var keysEl = DOM.get("key_id");
                if (keysEl.selectedIndex > -1) {
                    var optionEl = keysEl.options[keysEl.selectedIndex];
                    if (optionEl.value) {
                        window.open("viewkey.html?ref=csrs&id=" + encodeURIComponent(optionEl.value));
                    }
                }
                return false;
            });
        }

        EVENT.on(["upload-link", "upload2-link"], "click", function(e) {
            EVENT.preventDefault(e);
            var windowScroll = new CPANEL.animate.WindowScroll("upload");

            windowScroll.onComplete.subscribe(function() {
                var field = DOM.get("crt");
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

        EVENT.on(["top-link", "top2-link"], "click", function(e) {
            EVENT.preventDefault(e);
            var windowScroll = new CPANEL.animate.WindowScroll("top");

            windowScroll.onComplete.subscribe(lister_set_focus);
            windowScroll.animate();
            return false;
        });
    };

    // Register startup events.
    YAHOO.util.Event.onDOMReady(initialize);

}());
