/* globals PAGE: false, cpanel_jsonapi2: false, show_loading: false, waitpanel: false */
/* jshint -W031, -W098 */
// Constants
var DIGEST_AUTH_DISABLED = "disable";
var DIGEST_AUTH_ENABLED = "enable";
var PERM_READONLY = "ro";
var PERM_READWRITE = "rw";

// Short-cuts
/* jshint -W079 */
var DOM = YAHOO.util.Dom;
/* jshint +W079 */

var dir_validator = new CPANEL.validate.validator(LOCALE.maketext("Directory"));

/**
 * Update the directory to match the new webdav user name
 * @method update_directory */
var update_directory = function() {
    var user = DOM.get("user").value;
    if (user && CPANEL.validate.webdisk_username(user)) {
        DOM.get("homedir").value = "public_html/" + user;
        dir_validator.verify();
    }
};

/**
 * Shows the current element.
 * @method show
 * @param {String|HTMLElement} el element to show
 * @param {String} display_type optional, alternative display type if the default is not desired */
var show = function(el, display_type) {
    display_type = display_type || "";
    DOM.setStyle(el, "display", display_type);
};

/**
* Hides the current element.
* @method hide
* @param {String|HTMLElement} el element to hide */
var hide = function(el) {
    DOM.setStyle(el, "display", "none");
};

// State cache for current setting, updated via ajax.
var digest_auth_popup_status = {};

