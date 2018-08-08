(function() {

    /* -----------------------------------------------*/
    /* Explicit JSHINT RULES                         */
    /* -----------------------------------------------*/
    /* jshint sub:true */
    /* global CPANEL:true, YAHOO:true, window:true, LOCALE */
    /* -----------------------------------------------*/

    // Imports
    var VALIDATION = CPANEL.validate;
    var DOM = YAHOO.util.Dom;
    var EVENT = YAHOO.util.Event;
    var SSL = CPANEL.Applications.SSL;

    // Access page globals
    var PAGE = window.PAGE;

    var INSTALLABLE_DOMAINS = PAGE.properties.installable_domains;

    /**
     * This module contains all the code necessary to add the interactions
     * for the Generate Certificate Signing Request (CSR) form.
     * @module PAGE.Modules.GenerateCSRModule
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
            var strippedDomain;
            while (domains[domainCount]) {
                strippedDomain = domains[domainCount].replace(/^www\./, "");
                if (strippedDomain.length && !CPANEL.ssl.doesDomainMatchOneOf(strippedDomain, INSTALLABLE_DOMAINS)) {
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
     * Event listener for fields that should trigger warnings on
     * "special" characters.
     *
     * @method warnOnSpecialCharacters
     * @param evt {Event} the YUI Event that tracks the DOM event
     * @param notice {Module} the YUI Module to show/hide for the warning
     */

    function warnOnSpecialCharacters(evt, notice) {
        if (this.value.match(/[^0-9a-zA-Z-,. ]/)) {
            notice.show();
        } else {
            notice.hide();
        }
    }

    /**
     * Initialize the page validation
     * @method initialize
     */
    var initialize = function() {
        var i, l;

        cjt_domain_warning = new YAHOO.widget.Overlay("cjt_domain_warning", {
            visible: false,
            context: ["domains"].concat(CPANEL.validate.get_page_overlay_context_arguments())
        });
        cjt_domain_warning.render(document.body);
        DOM.addClass(cjt_domain_warning.element, "form-element-side-warning");

        var validation = new VALIDATION.validator(LOCALE.maketext("Domains"));
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
        validation.add("email", "email(%input%)", LOCALE.maketext("Make sure to use a valid email format. For example, [asis,user@domain.com]."), SSL.isOptionalIfUndefined);
        VALIDATORS.push(validation);

        validation = new VALIDATION.validator(LOCALE.maketext("Passphrase"));
        validation.add("pass", "min_length(%input%, 4)", LOCALE.maketext("The certificate signing request passphrase must be at least [quant,_1,character,characters] long.", 4), SSL.isOptionalIfUndefined);
        validation.add("pass", "max_length(%input%, 20)", LOCALE.maketext("The passphrase must be no longer than [quant,_1,character,characters].", 20), SSL.isOptionalIfUndefined);
        validation.add("pass", "alphanumeric", LOCALE.maketext("The certificate signing request passphrase can contain only alphanumeric characters."), SSL.isOptionalIfUndefined);
        VALIDATORS.push(validation);

        // Attach the validators.
        for (i = 0, l = VALIDATORS.length; i < l; i++) {
            VALIDATORS[i].attach();
        }

        VALIDATION.attach_to_form("submit-button", VALIDATORS, {
            no_panel: true,
            success_callback: handle_single_submission_lockout
        });

        var ca_warning = LOCALE.maketext("This field contains characters that some certificate authorities may not accept. Contact your certificate authority to confirm that they accept these characters.");

        var companyNotice = new CPANEL.widgets.Page_Notice({
            container: "company_warning",
            level: "warn",
            content: ca_warning,
            visible: false
        });

        var divisionNotice = new CPANEL.widgets.Page_Notice({
            container: "companydivision_warning",
            level: "warn",
            content: ca_warning,
            visible: false
        });

        var events_to_listen = CPANEL.dom.has_oninput ? ["input"] : ["paste", "keyup", "change"];
        events_to_listen.forEach(function(evt) {
            EVENT.on("company", evt, warnOnSpecialCharacters, companyNotice);
            EVENT.on("companydivision", evt, warnOnSpecialCharacters, divisionNotice);
        });

        /**
         * Sets focus to the key fields unless there is only one
         * valid key, in which case, it moves on to the domain field.
         * @method generate_set_focus
         */
        var generate_set_focus = function() {
            var keysEl = DOM.get("key");
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
            var firstAction = DOM.get("show-csr-0");
            if (firstAction) {
                firstAction.focus();
            }
        };

        if (!window.location.hash) {
            if (!PAGE.properties.has_csr_data) {
                generate_set_focus();
            } else {
                lister_set_focus();
            }
        }

        if (PAGE.properties.desiredKey) {

            // The user generated a new key to use for this so select it.
            var desiredKey = PAGE.properties.desiredKey;
            var keysEl = DOM.get("key");
            if (keysEl && keysEl.options.length > 0) {
                for (i = 0, l = keysEl.options.length; i < l; i++) {
                    var opt = keysEl.options[i];
                    if (opt.value === desiredKey) {
                        keysEl.selectedIndex = i;
                    }
                }
            }
        }

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

            updateViewKeyLink.call(DOM.get("key"));

            EVENT.on("key", "change", updateViewKeyLink);

            EVENT.on("view-key", "click", function(e) {
                EVENT.preventDefault(e);
                var keysEl = DOM.get("key");
                if (keysEl.selectedIndex > -1) {
                    var optionEl = keysEl.options[keysEl.selectedIndex];
                    if (optionEl.value) {
                        window.open("viewkey.html?ref=csrs&id=" + encodeURIComponent(optionEl.value));
                    }
                }
                return false;
            });
        }

        EVENT.on("generate-link", "click", function(e) {
            EVENT.preventDefault(e);
            var windowScroll = new CPANEL.animate.WindowScroll(DOM.get("generate"));
            windowScroll.onComplete.subscribe(generate_set_focus);
            windowScroll.animate();
            return false;
        });

        EVENT.on("top-link", "click", function(e) {
            EVENT.preventDefault(e);
            var windowScroll = new CPANEL.animate.WindowScroll(DOM.get("top"));
            windowScroll.onComplete.subscribe(lister_set_focus);
            windowScroll.animate();
            return false;
        });
    };

    // Register startup events.
    YAHOO.util.Event.onDOMReady(initialize);

}());
