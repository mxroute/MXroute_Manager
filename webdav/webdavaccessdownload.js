/* jshint evil: true, nonew: false */
/* global PAGE: true */
(function() {

    /**
     * This script provides the infrastructure for the webdavaccessdownloadinclude.html page. Its
     * primary purpose is to run the page animations switching between the various instruction sets.
     * @page webdavaccessdownloadinclude.html
     * @module webdavaccessdownloadinclude
     * @requires yahoo, dom
     */

    // Short-cuts
    var DOM = YAHOO.util.Dom;
    var EVENT = YAHOO.util.Event;

    // Constants
    var SSL_DOMAIN_INDEX = 0;
    var IS_SELF_SIGNED_CERT_INDEX = 1;

    // Globals
    var ssl_info = PAGE.ssl_info;
    var domain = PAGE.domain;
    var standardport = PAGE.standardport;
    var sslport =  PAGE.sslport;
    var hasDigest = PAGE.hasDigest;
    var requireSSL = PAGE.requireSSL;


    var ssldomain = encodeURIComponent(ssl_info[SSL_DOMAIN_INDEX]);
    var is_self_signed = ssl_info[IS_SELF_SIGNED_CERT_INDEX];

    var selected_manufacturer;
    var selected_os;
    var download_url;
    var created_page_notice;

    if (!ssldomain) {
        window.alert("Failed to run api call SSL::getcnname"); // BAD
    }

    /**
    * List of the manufactures for OS's
    **/
    var manufacturers = {
        "microsoft": 1,
        "apple": 1,
        "unix": 1,
        "mobile": 1
    };

    /**
    * List of the Operating Systems and their configurations for WebDisk/WebDav
    **/
    var os_configurations = {
        nautilus: {
            name: "nautilus",
            requires_digest_if_self_signed: false,
            ssl_ok_unsigned: true,
            ssl_ok_wild_card: true,
            manufacturer: "unix",
            show_patch: false,
            basic_auth_cleartext_ok: true
        },
        konqueror: {
            name: "konqueror",
            requires_digest_if_self_signed: false,
            ssl_ok_unsigned: true,
            ssl_ok_wild_card: true,
            manufacturer: "unix",
            show_patch: false,
            basic_auth_cleartext_ok: true
        },
        win98: {
            name: "win98",
            requires_digest_if_self_signed: false,
            ssl_ok_unsigned: true,
            ssl_ok_wild_card: true,
            manufacturer: "microsoft",
            show_patch: false,
            basic_auth_cleartext_ok: true
        },
        win2000: {
            name: "win2000",
            requires_digest_if_self_signed: false,
            ssl_ok_unsigned: true,
            ssl_ok_wild_card: true,
            manufacturer: "microsoft",
            show_patch: false,
            basic_auth_cleartext_ok: true
        },
        win2003: {
            name: "win2003",
            requires_digest_if_self_signed: false,
            ssl_ok_unsigned: true,
            ssl_ok_wild_card: true,
            manufacturer: "microsoft",
            show_patch: true,
            basic_auth_cleartext_ok: true
        },
        win2008: {
            name: "win2008",
            requires_digest_if_self_signed: false,
            ssl_ok_unsigned: true,
            ssl_ok_wild_card: true,
            "os": "microsoft",
            show_patch: true,
            basic_auth_cleartext_ok: true
        },
        winxp: {
            name: "winxp",
            requires_digest_if_self_signed: false,
            ssl_ok_unsigned: true,
            ssl_ok_wild_card: true,
            manufacturer: "microsoft",
            show_patch: true,
            basic_auth_cleartext_ok: true
        },
        winvista: {
            name: "winvista",
            requires_digest_if_self_signed: true,
            ssl_ok_unsigned: false,
            ssl_ok_wild_card: true,
            manufacturer: "microsoft",
            show_patch: true,
            basic_auth_cleartext_ok: false
        },
        win7: {
            name: "win7",
            requires_digest_if_self_signed: true,
            ssl_ok_unsigned: false,
            ssl_ok_wild_card: true,
            manufacturer: "microsoft",
            show_patch: false,
            basic_auth_cleartext_ok: false
        },
        win8: {
            name: "win8",
            requires_digest_if_self_signed: true,
            ssl_ok_unsigned: false,
            ssl_ok_wild_card: true,
            manufacturer: "microsoft",
            show_patch: false,
            basic_auth_cleartext_ok: false
        },
        win10: {
            name: "win10",
            requires_digest_if_self_signed: true,
            ssl_ok_unsigned: false,
            ssl_ok_wild_card: true,
            manufacturer: "microsoft",
            show_patch: false,
            basic_auth_cleartext_ok: false
        },
        bitkinex: {
            name: "bitkinex",
            requires_digest_if_self_signed: false,
            ssl_ok_unsigned: true,
            ssl_ok_wild_card: true,
            manufacturer: "microsoft",
            show_patch: false,
            basic_auth_cleartext_ok: true
        },
        osx: {
            name: "osx",
            requires_digest_if_self_signed: false,
            ssl_ok_unsigned: false,
            ssl_ok_wild_card: true,
            manufacturer: "apple",
            show_patch: false,
            basic_auth_cleartext_ok: true
        },
        osx105: {
            name: "osx105",
            requires_digest_if_self_signed: false,
            ssl_ok_unsigned: true,
            ssl_ok_wild_card: true,
            manufacturer: "apple",
            show_patch: false,
            basic_auth_cleartext_ok: true
        },
        transmit: {
            name: "transmit",
            requires_digest_if_self_signed: false,
            ssl_ok_unsigned: true,
            ssl_ok_wild_card: true,
            manufacturer: "apple",
            show_patch: false,
            basic_auth_cleartext_ok: true
        },
        ipad: {
            name: "ipad",
            requires_digest_if_self_signed: false,
            ssl_ok_unsigned: true,
            ssl_ok_wild_card: true,
            manufacturer: "mobile",
            show_patch: false,
            basic_auth_cleartext_ok: true
        },
        ipod: {
            name: "ipod",
            requires_digest_if_self_signed: false,
            ssl_ok_unsigned: true,
            ssl_ok_wild_card: true,
            manufacturer: "mobile",
            show_patch: false,
            basic_auth_cleartext_ok: true
        },
        iphone: {
            name: "iphone",
            requires_digest_if_self_signed: false,
            ssl_ok_unsigned: true,
            ssl_ok_wild_card: true,
            manufacturer: "mobile",
            show_patch: false,
            basic_auth_cleartext_ok: true
        },
        android: {
            name: "android",
            requires_digest_if_self_signed: false,
            ssl_ok_unsigned: true,
            ssl_ok_wild_card: true,
            manufacturer: "mobile",
            show_patch: false,
            basic_auth_cleartext_ok: true
        }
    };

    /**
    Tests if the app supports ssl, falls back to ssl if not self-signed
    * or app supports self-signed or the system has provided a fallback ssldomain.
    * * @method does_support_ssl
    * @param {String} os os unique identifier. */
    function does_support_ssl(os) {
        if (is_self_signed) {
            return os_configurations[os]["ssl_ok_unsigned"];
        }

        return true;
    }

    /**
    * Tests if the app supports basic auth over a cleartext channel
    * @method supports_basic_auth_cleartext
    * @param {String} os os unique identifier. */
    function supports_basic_auth_cleartext(os) {
        return os_configurations[os]["basic_auth_cleartext_ok"];
    }

    /**
    * Sets up the web dav configuration instructions before the instructions
    * are transitioned using the animation. Triggers the animation at the end.
    * @method setup_dav_instructions */
    function setup_dav_instructions() {
        var manufacturer = selected_manufacturer;
        var ssl = 0;
        var form = document.davdown;

        var droplist = form[manufacturer];
        var option = droplist.options[droplist.selectedIndex];
        var os = option.value;

        if (does_support_ssl(os) && DOM.get("ssl").checked ) {
            ssl = 1;
            document.getElementById("infoNonSSL").style.display = "none";
            document.getElementById("infoSSL").style.display = "block";
        } else {
            document.getElementById("infoNonSSL").style.display = "block";
            document.getElementById("infoSSL").style.display = "none";
        }

        download_url = "";

        if (os.match(/^osx/)) {
            if (ssl) {
                download_url = PAGE.token + "/backend/webdisksetup.cgi?" + ssldomain + "%7c1%7c" + (os === "osx105" ? "10.5" : "10.4") + "%7c" + sslport;
            } else {
                download_url = PAGE.token + "/backend/webdisksetup.cgi?" + domain + "%7c0%7c" + (os === "osx105" ? "10.5" : "10.4") + "%7c" + standardport;
            }
        }

        if (os === "win98" || os === "win2000" || os === "win2003") {
            if (ssl) {
                download_url = PAGE.token + "/backend/webdiskvbs.cgi?" + ssldomain + "%7c1%7c" + sslport;
            } else {
                download_url = PAGE.token + "/backend/webdiskvbs.cgi?" + domain + "%7c0%7c" + standardport;
            }

        }


        if (os === "winxp") {
            if (ssl) {
                download_url = PAGE.token + "/backend/webdiskvbs.cgi?" + ssldomain + "%7c1%7c" + sslport;
            } else {
                download_url = PAGE.token + "/backend/webdiskvbs.cgi?" + domain + "%7c0%7c" + standardport;
            }

        }

        if (os === "winvista") {
            if (ssl) {
                download_url = PAGE.token + "/backend/webdiskvbs-vista.cgi?" + ssldomain + "%7c1";
            } else {
                download_url = PAGE.token + "/backend/webdiskvbs-vista.cgi?" + domain + "%7c0";
            }

        }

        if (os === "win7") {
            if (ssl) {
                download_url = PAGE.token + "/backend/webdiskvbs-vista.cgi?" + ssldomain + "%7c1";
            } else {
                download_url = PAGE.token + "/backend/webdiskvbs-vista.cgi?" + domain + "%7c0";
            }

        }

        if (os === "win8") {
            if (ssl) {
                download_url = PAGE.token + "/backend/webdiskvbs-vista.cgi?" + ssldomain + "%7c1";
            } else {
                download_url = PAGE.token + "/backend/webdiskvbs-vista.cgi?" + domain + "%7c0";
            }

        }

        if (os === "win10") {
            if (ssl) {
                download_url = PAGE.token + "/backend/webdiskvbs-vista.cgi?" + ssldomain + "%7c1";
            } else {
                download_url = PAGE.token + "/backend/webdiskvbs-vista.cgi?" + domain + "%7c0";
            }
        }

        if (os === "konqueror") {
            if (ssl) {
                download_url = PAGE.token + "/backend/webdiskdesktop.cgi?" +  ssldomain + "%7c1%7c" + sslport;
            } else {
                download_url = PAGE.token + "/backend/webdiskdesktop.cgi?" + domain + "%7c0%7c" + standardport;
            }
        }

        if (os === "nautilus") {
            if (ssl) {
                download_url = PAGE.token + "/backend/webdiskdesktop.cgi?" +  ssldomain + "%7c1%7c" + sslport + "%7cnautilus";
            } else {
                download_url = PAGE.token + "/backend/webdiskdesktop.cgi?" + domain + "%7c0%7c" + standardport + "%7cnautilus";
            }
        }

        setup_ssl_display();
    }

    /**
    * Loads the current os and current version of that os in the related global
    * variables for further processing unless they are already loaded???
    * @method get_current_selected_os
    * @param {HTMLElement} Optional element */
    function get_current_selected_os(thisSelectEl) {
        selected_manufacturer = "";
        selected_os = "";
        for (var manufacturer in manufacturers) {
            if (manufacturers.hasOwnProperty(manufacturer)) {
                var selectBox = DOM.get("dav-select-" + manufacturer);
                if ( thisSelectEl ) {
                    if ( thisSelectEl.id !== selectBox.id ) {
                        continue;
                    }
                }

                if (selectBox.selectedIndex !== 0) {
                    selected_manufacturer = manufacturer;
                    selected_os = selectBox.options[selectBox.selectedIndex].value;
                    break;
                }
            }
        }
    }

    /**
    * Loads the current os and current version of that os in the related global
    * variables for further processing unless they are already loaded???
    * @method highlight_current_selected_manufacturer */
    function highlight_current_selected_manufacturer() {
        for (var manufacturer in manufacturers) {
            if (manufacturers.hasOwnProperty(manufacturer)) {
                if (manufacturer === selected_manufacturer) {
                    DOM.replaceClass(manufacturer + "-group", "os-not-selected", "os-selected");
                } else {
                    DOM.replaceClass(manufacturer + "-group", "os-selected", "os-not-selected");
                    DOM.get("dav-select-" + manufacturer).selectedIndex = 0;
                }
            }
        }
    }

    /**
    * Finds the detected operating system name by looking it up in the lists
    * @method findDetectedOSName
    * @param [Hash] detected - structure containing detected os information. */
    function findDetectedOSName(detected) {
        var osName = "";
        if (detected && detected.found && detected.configuration) {
            var optionToSelectEl = DOM.get("app_" + detected.configuration);
            if ( optionToSelectEl ) {
                osName = optionToSelectEl.innerHTML;
            }
        }
        return osName;
    }

    /**
    * Event handler triggered by the onchange event for the OS drop lists.
    * @method onOsSelect
    */
    function onOsSelect(e) {
        DOM.get("ssl").checked = true;

        get_current_selected_os(this);

        selectCurrentOSInstructions();
    }

    /**
     * Select the correct set of instructions based on the currently
     * selected operating system.
     * @method selectCurrentOSInstructions
     */
    function selectCurrentOSInstructions() {

        if (!selected_os) {
            return;
        }

        highlight_current_selected_manufacturer();

        setup_dav_instructions();
    }

    /**
    * Shows the download script for the current OS if the download url is set.
    * @method show_helper_area */
    function show_helper_area() {

        CPANEL.animate.slide_down( "helper_area" );

        if (download_url && download_url !== "") {
            document.getElementById("btnDownloadQuickStartScript").style.display = "inline";
        } else {
            document.getElementById("btnDownloadQuickStartScript").style.display = "none";
        }

        ssl_domain_notice();
    }

    /**
    * Creates and shows/hides the ssl domain notice. Used to display information
    * about alternative ways to connect to use SSL connections. Its an escallation
    * procedure if your personal domain does not have a signed certificate, you
    * can use the host certificate by useing the domain for the box instead.
    * @method ssl_domain_notice */
    function ssl_domain_notice() {

        // Hide the notice container
        hide("cjt_pagenotice_container");

        // Create it if necessary
        if (!created_page_notice && !is_self_signed) {
            new CPANEL.widgets.Page_Notice( {
                level: "info", // can also be "warn", "error", "success"
                content: LOCALE.maketext("This server uses a signed SSL certificate on the “[_1]” domain. Connect to the “[_1]” SSL domain instead of the “[_2]” domain when you use [output,acronym,SSL,Secure Socket Layer] and Web Disk to ensure that your client does not receive any SSL trust errors.", ssldomain, domain)
            } );
            created_page_notice = 1;
        }

        // See if we need to show the notice
        if ( does_support_ssl(selected_os) &&
             DOM.get("ssl").checked &&
             domain !== ssldomain) {
            if (!isVisible("cjt_pagenotice_container")) {
                show("cjt_pagenotice_container");
            }
        } else { // Otherwise hide the notice
            if (isVisible("cjt_pagenotice_container")) {
                hide("cjt_pagenotice_container");
            }
        }
    }

    /**
     * Get the parent up the tree that provides the checkbox wrapper.
     *
     * @param  {HTMLElement|String} el
     * @return {HTMLElement} parent element with the correct class name or null
     */
    function get_checkbox_wrapper(el) {
        el = DOM.get(el);
        var parent = el.parentNode;
        while (parent) {
            if (parent.className === "checkbox") {
                return parent;
            }
            parent = parent.parentNode;
        }
        return null;
    }

    /**
    * Sets up the ssl portion of the display including running the animation
    * @method setup_ssl_display */
    function setup_ssl_display() {
        var called = 0;
        var parentEl;

        var has_ssl_available = does_support_ssl(selected_os);

        var chkEl = DOM.get("ssl");

        if (requireSSL) {
            chkEl.checked = true;
            hide("ssl"); // Hide the check box
            parentEl = get_checkbox_wrapper(chkEl);
            if (DOM.hasClass(parentEl, "checkbox")) {
                DOM.removeClass(parentEl, "checkbox");
            }
        } else {
            show("ssl");  // Show the check box
            parentEl = get_checkbox_wrapper(chkEl);
            if (DOM.hasClass(parentEl, "checkbox")) {
                DOM.removeClass(parentEl, "checkbox");
            }
        }

        if (!requireSSL && !supports_basic_auth_cleartext(selected_os) && !hasDigest) {
            if (!isVisible("cleartext_not_available")) {
                CPANEL.animate.slide_down("cleartext_not_available");
            }
        } else {
            if (isVisible("cleartext_not_available")) {
                CPANEL.animate.slide_up("cleartext_not_available");
            }
        }

        // notice about ssl not available for some os
        if (has_ssl_available) {
            if (!isVisible("ssl_permitted")) {
                CPANEL.animate.slide_up( "ssl_not_available", function() {
                    CPANEL.animate.slide_down("ssl_permitted", show_helper_area);
                });
                called = 1;
            }
        } else {
            if (!isVisible("ssl_not_available")) {
                CPANEL.animate.slide_up( "ssl_permitted", function() {
                    CPANEL.animate.slide_down("ssl_not_available", show_helper_area);
                });
                DOM.get("ssl").checked = false;
                called = 1;
            }
        }

        if (!called) {
            show_helper_area();
        }
    }

    /**
    * Tests if the passed in element is visible. Currently only
    * looking at the display property for this...
    * @method isVisible
    * @param {String|HTMLElement} el element to test */
    function isVisible(el) {
        return DOM.getStyle(el, "display") !== "none";
    }

    /**
    * Hides the current element.
    * @method show
    * @param {String|HTMLElement} el element to hide */
    function hide(el) {
        DOM.setStyle(el, "display", "none");
    }

    /**
    * Shows the current element.
    * @method show
    * @param {String|HTMLElement} el element to show
    * @param {String} display_type optional, alternative display type if the default is not desired */
    function show(el, display_type) {
        display_type = display_type || "";
        DOM.setStyle(el, "display", display_type);
    }

    /**
    * Disables the operating systems that are not supported for this account
    * based on the requirements for that operating system and the options available
    * for the current account and system its operating under.
    * @method initializeAvailableOperatingSystems */
    function initializeAvailableOperatingSystems() {
        if (is_self_signed) {
            var hasUnsupportedOS = false;
            var requiresDigestIfUnsigned = false;
            var requiresSignedIfSSLOnly  = false;

            // Disable all the options that require digest
            for (var manufacturer in manufacturers) {
                if (manufacturers.hasOwnProperty(manufacturer)) {
                    var list = DOM.get("dav-select-" + manufacturer);
                    if (list) {
                        for (var os in os_configurations) {
                            if (os_configurations.hasOwnProperty(os)) {
                                var config = os_configurations[os];

                                if (config["manufacturer"] === manufacturer) {

                                    var removeUnsupportedConf = false;

                                    if (config["requires_digest_if_self_signed"] && (!hasDigest || requireSSL)) {
                                        requiresDigestIfUnsigned = true;
                                        removeUnsupportedConf = true;
                                    }

                                    if (requireSSL) {
                                        if (!config["ssl_ok_unsigned"] && removeUnsupportedConf) {
                                            requiresSignedIfSSLOnly  = true;
                                            removeUnsupportedConf = true;
                                        }

                                        if (!config["ssl_ok_unsigned"] && !config["requires_digest_if_self_signed"]) {
                                            requiresSignedIfSSLOnly  = true;
                                            removeUnsupportedConf = true;
                                        }
                                    }

                                    if (removeUnsupportedConf) {
                                        var option = findMatchingOption(list, os);
                                        if (option) {
                                            list.removeChild(option);
                                            hasUnsupportedOS = true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (hasUnsupportedOS) {
                if (requiresDigestIfUnsigned) {
                    if (requireSSL) {
                        new CPANEL.widgets.Page_Notice( {
                            level: "warn", // can also be "warn", "error", "success"
                            content: LOCALE.maketext("Because your server uses a self-signed or invalid certificate and you are required use [asis,SSL] to connect to your Web Disk account, you [output,em,cannot] use [asis,Windows Vista®], [asis,Windows® 7], or [asis,Windows® 8] to access Web Disk."),
                            container: "unsupported-configurations"
                        } );
                    } else {
                        new CPANEL.widgets.Page_Notice( {
                            level: "warn", // can also be "warn", "error", "success"
                            content: LOCALE.maketext("Because your server uses a self-signed or invalid certificate and you have not enabled Digest Authentication on your account, you [output,em,cannot] use [asis,Windows Vista®], [asis,Windows® 7], or [asis,Windows® 8] to access Web Disk."),
                            container: "unsupported-configurations"
                        } );
                    }
                }

                if (requiresSignedIfSSLOnly) {
                    new CPANEL.widgets.Page_Notice( {
                        level: "warn", // can also be "warn", "error", "success"
                        content: LOCALE.maketext("Because your server uses a self-signed or invalid certificate, older versions of [asis,OS X®] do not support self-signed certificates, and your server requires [asis,SSL] connections, you [output,em,cannot] use [asis,OS X® 10.4] or earlier to access Web Disk."),
                        container: "unsupported-configurations"
                    } );
                }
                show("unsupported-configurations");
            }
        }
    }

    /**
    * Finds a matching option element by its value attribute
    * @method findMatchingOption
    * @param [String|HTMLElement] el list to look through for matching options.
    * @param [String] value Value to look for in the value attribute. */
    function findMatchingOption(el, value) {
        if (el) {
            for (var i = 0, l = el.options.length; i < l; i++) {
                var option = el.options[i];
                if (option && DOM.getAttribute(option, "value") === value) {
                    return option;
                }
            }
        }
        return null;
    }

    function initializeDavSelectors() {
        var selectEls = DOM.getElementsByClassName("dav-selector");
        EVENT.addListener(selectEls, "change", onOsSelect);
    }

    /**
    * Initialized the page
    * @method initializePage */
    function initializePage() {
        initializeAvailableOperatingSystems();
        initializeDavSelectors();

        var detect = autoDetectOS();
        if (detect && detect.found) {
            var osName = findDetectedOSName(detect);
            if (osName) {

                /* Strip trailing and leading spaces */
                osName = osName.replace(/^\s/, "");
                osName = osName.replace(/\s$/, "");
                var text = DOM.get("detected-os-template").text;
                text = text.replace("{os-name}", osName);

                new CPANEL.widgets.Page_Notice( {
                    level: "info", // can also be "warn", "error", "success"
                    content: text,
                    container: "detected-os"
                });
                show("detected-os");
            }
        }
    }

    /**
    * Detect the current client operating system.
    * @method autoDetectOS */
    function autoDetectOS() {
        var detectedManufacturer;
        var detectedConfiguration;
        var found = false;
        var oskey, osver, osmatch;

        // Tested FireFox 12 OSX 10.7
        // Tested Opera 11.62 OSX 10.7
        // Tested Safari 5.1.7 OSX 10.7
        // Tested Chrome 19.0.1084.53 OSX 10.7
        // Tested Firefox 12 Win 7
        // Tested IE 8 Win 7
        // Tested FireFox 12 Win XP
        // Tested IE 8 Win XP
        // Tested Opera 11.64 Win 7
        // Tested Chrome 19.0.1084.52m Win XP
        // Tested Android Native Browser ICS 4.0.2
        // Tested Android Chrome Beta ICS 4.0.2
        // Tested FireFox 12 Android ICS 4.0.2
        // Tested FireFox 12 Ubuntu 12.04


        var formattedAppVersion = navigator.appVersion.match("/") ? navigator.appVersion.replace("_", ".") : navigator.userAgent.replace("_", ".");
        if ( formattedAppVersion.indexOf("iPad") !== -1 ) {
            detectedManufacturer = "mobile";
            detectedConfiguration = "ipad";
            found = true;
        } else if ( formattedAppVersion.indexOf("iPod") !== -1) {
            detectedManufacturer = "mobile";
            detectedConfiguration = "ipod";
            found = true;
        } else if (formattedAppVersion.indexOf("Android") !== -1) {
            detectedManufacturer = "mobile";
            detectedConfiguration = "android";
            found = true;
        } else if (formattedAppVersion.indexOf("iPhone") !== -1 ) {
            detectedManufacturer = "mobile";
            detectedConfiguration = "iphone";
            found = true;
        } else if (formattedAppVersion.indexOf("X11") !== -1) {
            detectedManufacturer = "linux";
            detectedConfiguration = "nautilus";
            found = true;
        } else if (formattedAppVersion.indexOf("Mac") !== -1) {
            oskey = navigator.oscpu ?  navigator.oscpu : formattedAppVersion;
            osmatch = oskey.match(/X\s+([0-9]+\.[0-9]+)/);
            osver = parseFloat(osmatch[1]);
            detectedManufacturer = (osver && osver <= 10.4) ? "osx" : "osx105";
            if (osver) {
                if (osver === 10.4) {
                    detectedConfiguration = "osx_tiger";
                    found = true;
                } else if (osver === 10.5) {
                    detectedConfiguration = "osx_leopard";
                    found = true;
                } else if (osver === 10.6) {
                    detectedConfiguration = "osx_snowleopard";
                    found = true;
                } else if (osver === 10.7) {
                    detectedConfiguration = "osx_lion";
                    found = true;
                } else if (osver === 10.8) {
                    detectedConfiguration = "osx_mountainlion";
                    found = true;
                } else if (osver === 10.9) {
                    detectedConfiguration = "osx_mavericks";
                    found = true;
                } else if (osver === 10.10) {
                    detectedConfiguration = "osx_yosemite";
                    found = true;
                } else if (osver === 10.11) {
                    detectedConfiguration = "osx_elcapitan";
                    found = true;
                } else if (osver === 10.12) {
                    detectedConfiguration = "osx_sierra";
                    found = true;
                } else if (osver >= 10.13) {
                    detectedConfiguration = "osx_highsierra";
                    found = true;
                }
            }
        } else if (formattedAppVersion.indexOf("Win") !== -1) {
            detectedManufacturer = "microsoft";
            oskey = navigator.oscpu ?  navigator.oscpu : formattedAppVersion;
            if (oskey.indexOf("Windows 98") !== -1) {
                detectedConfiguration = "win98";
            } else if (oskey.indexOf("Windows NT") !== -1) {
                osmatch = oskey.match(/NT\s+([0-9]+\.[0-9]+)/);
                osver = parseFloat(osmatch[1]);
                if (osver < 5.1) {
                    detectedConfiguration = "win2000";
                    found = true;
                } else if (osver < 5.2) {
                    detectedConfiguration = "winxp";
                    found = true;
                } else if (osver < 6.0) {
                    detectedConfiguration = "win2003";
                    found = true;
                } else if (osver < 6.1) {
                    detectedConfiguration = "winvista";
                    found = true;
                } else if (osver < 6.2) {
                    detectedConfiguration = "win7";
                    found = true;
                } else if (osver < 6.3) {
                    detectedConfiguration = "win8";
                    found = true;
                } else if (osver === 10.0) {
                    detectedConfiguration = "win10";
                    found = true;
                }
            }
        }

        return {
            configuration: detectedConfiguration,
            manufacturer: detectedManufacturer,
            found: found
        };
    }

    /**
    * Select the detected os from the system and navigate to it.
    * @method selectDetectedOS */
    function selectDetectedOS() {
        var detected = autoDetectOS();
        if (detected && detected.configuration) {
            var optionToSelectEl = DOM.get("app_" + detected.configuration);
            if ( optionToSelectEl ) {
                var selectEl = optionToSelectEl.parentNode;
                var opts = selectEl.options;
                for (var i = 0, l = opts.length; i < l; i++) {
                    if (opts[i].id === "app_" + detected.configuration) {
                        selectEl.selectedIndex = i;
                        break;
                    }
                }
                get_current_selected_os(selectEl);
                selectCurrentOSInstructions();
            }
        }
    }


    /**
    * Sets up the link that downloads the automatic activation script for the
    * selected os.
    * @method download_dav_helper_area
    * @param {String} os  */
    function download_dav_helper_area(os) {
        if (download_url) {
            frames.davaction.location.href = download_url;
        }
    }

    // Exports
    window.selectDetectedOS         = selectDetectedOS;
    window.download_dav_helper_area = download_dav_helper_area;
    window.setup_dav_instructions    = setup_dav_instructions;

    // Initialize the page
    YAHOO.util.Event.onDOMReady(function() {
        initializePage();
    });
})();