/**
* Sets up the popup used to enable/disable digest authentication
* @method set_digest_auth_popup
* @param [] account_type
* @param [] account
* @param [] setting
* @param [] clicked_el*/
var set_digest_auth_popup = function(account_type, account, setting, clicked_el) {
    if (digest_auth_popup_status[account]) {

        // If we previous changed it, we need to have the option to change it back
        // we keep track of the status changes in web_disk_account_status
        setting = (digest_auth_popup_status[account] === DIGEST_AUTH_ENABLED ? DIGEST_AUTH_DISABLED : DIGEST_AUTH_ENABLED);
    }

    var call_module = account_type === "system" ? "Passwd" : "WebDisk";

    // Setup the popup
    var id = DOM.generateId();
    var setdigestauthbox = new CPANEL.ajax.Common_Dialog( id, {
        width: "350px",
        draggable: false
    } );
    setdigestauthbox.cfg.getProperty("buttons")[0].text = LOCALE.maketext("OK");
    DOM.addClass( setdigestauthbox.element, "cjt_notice_dialog cjt_info_dialog" );

    var headerTxt = setting === DIGEST_AUTH_ENABLED ?
        LOCALE.maketext("Enable Digest Authentication") :
        LOCALE.maketext("Disable Digest Authentication");
    var headerHTML = CPANEL.widgets.Dialog.applyDialogHeader(headerTxt);
    setdigestauthbox.setHeader( headerHTML );

    var boxText = DOM.get("digest_auth_popup").text.replace(/{account}/g, account.html_encode());
    setdigestauthbox.setBody(boxText);

    // Setup the submit handler
    setdigestauthbox.submit = function() {

        var data = {};
        if ( DOM.get("set_digest_auth_password") ) {
            data.password = DOM.get("set_digest_auth_password").value;
        }

        if (call_module === "WebDisk") {
            data.login = account;
        }

        if (setting === DIGEST_AUTH_ENABLED) {
            data.enabledigest = 1;
        } else {
            data.enabledigest = 0;
        }

        var status_html =  setting === DIGEST_AUTH_ENABLED ?
            LOCALE.maketext("Enabling Digest Authentication on account “[_1]” …", account.html_encode()) :
            LOCALE.maketext("Disabling Digest Authentication on account “[_1]” …", account.html_encode());

        var progress_panel = new CPANEL.ajax.Progress_Panel( null, {
            show_status: true,
            status_html: status_html
        } );
        progress_panel.show();

        // Setup the callback for the api
        var callback = CPANEL.ajax.build_page_callback(
            function(o) {
                if (o && o.cpanel_data) {
                    o = o.cpanel_data; // Compat with 11.32
                }

                if (o && o[0] && o[0].result) {
                    progress_panel.cfg.setProperty( "effect", CPANEL.ajax.FADE_MODAL );
                    progress_panel.hide();
                    new CPANEL.ajax.Dynamic_Notice( { content: LOCALE.maketext("Success!"), level: "success" } );

                    var update_el;
                    if (account_type === "system") {
                        update_el = DOM.get("digest_auth_system");
                        if (DOM.get("webdav_notices")) {
                            if (setting === DIGEST_AUTH_ENABLED) {
                                CPANEL.animate.slide_up("webdav_notices");
                            } else {
                                CPANEL.animate.slide_down("webdav_notices");
                            }
                        }
                    } else {
                        update_el = clicked_el;
                    }

                    if (setting === DIGEST_AUTH_ENABLED) {
                        digest_auth_popup_status[account] = DIGEST_AUTH_ENABLED;
                        update_el.innerHTML = "<span class=\"glyphicon glyphicon-pencil\"></span> " +
                            LOCALE.maketext("Disable Digest Authentication");
                        update_el.title = LOCALE.maketext("Click to disable Digest Authentication.");
                    } else {
                        digest_auth_popup_status[account] = DIGEST_AUTH_DISABLED;
                        update_el.innerHTML = "<span class=\"glyphicon glyphicon-pencil\"></span> " +
                            LOCALE.maketext("Enable Digest Authentication");
                        update_el.title = LOCALE.maketext("Click to enable Digest Authentication.");
                    }
                } else {
                    progress_panel.hide();
                    var fail_reason = o[0].reason;

                    // Setup the failure box
                    var setfailbox = new CPANEL.ajax.Common_Dialog( DOM.generateId(), {
                        width: "350px",
                        draggable: false
                    } );
                    setfailbox.cfg.getProperty("buttons")[0].text = LOCALE.maketext("OK");
                    setfailbox.cfg.getProperty("buttons").pop(); // remove cancel
                    DOM.addClass( setfailbox.element, "cjt_notice_dialog cjt_info_dialog" );

                    // Setup the title
                    var headerHTML = headerTxt ? headerTxt : LOCALE.maketext("Notice");
                    headerHTML = CPANEL.widgets.Dialog.applyDialogHeader(headerHTML);
                    setfailbox.setHeader( headerHTML );

                    // Setup the body
                    setfailbox.setBody(fail_reason + " " + LOCALE.maketext("Please try again."));
                    setfailbox.beforeShowEvent.subscribe( setfailbox.center, setfailbox, true );

                    // Setup the failure box submit handler
                    setfailbox.submit = function() {
                        setfailbox.hide();
                        setdigestauthbox.show();
                    };
                    setfailbox.show();
                    setfailbox.center();
                }
            },

            // And the error handler
            { on_error: function() {
                progress_panel.hide();
            } }
        );

        CPANEL.api( {
            module: call_module,
            func: "set_digest_auth",
            data: data,
            callback: callback
        } );

        this.hide();
    };

    // Setup the show handlers
    setdigestauthbox.showEvent.subscribe(function() {
        if (setting === DIGEST_AUTH_ENABLED) {
            if (account_type === "virtual" || parseInt(PAGE.isoverridelogin, 10) === 1) {
                show("enable_digest_auth_form");
                if (account_type === "virtual") {
                    show("for_virtual_only");
                } else {
                    hide("for_virtual_only");
                }
                hide("enable_digest_for_account");
                hide("disable_digest_for_account");
            } else {
                show("enable_digest_for_account");
                hide("disable_digest_for_account");
                hide("enable_digest_auth_form");
            }
        } else {
            show("disable_digest_for_account");
            hide("enable_digest_for_account");
            hide("enable_digest_auth_form");
        }
    });

    setdigestauthbox.beforeShowEvent.subscribe( setdigestauthbox.center, setdigestauthbox, true );

    setdigestauthbox.show_from_source(clicked_el);
};

/**
 * Click handler for the Access Web Disk button
 * @method access_web_disk
 * @param [] user
 * @param [] domain
 * @param [] hasdigest */
var access_web_disk = function(user, domain, hasdigest) {
    if (digest_auth_popup_status[user]) {
        hasdigest = (digest_auth_popup_status[user] === DIGEST_AUTH_ENABLED ? 1 : 0);
    }
    window.location.href = "webdavaccessdownload.html?" +
        "domain=" + encodeURIComponent(domain) +
        "&sslport=" + encodeURIComponent(PAGE.sslport) +
        "&mainport=" + encodeURIComponent(PAGE.mainport) +
        "&hasdigest=" + encodeURIComponent(hasdigest) +
        "&user=" + encodeURIComponent(user);
};

/**
 * Moves the selection to the end of the input fields text.
 * @method moveCaretToEnd
 * @param [] el Input Element to move the selection in.
 * @source http://stackoverflow.com/questions/511088/use-javascript-to-place-cursor-at-end-of-text-in-text-input-element
 */
var moveCaretToEnd = function(el) {
    if (el.createTextRange) {

        // IE
        var fieldRange = el.createTextRange();
        fieldRange.moveStart("character", el.value.length);
        fieldRange.collapse();
        fieldRange.select();
    } else {

        // Firefox and Opera
        el.focus();
        var length = el.value.length;
        el.setSelectionRange(length, length);
    }
};

/**
 * Initialize the page
 * @method init_page */
var init_page = function() {

    var user_el = DOM.get("user");
    var domain_el = DOM.get("domain");

    if (user_el && domain_el) {
        var user_validator = new CPANEL.validate.validator(LOCALE.maketext("Webdav Login"));
        var domain_validator = new CPANEL.validate.validator(LOCALE.maketext("Domain"));

        // Setup the username validator
        user_validator.add("user", "min_length(%input%, 1)", LOCALE.maketext("You must enter a [asis,WebDisk] username."), null, { unique_id: "username_min_length" });
        user_validator.add("user", "max_length(%input%, 64)", LOCALE.maketext("The [asis,WebDisk] username cannot exceed [numf,_1] characters.", 64), null, { unique_id: "username_max_length" });
        user_validator.add("user", function(user_el) {
            var username = user_el.value + "@" + domain_el.value;
            domain_validator.clear_messages();
            return CPANEL.validate.max_length(username, 254);
        },
        LOCALE.maketext("The [asis,WebDisk] username name and domain cannot exceed [numf,_1] characters.", 254),
        null,
        { unique_id: "username_full_length" }
        );
        user_validator.add("user", "webdisk_username", LOCALE.maketext("You can only enter letters, numbers, periods, hyphens, and underscores."), null, { unique_id: "username_valid" });
        user_validator.add("user", "no_unsafe_periods", LOCALE.maketext("The [asis,WebDisk] username cannot start with a period, end with a period, or include two consecutive periods."), null, { unique_id: "username_no_periods" });
        user_validator.attach();

        // Setup the domain validator
        domain_validator.add("domain", function() {
            user_validator.clear_messages();
            user_validator.verify(); // Will show up in the local parts validator
            return true;             // So this always passes
        },
        ""
        );
        domain_validator.attach();

        // Setup the home directory validator
        dir_validator.add("homedir", "dir_path", LOCALE.maketext("Directory paths cannot be empty or contain the following characters: [output,chr,92] ? % * : | [output,quot] [output,gt] [output,lt]"));
        dir_validator.attach();

        var password_validators = CPANEL.password.setup(
            "password",
            "password2",
            "password_strength",
            PAGE.REQUIRED_PASSWORD_STRENGTH,
            "create_strong_password",
            "why_strong_passwords_link",
            "why_strong_passwords_text");

        password_validators.push(user_validator, domain_validator, dir_validator);
        CPANEL.validate.attach_to_form("btnCreateWebDav", password_validators);

        YAHOO.util.Event.on("user", "change", update_directory);
    }

    var queryString = CPANEL.util.parse_query_string();

    if (queryString["searchregex"]) {
        moveCaretToEnd(DOM.get("searchregex"));
    } else {
        DOM.get("user").focus();
    }

    if (PAGE.digest_not_set) {
        show("webdav_notices");
    }

    new CPANEL.widgets.Page_Notice( {
        level: "info",
        content: DOM.get("digest_auth_notice").text,
        container: "webdav_notices"
    } );

    CPANEL.panels.create_help("main_account_help", "main_account_help_text");
    CPANEL.panels.create_help("setperms-info", "permissions_help_text");
    CPANEL.panels.create_help("enabledigest-info", "digest_auth_help_text");
};


// Homedir dialog cloned and modified from the subdomain
// document dialog

var homedir_dialog;

var start_change_homedir = function(login, homedir) {
    if (!homedir_dialog) {
        var cjt_validator = new CPANEL.validate.validator(LOCALE.maketext("Directory Path"));
        var handleCancel = function() {
            this.cancel();
        };
        var handleSubmit = function() {
            var login = DOM.get("change_homedir_login").value;
            var callback = function(data) {
                if (parseInt(data[0].result, 10)) {
                    homedir_dialog.hide();
                    var newdir = data[0].reldir;
                    newdir = newdir.replace(/^\//, "");
                    var alink = DOM.get(login + "_lnk");
                    var uri = alink.href.split("?");
                    uri[1] = "dir=" + encodeURIComponent(newdir);
                    alink.href = uri.join("?");
                    CPANEL.util.set_text_content(alink, "/" + newdir);
                    waitpanel.hide();
                    new CPANEL.ajax.Dynamic_Notice({
                        content: LOCALE.maketext("Home Directory Updated"),
                        level: "success"
                    });
                } else {
                    waitpanel.hide();
                    homedir_dialog.show();
                    new CPANEL.ajax.Dynamic_Notice({
                        content: data[0].reason,
                        level: "error"
                    }); // data[0].reason will already be localized from the api
                }
            };
            show_loading(login, LOCALE.maketext("Updating Home Directory"));
            homedir_dialog.hide();
            cpanel_jsonapi2(callback, "WebDisk", "set_homedir", "login", DOM.get("change_homedir_login").value, "homedir", DOM.get("change_homedir_dir").value);
        };
        homedir_dialog = new YAHOO.widget.Dialog("homedir_panel", {
            width: "350px",
            fixedcenter: true,
            visible: false,
            postmethod: "manual",
            constraintoviewport: true,
            draggable: false,
            modal: true,
            strings: {
                "close": LOCALE.maketext("Close")
            },
            buttons: [{
                text: LOCALE.maketext("Change"),
                handler: handleSubmit,
                isDefault: true
            }, {
                text: LOCALE.maketext("Cancel"),
                handler: handleCancel
            }]
        });
        homedir_dialog.submitEvent.subscribe(handleSubmit);
        homedir_dialog.validate = function() {
            return CPANEL.validate.dir_path(this.form.homedir.value);
        };
        show("homedir_panel");
        homedir_dialog.render();
        cjt_validator.add(homedir_dialog.form.homedir,
            "dir_path",
            LOCALE.maketext("Directory paths cannot be empty or contain the following characters: [output,chr,92] ? % * : | [output,quot] [output,gt] [output,lt]"),
            null,
            { "no_width_height": 1 });
        cjt_validator.attach();
        homedir_dialog.showEvent.subscribe(cjt_validator.verify, cjt_validator, true);

        // hide error messages when we hide the dialog
        homedir_dialog.hideEvent.subscribe(function() {
            cjt_validator.clear_messages();
        }, cjt_validator, true);
    }
    CPANEL.util.set_text_content(DOM.get("change_homedir_logintxt"), login);
    DOM.get("change_homedir_login").value = login;

    var alink = DOM.get(login + "_lnk");
    var uri = alink.href.split("?");
    var dirkeyval = decodeURIComponent(uri[1]).split("=");
    homedir = dirkeyval[1];
    homedir = homedir.replace(/^\//, "");
    var homedirEl = DOM.get("change_homedir_dir");

    homedirEl.value = homedir;
    homedir_dialog.show();
};


function trapEnterPress(e) {
    var key = (window.event ? window.event.keyCode : e.which);
    return (key !== 13);
}

var web_disk_perms_status = {};

/**
 * Sets up the popup used to enable/disable read-only mode
 * @method set_perms_popup
 * @param [] account_type
 * @param [] account
 * @param [] setting
 * @param [] clicked_el*/
var set_perms_popup = function(account_type, account, setting, clicked_el) {
    if (web_disk_perms_status[account]) {

        // If we previous changed it, we need to have the option to change it back
        // we keep track of the status changes in web_disk_perms_status
        setting = (web_disk_perms_status[account] === PERM_READWRITE ? PERM_READONLY : PERM_READWRITE);
    }

    var call_module = account_type === "system" ? "Passwd" : "WebDisk";

    // Setup the popup
    var id = DOM.generateId();
    var setpermsbox = new CPANEL.ajax.Common_Dialog(id, {
        width: "350px",
        draggable: false
    });
    setpermsbox.cfg.getProperty("buttons")[0].text = LOCALE.maketext("OK");
    DOM.addClass(setpermsbox.element, "cjt_notice_dialog cjt_info_dialog");

    var headerTxt = setting === PERM_READWRITE ?
        LOCALE.maketext("Setting Read-Write Access") :
        LOCALE.maketext("Setting Read-Only Access");

    var headerHTML = CPANEL.widgets.Dialog.applyDialogHeader(headerTxt);

    setpermsbox.setHeader(headerHTML);

    var boxText = DOM.get("perms_popup").text.replace(/{account}/g, account.html_encode());
    setpermsbox.setBody(boxText);

    // Setup the submit handler
    setpermsbox.submit = function() {

        var data = {};

        data.login = account;
        data.perms = setting;

        var status_html = setting === PERM_READWRITE ?
            LOCALE.maketext("Setting Read-Write Access on account “[_1]” …", account.html_encode()) :
            LOCALE.maketext("Setting Read-Only Access on account “[_1]” …", account.html_encode());

        var progress_panel = new CPANEL.ajax.Progress_Panel(null, {
            show_status: true,
            status_html: status_html
        });
        progress_panel.show();

        // Setup the callback for the api
        var callback = CPANEL.ajax.build_page_callback(
            function(o) {
                if (o && o.cpanel_data) {
                    o = o.cpanel_data; // Compat with 11.32
                }
                if (o && o[0] && o[0].result) {
                    progress_panel.cfg.setProperty("effect", CPANEL.ajax.FADE_MODAL);
                    progress_panel.hide();
                    new CPANEL.ajax.Dynamic_Notice({
                        content: LOCALE.maketext("Success!"),
                        level: "success"
                    });

                    var update_el = clicked_el;

                    if (setting === PERM_READWRITE) {
                        web_disk_perms_status[account] = PERM_READWRITE;
                        update_el.innerHTML = "<span class=\"fas fa-cog\"></span> " +
                            LOCALE.maketext("Set Read-Only");
                    } else {
                        web_disk_perms_status[account] = PERM_READONLY;
                        update_el.innerHTML = "<span class=\"fas fa-cog\"></span> " +
                            LOCALE.maketext("Set Read-Write");
                    }
                } else {
                    progress_panel.hide();
                    var fail_reason = o[0].reason;

                    // Setup the failure box
                    var setfailbox = new CPANEL.ajax.Common_Dialog(DOM.generateId(), {
                        width: "350px",
                        draggable: false
                    });
                    setfailbox.cfg.getProperty("buttons")[0].text = LOCALE.maketext("OK");
                    setfailbox.cfg.getProperty("buttons").pop(); // remove cancel
                    DOM.addClass(setfailbox.element, "cjt_notice_dialog cjt_info_dialog");
                    setfailbox.setHeader(headerTxt ? headerTxt : LOCALE.maketext("Notice"));
                    setfailbox.setBody(fail_reason + " " + LOCALE.maketext("Please try again."));
                    setfailbox.beforeShowEvent.subscribe(setfailbox.center, setfailbox, true);

                    // Setup the failure box submit handler
                    setfailbox.submit = function() {
                        setfailbox.hide();
                        setpermsbox.show();
                    };
                    setfailbox.show();
                    setfailbox.center();
                }
            },

            // And the error handler
            {
                on_error: function() {
                    progress_panel.hide();
                }
            }
        );

        CPANEL.api({
            module: call_module,
            func: "set_perms",
            data: data,
            callback: callback
        });

        this.hide();
    };

    // Setup the before show handlers
    setpermsbox.showEvent.subscribe(function() {
        if (setting === PERM_READWRITE) {
            show("perms_rw_for_account");
            show("perms_rw_info");
            hide("perms_ro_info");
            hide("perms_ro_for_account");
        } else {
            hide("perms_rw_for_account");
            hide("perms_rw_info");
            show("perms_ro_for_account");
            show("perms_ro_info");
        }
    });

    setpermsbox.beforeShowEvent.subscribe(setpermsbox.center, setpermsbox, true);

    setpermsbox.show_from_source(clicked_el);
};


YAHOO.util.Event.onDOMReady(init_page);
