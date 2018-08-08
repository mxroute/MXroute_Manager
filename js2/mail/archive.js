// ------------------------
// Shortcuts
// ------------------------
var DOM = YAHOO.util.Dom;
var cpDOM = CPANEL.dom;
var EVENT = YAHOO.util.Event;

// ------------------------
// Globals
// ------------------------
var domain_current_days_saved = {};

/**
 * Configures the actions...
 * @name configure_actions
 * @param {string} domain The domain name to configure.
 */

function configure_actions(domain) {
    var has_archive = 0;

    // Determin if archiving is enabled for this domain
    for (var archive_type in archive_types) {
        var ctl = DOM.get("archive_" + archive_type + "_" + domain);
        if (ctl.checked) {
            has_archive = 1;
            break;
        }
    }

    // Animate the visibility depending on enabled or disabled.
    var controlsEl = DOM.get("archive_controls_" + domain);
    if (has_archive) {
        if (cpDOM.isHidden(controlsEl)) {
            CPANEL.animate.slide_down(controlsEl);
        }
    } else {
        if (cpDOM.isVisible(controlsEl)) {
            CPANEL.animate.slide_up(controlsEl);
        }
    }
}


/**
 * Parses the details from the id
 * @name parse_archive_info
 * @param {string} id The id of a configuration row;
 *  has the following format:
 *   archive_{archive_type}_{domain}
 */

function parse_archive_info(id) {
    var archiveInfo = id.split("_");
    archiveInfo.shift(); // archive
    var archive_type = archiveInfo.shift();
    var domain = archiveInfo.join("_");

    return {
        "archive_type": archive_type,
        "domain": domain
    };
}

/**
 * Parses the retention details from the id
 * @name parse_archive_info
 * @param {string} id The id of a configuration row;
 *  has the following format:
 *   archive_{archive_type}_retain_days_{domain}
 *   download_{archive_type}_archives_{domain}
 */

function parse_retention_info(id) {
    var archiveInfo = id.split("_");
    archiveInfo.shift(); // archive
    var archive_type = archiveInfo.shift();
    archiveInfo.shift(); // retain
    archiveInfo.shift(); // days
    var domain = archiveInfo.join("_");

    return {
        "archive_type": archive_type,
        "domain": domain
    };
}

/**
 * Parses the retention details from the id
 * @name parse_archive_info
 * @param {string} id The id of a configuration row;
 *  has the following format:
 *   download_{archive_type}_archives_{domain}
 */

function parse_download_info(id) {
    var archiveInfo = id.split("_");
    archiveInfo.shift(); // download
    var archive_type = archiveInfo.shift();
    archiveInfo.shift(); // archives
    var domain = archiveInfo.join("_");

    return {
        "archive_type": archive_type,
        "domain": domain
    };
}


/**
 * Parses the retention details from the id
 * @name parse_custom_retention_info
 * @param {string} id The id of a configuration row;
 *  has the following format:
 *   custom_archive_{archive_type}_retain_days_{domain}
 */

function parse_custom_retention_info(id) {
    var archiveInfo = id.split("_");
    archiveInfo.shift(); // custom
    archiveInfo.shift(); // archive
    var archive_type = archiveInfo.shift();
    archiveInfo.shift(); // retain
    archiveInfo.shift(); // days
    var domain = archiveInfo.join("_");

    return {
        "archive_type": archive_type,
        "domain": domain
    };
}


/**
 * Extracts the default configuration data from the form.
 * @name getDefaultConfigurationData
 * @param [Boolean ] excludeEmpty - set to true to include the disabled ones
 */

function getDefaultConfigurationData(excludeEmpty) {
    var data = {};
    for (var type in archive_types) {
        var checkbox = DOM.get("archive_" + type + "_GLOBAL");
        var droplist = DOM.get("archive_" + type + "_retain_days_GLOBAL");
        var textbox = DOM.get("custom_archive_" + type + "_retain_days_GLOBAL");
        if (checkbox.checked) {
            var value = droplist.options[droplist.selectedIndex].value;
            data[type] = value !== "" ? value : textbox.value;
        } else if (!excludeEmpty) {
            data[type] = "";
        }
    }
    return data;
}

/**
 * Registeres the event handlers for the ui elements
 * @name register_archive_domain
 * @param {string} domain The domain name to configure.
 * @param {bool} global Use the global or local event model
 */

function register_archive_domain(domain, global) {

    var spinner_id = "spinner_" + domain;

    for (var archive_type in archive_types) {

        // Setup the click event on the checkbox
        EVENT.on("archive_" + archive_type + "_" + domain, "click", function(e) {
            var thisCheckBox = this;
            var thisId = this.id;
            var info = parse_archive_info(thisId);
            var msg = "";
            var data;

            var retention_containerEl = DOM.get("archive_" + info.archive_type + "_retain_days_" + info.domain + "_container");
            var custom_retention_container = DOM.get("archive_" + info.archive_type + "_retain_days_" + info.domain + "_custom_container");

            if (this.checked) {
                var retention_select = DOM.get("archive_" + info.archive_type + "_retain_days_" + info.domain);

                // Find the element with 0 as the value
                for (var i = 0, l = retention_select.length; i < l; i++) {
                    if (retention_select[i].value === "0") {
                        retention_select[i].selected = true;
                        break;
                    }
                }

                CPANEL.animate.slide_down(retention_containerEl);

                if (!global) {
                    configure_actions(info.domain);

                    // AJAX CALL TO ENABLE ARCHIVING
                    switch (info.archive_type) {
                        case "mailman":
                            msg = LOCALE.maketext("Enabled archiving of mailing lists on “[_1]”.", info.domain);
                            break;
                        case "incoming":
                            msg = LOCALE.maketext("Enabled archiving of incoming email on “[_1]”.", info.domain);
                            break;
                        case "outgoing":
                            msg = LOCALE.maketext("Enabled archiving of outgoing email on “[_1]”.", info.domain);
                            break;
                        default:
                            msg = LOCALE.maketext("Enabled archiving of “[_1]” email on “[_2]”.", archive_types[info.archive_type].toLowerCase(), info.domain);
                            break;
                    }

                    configure_archive(
                        msg,
                        info.domain,
                        info.archive_type,
                        0,
                        function() {
                            CPANEL.animate.slide_up(retention_containerEl);
                            thisCheckBox.checked = false;
                            configure_actions(info.domain);
                        });
                } else {
                    data = getDefaultConfigurationData();
                    switch (info.archive_type) {
                        case "mailman":
                            msg = LOCALE.maketext("Enabled archiving of mailing lists for all new domains.");
                            break;
                        case "incoming":
                            msg = LOCALE.maketext("Enabled archiving of incoming email for all new domains.");
                            break;
                        case "outgoing":
                            msg = LOCALE.maketext("Enabled archiving of outgoing email for all new domains.");
                            break;
                        default:
                            msg = LOCALE.maketext("Enabled archiving of “[_1]” email for all new domains.", archive_types[info.archive_type].toLowerCase(), info.domain);
                            break;
                    }
                    configure_default(
                        msg,
                        data,
                        function() {
                            CPANEL.animate.slide_up(retention_containerEl);
                            thisCheckBox.checked = false;
                            configure_actions(info.domain);
                        });
                }
                retention_select.focus();
            } else {

                // Confirm an actual change to the preserved sets
                // but not to the default configuration.
                if (!global) {
                    switch (info.archive_type) {
                        case "mailman":
                            msg = LOCALE.maketext("Are you sure you want to disable archiving of mailing lists for “[_1]”?", info.domain);
                            break;
                        case "incoming":
                            msg = LOCALE.maketext("Are you sure you want to disable archiving of incoming email for “[_1]”?", info.domain);
                            break;
                        case "outgoing":
                            msg = LOCALE.maketext("Are you sure you want to disable archiving of outgoing email for “[_1]”?", info.domain);
                            break;
                        default:
                            msg = LOCALE.maketext("Are you sure you want to disable archiving of “[_1]” email for “[_2]”?", archive_types[info.archive_type].toLowerCase(), info.domain);
                            break;
                    }

                    if (!confirm(msg)) {
                        this.checked = true;
                        return;
                    }
                }

                CPANEL.animate.slide_up(retention_containerEl);

                if (!global) {
                    configure_actions(info.domain);

                    // AJAX CALL TO DISABLE ARCHIVING
                    switch (info.archive_type) {
                        case "mailman":
                            msg = LOCALE.maketext("Disabled archiving of mailing lists for “[_1]”.", info.domain);
                            break;
                        case "incoming":
                            msg = LOCALE.maketext("Disabled archiving of incoming mail for “[_1]”.", info.domain);
                            break;
                        case "outgoing":
                            msg = LOCALE.maketext("Disabled archiving of outgoing email for “[_1]”.", info.domain);
                            break;
                        default:
                            msg = LOCALE.maketext("Disabled archiving of “[_1]” email for “[_2]”.", archive_types[info.archive_type].toLowerCase(), info.domain);
                            break;
                    }

                    configure_archive(
                        msg,
                        info.domain,
                        info.archive_type,
                        "",
                        function() {
                            CPANEL.animate.slide_down(retention_containerEl);
                            thisCheckBox.checked = true;
                            configure_actions(info.domain);
                        },
                        function() {
                            cpDOM.hide(custom_retention_container);
                            DOM.setStyle("height", "");
                        });
                } else {
                    data = getDefaultConfigurationData(true);

                    switch (info.archive_type) {
                        case "mailman":
                            msg = LOCALE.maketext("Disabled archiving of mailing lists for all new domains.");
                            break;
                        case "incoming":
                            msg = LOCALE.maketext("Disabled archiving of incoming email for all new domains.");
                            break;
                        case "outgoing":
                            msg = LOCALE.maketext("Disabled archiving of outgoing email for all new domains.");
                            break;
                        default:
                            msg = LOCALE.maketext("Disabled archiving of “[_1]” for all new domains.", archive_types[info.archive_type].toLowerCase());
                            break;
                    }

                    configure_default(
                        msg,
                        data,
                        function() {
                            CPANEL.animate.slide_down(retention_containerEl);
                            thisCheckBox.checked = true;
                        },
                        function() {
                            cpDOM.hide(custom_retention_container);
                            DOM.setStyle("height", "");
                        });
                }
            }
        });

        // Setup the cache of saved states
        if (!domain_current_days_saved[domain]) {
            domain_current_days_saved[domain] = {};
        }

        domain_current_days_saved[domain][archive_type] = true;

        // Setup the change event on the retention days dropbox.
        EVENT.on("archive_" + archive_type + "_retain_days_" + domain, "change", function(e) {
            var thisId = this.id;
            var info = parse_retention_info(thisId);

            var customEl = DOM.get("archive_" + info.archive_type + "_retain_days_" + info.domain + "_custom_container");
            var selected = this.options[this.selectedIndex];
            var elCustomInput = DOM.get("custom_archive_" + info.archive_type + "_retain_days_" + info.domain);

            if (selected.value === "") {

                // Force these to be the same.
                if (elCustomInput.value == "-1") {
                    elCustomInput.value = 1;
                }

                cpDOM.show(customEl);
                domain_current_days_saved[info.domain][info.archive_type] = false;

                var doFocus = (function(id) {
                    return function() {
                        el = DOM.get(id);

                        // Select the invalid text
                        var len = el.value ? el.value.length : 0;
                        el.focus();
                        selectText(el, 0, len);
                    };
                })("custom_archive_" + info.archive_type + "_retain_days_" + info.domain);

                setTimeout(doFocus);
            } else {

                // Hide the custom element container
                CPANEL.animate.slide_up(customEl, function() {

                    // Sync the custom value field
                    var elCustomInput = DOM.get("custom_archive_" + info.archive_type + "_retain_days_" + info.domain);
                    if (elCustomInput) {
                        elCustomInput.value = selected.value;
                    }
                });

                if (!global) {

                    // AJAX CALL TO CHANGE RETENTION DAYS
                    configure_archive(
                        info.archive_type != "mailman" ?
                            LOCALE.maketext("The archive retention period of “[_1]” email for “[_2]” is now “[_3]”.",
                                archive_types[info.archive_type].toLowerCase(),
                                info.domain,
                                selected.text) :
                            LOCALE.maketext("The archive retention period of “[_1]” for “[_2]” is now “[_3]”.",
                                archive_types[info.archive_type].toLowerCase(),
                                info.domain,
                                selected.text),
                        info.domain,
                        info.archive_type,
                        selected.value);
                } else {

                    // AJAX CALL TO CHANGE RETENTION DAYS
                    var data = getDefaultConfigurationData();
                    configure_default(
                        info.archive_type != "mailman" ?
                            LOCALE.maketext("The archive retention period of “[_1]” email for all new domains is now “[_2]”.",
                                archive_types[info.archive_type].toLowerCase(),
                                selected.text) :
                            LOCALE.maketext("The archive retention period of “[_1]” email for all new domains is now “[_2]”.",
                                archive_types[info.archive_type].toLowerCase(),
                                selected.text),
                        data);
                }
            }
        });

        // Setup the return key save operation
        var onReturnCommitRetention = function(e) {
            if (CPANEL.keyboard.isReturnKey(e)) {
                return onSetCustomRetention.apply(this, [e]);
            }
        };

        // Setup the special navigation when we select custom, but accept the default
        var onNavigateAwaySaveRetention = function(e) {
            return onSetCustomRetention.apply(this, [e]);
        };

        // Setup he change event on the custom retention days dropbox.
        var onSetCustomRetention = function(e) {

            var thisId = this.id;
            var info = parse_custom_retention_info(thisId);
            var retain_txt = this.value;
            var retain_days = parseInt(this.value, 10);

            // Check if this is an attempt to set the same custom
            // value triggered by multiple event listeners...
            if (onSetCustomRetention.last) {
                var last = onSetCustomRetention.last;
                if (last.domain == info.domain &&
                    last.archive_type == info.archive_type &&
                    last.retain_days == retain_days) {
                    return;
                }
            }

            // Save this one as the last attempted
            onSetCustomRetention.last = {
                domain: info.domain,
                archive_type: info.archive_type,
                retain_days: retain_days
            };

            // Do not save if we saved with previous method
            if (domain_current_days_saved[info.domain][info.archive_type] === true) {
                return;
            }

            // Validate the inputs
            if (retain_days < 0 || isNaN(retain_days)) {
                var status_bar_row_id = "archive_status_bar_row_" + info.domain;
                cpDOM.show(status_bar_row_id);

                var status_bar_id = "archive_status_bar_" + info.domain;
                CPANEL.widgets.status_bar(
                    status_bar_id,
                    "error",
                    LOCALE.maketext("Error"),
                    LOCALE.maketext("An archive retention period of “[_1]” is not valid.", retain_txt.html_encode()));

                return;
            }

            var successMsg = "";
            if (retain_days === 0) {
                if (info.archive_type != "mailman") {
                    successMsg = !global ?
                        LOCALE.maketext("The archive retention period of “[_1]” email for “[_2]” is now Forever.",
                            archive_types[info.archive_type].toLowerCase(),
                            info.domain,
                            retain_days) :
                        LOCALE.maketext("The archive retention period of “[_1]” email for all new domains is now Forever.",
                            archive_types[info.archive_type].toLowerCase(),
                            retain_days);
                } else {
                    successMsg = !global ?
                        LOCALE.maketext("The archive retention period of “[_1]” for “[_2]” is now Forever.",
                            archive_types[info.archive_type].toLowerCase(),
                            info.domain,
                            retain_days) :
                        LOCALE.maketext("The archive retention period of “[_1]” for all new domains is now Forever.",
                            archive_types[info.archive_type].toLowerCase(),
                            retain_days);
                }

            } else {
                if (info.archive_type != "mailman") {
                    successMsg = !global ?
                        LOCALE.maketext("The archive retention period of “[_1]” email for “[_2]” is now [quant,_3,day,days].",
                            archive_types[info.archive_type].toLowerCase(),
                            info.domain,
                            retain_days) :
                        LOCALE.maketext("The archive retention period of “[_1]” email for all new domains is now [quant,_2,day,days].",
                            archive_types[info.archive_type].toLowerCase(),
                            retain_days);
                } else {
                    successMsg = !global ?
                        LOCALE.maketext("The archive retention period of “[_1]” for “[_2]” is now [quant,_3,day,days].",
                            archive_types[info.archive_type].toLowerCase(),
                            info.domain,
                            retain_days) :
                        LOCALE.maketext("The archive retention period of “[_1]” for all new domains is now [quant,_2,day,days].",
                            archive_types[info.archive_type].toLowerCase(),
                            retain_days);
                }
            }

            if (!global) {

                // AJAX CALL TO CHANGE RETENTION DAYS
                configure_archive(
                    successMsg,
                    info.domain,
                    info.archive_type,
                    retain_days);
            } else {

                // AJAX CALL TO CHANGE RETENTION DAYS
                var data = getDefaultConfigurationData();
                configure_default(
                    successMsg,
                    data);
            }
        };

        var retainTextEl = DOM.get("custom_archive_" + archive_type + "_retain_days_" + domain);
        EVENT.on(retainTextEl, "change", onSetCustomRetention);
        EVENT.on(retainTextEl, "focusout", onNavigateAwaySaveRetention);
        EVENT.on(retainTextEl, "keypress", function(e) {
            if (!CPANEL.keyboard.allowNumericKey(e)) {
                return false;
            }

            var thisId = this.id;
            var info = parse_custom_retention_info(thisId);
            domain_current_days_saved[info.domain][info.archive_type] = false;
            return true;
        });
        EVENT.on(retainTextEl, "keydown", onReturnCommitRetention);
    }
}

/**
 * Call the archiving_configure api2 call to save the configuration.
 * @name configure_default
 * @param {string} successtxt
 * @param {Hash} formdata
 * @param {string} retention_period
 * @param {Function} onerror
 * @param {Function} onsuccess
 */

function configure_default(successtxt, formdata, onerror, onsuccess) {

    var data = {};

    // Merge the data
    for (var data_key in formdata) {
        data[data_key] = formdata[data_key];
    }

    var status_bar_id = "archive_status_bar_GLOBAL";
    var spinner_id = "spinner_GLOBAL";

    cpDOM.show(spinner_id);

    disable_default_archiving_controls();

    CPANEL.api({
        module: "Email",
        func: "set_archiving_default_configuration",
        data: data,
        callback: {

            // API Success handler
            success: function(o) {
                enable_default_archiving_controls();

                // Shortcuts
                var status_bar = CPANEL.widgets.status_bar;

                cpDOM.hide(spinner_id);

                if (o.cpanel_data[0].status == "1") {
                    for (var archive_type in archive_types) {
                        domain_current_days_saved["GLOBAL"][archive_type] = true;
                    }
                    status_bar(status_bar_id, "success", successtxt, "");
                    if (onsuccess) {
                        onsuccess();
                    }
                } else {
                    status_bar(status_bar_id, "error", LOCALE.maketext("Error"), data.cpanelresult.data[0].statusmsg);
                    if (onerror) {
                        onerror();
                    }
                }
            },

            // API Failure handler
            failure: function(o) {
                enable_default_archiving_controls();

                // Shortcuts
                var status_bar = CPANEL.widgets.status_bar;

                cpDOM.hide(spinner_id);
                status_bar(status_bar_id, "error", LOCALE.maketext("AJAX Error"), LOCALE.maketext("Please refresh the page and try again."));
                if (onerror) {
                    onerror();
                }
            }
        }
    });
}

// Returns [ checkbox, select, custom ]

function get_domain_controls(domain, archive_type) {
    return [
        "archive_" + archive_type + "_" + domain,
        "archive_" + archive_type + "_retain_days_" + domain,
        "custom_archive_" + archive_type + "_retain_days_" + domain
    ].map(DOM.get.bind(DOM));
}

/**
 * Call the archiving_configure api2 call to save the configuration.
 * @name configure_archive
 * @param {string} successtxt
 * @param {string} domain
 * @param {string} archive_type
 * @param {string} retention_period
 * @param {Function} onerror
 * @param {Function} onsuccess
 */

function configure_archive(successtxt, domain, archive_type, retention_period, onerror, onsuccess) {

    var spinner = DOM.get("spinner_" + domain);
    var status_bar_id = "archive_status_bar_" + domain;
    var status_bar_row_id = "archive_status_bar_row_" + domain;

    DOM.setStyle(spinner, "visibility", "");
    var form_els = get_domain_controls(domain, archive_type);
    form_els.forEach(function(el) {
        el.disabled = true;
    });

    cpDOM.hide(status_bar_row_id);

    var onreturn = function() {
        form_els.forEach(function(fc) {
            if (fc) {
                fc.disabled = false;
            }
        });
        DOM.setStyle(spinner, "visibility", "hidden");
        cpDOM.show(status_bar_row_id);
    };

    var post_notice_config = {
        callbackFunc: function() {
            cpDOM.hide(status_bar_row_id);
        }
    };

    var data = {
        domains: domain
    };
    data[archive_type] = retention_period;

    CPANEL.api({
        module: "Email",
        func: "set_archiving_configuration",
        data: data,
        callback: {

            // API Success handler
            success: function(o) {
                onreturn();

                // Shortcuts
                var status_bar = CPANEL.widgets.status_bar;

                if (o.cpanel_data[0].status == "1") {
                    domain_current_days_saved[domain][archive_type] = true;
                    status_bar(status_bar_id, "success", successtxt, "", post_notice_config);
                    if (onsuccess) {
                        onsuccess();
                    }
                } else {
                    status_bar(status_bar_id, "error", LOCALE.maketext("Error"), data.cpanelresult.data[0].statusmsg, post_notice_config);
                    if (onerror) {
                        onerror();
                    }
                }
            },

            // API Failure handler
            failure: function(o) {
                onreturn();

                CPANEL.widgets.status_bar(status_bar_id, "error", LOCALE.maketext("Error"), (o.cpanel_error || o.error || "").html_encode(), post_notice_config);
                if (onerror) {
                    onerror();
                }
            }
        }
    });
}

/**
 * Setups the archive download popup and shows it.
 * @name archive_download
 * @param {string} domain
 * @param {string} targetEl
 */

function archive_download(domain, targetEl) {

    // Setup the popup box
    var noticebox = new CPANEL.ajax.Common_Dialog("", {
        width: "300px"
    });

    DOM.addClass(noticebox.element, "cjt_notice_dialog cjt_info_dialog");

    noticebox.setHeader(CPANEL.widgets.Dialog.applyDialogHeader(LOCALE.maketext("Archive Download Selection")));

    // Omit the cancel button
    noticebox.cfg.getProperty("buttons").pop();

    // Setup the submit
    noticebox.cfg.getProperty("buttons")[0].text = LOCALE.maketext("Close");
    noticebox.submit = function() {
        this.hide();
    };

    // Auto center it.
    noticebox.beforeShowEvent.subscribe(noticebox.center, noticebox, true);

    var substitute = YAHOO.lang.substitute;

    // Build the list
    var itemTemplate = DOM.get("download_archive_item_template").text;
    var items = "";
    for (var archive_type in archive_types) {
        items += substitute(itemTemplate, {
            "archive_type": archive_type,
            "domain": domain,
            "archive_type_name": archive_types[archive_type]
        });
    }

    // Build the dialog text
    var html = substitute(DOM.get("download_archive_template").text, {
        "domain": domain,
        "list": items
    });
    noticebox.setBody(html);
    noticebox.show_from_source(targetEl); // no fade so this stands out more

    // ??? May be a race condition, should be in the onshow event handler.
    for (var archive_type in archive_types) {

        // Setup the click event for the
        EVENT.on("download_" + archive_type + "_archives_" + domain, "click", function(e, x, y) {

            // Capture in closure
            var thisId = this.id;
            var info = parse_download_info(thisId);

            // Download the file
            frames.archivedown.location.href = CPANEL.security_token + "/fetchemailarchive/" + info.domain + "/" + info.archive_type;
            EVENT.preventDefault(e);
        });
    }

    EVENT.on("download_all_archives_" + domain, "click", function(e) {
        frames.archivedown.location.href = CPANEL.security_token + "/fetchemailarchive/" + domain;
        EVENT.preventDefault(e);
    });
}

/**
 * Event handler for the search box clear button.
 * Clears the search text box and submits the form.
 * @name onSearchClear
 * @param {EventObject} e
 */

function onSearchClear(e) {
    var form = this.form;
    var text = DOM.get("search-regex");
    text.value = "";
    form.submit();
}

/**
 * Sets the focus to the correct "first" control
 * @name setDefaultFocus
 */

function setDefaultFocus() {
    var searchTextEl = DOM.get("search-regex");
    if (searchTextEl) {
        var len = searchTextEl.value ? searchTextEl.value.length : 0;
        searchTextEl.focus();
        setCaretPosition(searchTextEl, len);
    }
}

/**
 * Tests if the object passed is a string.
 * @name isString
 * @param [Object] obj
 */

function isString(obj) {
    return obj !== undefined && obj !== null && obj.toLowerCase !== undefined;
}


/**
 * Sets the caret to the indicated position in the input element
 * @name setCaretPosition
 * @param [HTMLElement] el - input element to select the text in.
 * @param [Number] pos - postion to set the caret to0
 */

function setCaretPosition(el, pos) {
    if (el.setSelectionRange) {
        el.focus();
        el.setSelectionRange(pos, pos);
    } else if (el.createTextRange) {
        var range = el.createTextRange();
        range.collapse(true);
        range.moveEnd("character", pos);
        range.moveStart("character", pos);
        range.select();
    }
}

/**
 * Selects the text in the input element from start to finish character
 * @name selectText
 * @param [HTMLElement] el - input element to select the text in.
 * @param [Number] start - postion to set at the beginning of the selection.
 * @param [Number] end - position to set at the end of the selection.
 */

function selectText(el, start, end) {
    if (el.setSelectionRange) {
        el.focus();
        el.setSelectionRange(start, end);
    } else if (el.createTextRange) {
        var range = el.createTextRange();
        range.collapse(true);
        range.moveEnd("character", end);
        range.moveStart("character", start);
        range.select();
    }
}

/**
 * Checks if there is unsaved state and prompts the user to save their changes
 * @name onBeforeUnload
 * @param [EventObject] e -
 */

function onBeforeUnload(e) {
    for (var domain in domain_current_days_saved) {
        for (var type in domain_current_days_saved[domain]) {
            if (domain_current_days_saved[domain][type] === false) {

                // Return the focus to the unsaved element
                var elCustomInput = DOM.get("custom_archive_" + type + "_retain_days_" + domain);
                if (elCustomInput) {
                    setTimeout(function() {
                        elCustomInput.focus();
                    });
                }

                var warning = LOCALE.maketext("You have unsaved changes.");
                e = e || window.event;

                // For IE<8 and Firefox prior to version 4
                if (e) {
                    e.returnValue = warning;
                }

                // For Chrome, Safari, IE8+ and Opera 12+
                return warning;
            }
        }
    }
    return;
}

/**
 * Updates the domains on the page to match the now saved state
 * @name update_visible_elements
 * @param [Hash] data -
 */

function update_visible_elements(data, domains) {
    var i, l;

    data.forEach(function(d) {
        get_domain_controls(d.domain, d.direction).forEach(function(el) {
            if (el) {
                el.disabled = false;
            }
        });
    });

    for (var de in domains) {
        var domain = domains[de];
        var chk = null;
        for (var archive_type in archive_types) {
            chk = DOM.get("archive_" + archive_type + "_" + domain);

            // See if this one is on the page
            if (!chk) {

                // Domain not on the page
                break;
            }

            var setting = null;
            for (i = 0, l = data.length; i < l; i++) {
                if (data[i].direction == archive_type && data[i].domain == domain) {
                    setting = data[i];
                    break;
                }
            }

            var value = "";
            var enabled = false;
            if (setting && setting.status !== 0) {

                // Change failed or not made
                value = setting.retention_period;
                enabled = setting.enabled;
            }

            // Update the UI.
            var ddl = DOM.get("archive_" + archive_type + "_retain_days_" + domain);
            var txt = DOM.get("custom_archive_" + archive_type + "_retain_days_" + domain);
            var container = DOM.get("archive_" + archive_type + "_retain_days_" + domain + "_container");
            var customContainer = DOM.get("archive_" + archive_type + "_retain_days_" + domain + "_custom_container");

            // Initialize all the values
            chk.checked = enabled;
            var found = false;
            for (i = 0, l = ddl.options.length; i < l; i++) {
                if (ddl.options[i].value == value.toString()) {
                    ddl.selectedIndex = i;
                    found = true;
                    break;
                }
            }

            if (!found) {

                // Select the custom one.
                for (i = 0, l = ddl.options.length; i < l; i++) {
                    if (ddl.options[i].value === "") {
                        ddl.selectedIndex = i;
                        break;
                    }
                }
            }

            txt.value = value;

            // Configure the display
            if (chk.checked) {
                cpDOM.show(container);

                if (ddl.value === "") {
                    cpDOM.show(customContainer);
                } else {

                    // Hide the custom element container
                    cpDOM.hide(customContainer);
                }
            } else {
                cpDOM.hide(container);
                cpDOM.hide(customContainer);
            }

            configure_actions(domain);
        }
    }
}

/**
 * Enable the default archiving controls.
 * @name enable_default_archiving_controls
 * @param [bool] to_disable - Enable or disable the controls.
 */

function enable_default_archiving_controls(to_disable) {
    var controls = CPANEL.Y("default_config").all("input, select");
    controls.push(DOM.get("save_and_apply_default_config"));
    controls.forEach(function(c) {
        c.disabled = !!to_disable;
    });
}

/**
 * Disables the default archiving controls.
 * @name disable_default_archiving_controls
 */

function disable_default_archiving_controls() {
    enable_default_archiving_controls(true);
}

/**
 * Saves the default archiving configuration and applies it to all the existing domains.
 * @name onSaveAndApplyDefaultConfiguration
 * @param [EventObject] e -
 */

function onSaveAndApplyDefaultConfiguration(e) {
    var BATCH_SIZE = 5;
    var num_domains = all_archive_domains.length;
    var data = getDefaultConfigurationData();

    disable_default_archiving_controls();

    // Clear the progressbar markup.
    DOM.get("archive_progress_bar_GLOBAL").innerHTML = "";

    var progressText = DOM.get("archive_progress_bar_message_GLOBAL");
    var progressBar = new YAHOO.widget.ProgressBar({
        minValue: 0,
        maxValue: num_domains,
        value: 0,
        anim: true,

        // Setup an aria template to provide information to screen readers.
        ariaTextTemplate: LOCALE.maketext("Currently processing domain # [numf,_1] of [numf,_2].", "{value}", "{maxValue}")
    });

    _isProgressRunning = true;
    progressBar.render("archive_progress_bar_GLOBAL");

    progressBar.on("progress", function(value) {
        if (_isProgressRunning) {
            progressText.innerHTML = LOCALE.maketext("Applied to [numf,_1] of [quant,_2,domain,domains].", value, num_domains);
        }
    });

    var bar_img_el = CPANEL.Y.one("#archive_progress_bar_GLOBAL .yui-pb-bar");

    progressBar.on("complete", function(value) {
        if (value === num_domains) {
            window.setTimeout(function() {
                if (bar_img_el && DOM.inDocument(bar_img_el)) {
                    DOM.setStyle(bar_img_el, "background-image", "none");
                }
            }, 1500);
        }
    });

    progressText.innerHTML = LOCALE.maketext("Applied to [numf,_1] of [quant,_2,domain,domains].", 0, num_domains);
    DOM.setAttribute(DOM.get("save_and_apply_default_config"), "disabled", "disabled");

    // Setup the api2 call
    var call_data = {};

    // Merge the data
    for (var data_key in data) {
        call_data[data_key] = data[data_key];
    }

    cpDOM.show("spinner_GLOBAL");

    // The call to saveBatch will progressively re-enable these elements.
    CPANEL.Y("emailarchtbl").all("input, select").forEach(function(el) {
        el.disabled = true;
    });

    saveBatch(call_data, progressBar, progressText, 0, all_archive_domains.length < BATCH_SIZE ? all_archive_domains.length : BATCH_SIZE, BATCH_SIZE, num_domains);
}

var _isProgressRunning = false;

/**
 * Saves the a batch of the domains at a time...
 * @name saveBatch
 * @param [Hash] callData - data hash, includes only the config settings, need to add domains in this method.
 * @param [ProgressBar] progressBar - reference to the progress bar for this run.
 * @param [HTMLElement] progressText - refernce to the progress bars text label.
 * @param [Number] start - Start index for this batch.
 * @param [Number] end - End index for this batch.
 * @param [Number] size - Batch size to help in calculating the next batch.
 * @param [Number] length - Total number of domains to process.
 */

function saveBatch(callData, progressBar, progressText, start, end, size, length) {

    var domains = [];
    for (var i = start; i < end; i++) {
        domains.push(all_archive_domains[i]);
    }

    // Setup the api2 call for this batch
    callData["domains"] = domains.join(",");

    var status_bar_id = "archive_status_bar_GLOBAL";
    var spinner_id = "spinner_GLOBAL";

    var enable_form_controls = function() {
        CPANEL.Y("emailarchtbl").all("input, select").forEach(function(el) {
            el.disabled = false;
        });
    };

    CPANEL.api({
        module: "Email",
        func: "set_archiving_configuration",
        data: callData,
        callback: {

            // API Success handler
            success: function(o) {

                // Shortcuts
                var status_bar = CPANEL.widgets.status_bar;
                var nextStart = end;
                var nextEnd = nextStart + size > length ? length : nextStart + size;

                var isDone = nextStart >= length;

                if (isDone) {
                    cpDOM.hide(spinner_id);
                }

                if (o.cpanel_data) {
                    update_visible_elements(o.cpanel_data, domains);
                    if (isDone) {

                        // Finalize the progress bar
                        progressBar.set("value", length);

                        enable_default_archiving_controls();

                        _isProgressRunning = false;

                        progressText.innerHTML = LOCALE.maketext("Applied to [numf,_1] of [quant,_2,domain,domains].", length, length);

                        status_bar(
                            status_bar_id,
                            "success",
                            LOCALE.maketext("Applied the default email archive configuration to all the domains on this account."),
                            "", {
                                callbackFunc: function() {

                                    // Prevent a race between queued runs
                                    if (_isProgressRunning === false) {
                                        var bar = DOM.get("archive_progress_bar_GLOBAL");
                                        bar.innerHTML = "";
                                        progressText.innerHTML = "";
                                        cpDOM.hide(spinner_id);
                                    }
                                }
                            });
                    } else {
                        progressBar.set("value", end + 1);

                        // Trigger the next batch
                        saveBatch(callData, progressBar, progressText, nextStart, nextEnd, size, length);
                    }
                } else {
                    enable_form_controls();

                    status_bar(status_bar_id, "error", LOCALE.maketext("Error"), o.cpanelresults[0].statusmsg);
                    cpDOM.hide(spinner_id);
                    if (onerror) {
                        onerror();
                    }
                }

            },

            // API Failure handler
            failure: function(o) {
                enable_form_controls();

                // Shortcuts
                var status_bar = CPANEL.widgets.status_bar;

                // Enable the button
                var button = DOM.get("save_and_apply_default_config");
                DOM.removeAttribute(button, "disabled");

                // We are done so clear this
                _isProgressRunning = false;

                cpDOM.hide(spinner_id);
                status_bar(status_bar_id,
                    "error",
                    LOCALE.maketext("AJAX Error"),
                    LOCALE.maketext("Please refresh the page and try again."), {
                        callbackFunc: function() {

                            // Prevent a race between queued runs
                            if (_isProgressRunning === false) {
                                bar.innerHTML = "";
                                progressText.innerHTML = "";
                            }
                        }
                    });
            }
        }
    });
}

if (typeof (DOM.removeAttribute) === "undefined") {

    /**
     * Remove the named attribute from the element.
     * @name removeAttribute
     * @param [HTMLElement] elem - Element to remove the attribute from
     * @param [String] name - name of the attribute to remove
     * @note Extracted from JQUERY attributes.js since YUI does not have this method.
     */
    DOM.removeAttribute = function(elem, name) {
        if (name && elem.nodeType === 1) {

            propName = DOM.removeAttribute.propFix[name] || name;
            isBool = DOM.removeAttribute.rboolean.test(name);

            // See #9699 for explanation of this approach (setting first, then removal)
            // Do not do this for boolean attributes (see #10870)
            if (!isBool) {
                DOM.setAttribute(elem, name, "");
            }
            elem.removeAttribute(DOM.removeAttribute.getSetAttribute ? name : propName);

            // Set corresponding property to false for boolean attributes
            if (isBool && propName in elem) {
                elem[propName] = false;
            }
        }
    };

    (function() {
        var div = document.createElement("div");
        div.setAttribute("className", "t");
        DOM.removeAttribute.getSetAttribute = div.className !== "t";
    })();

    DOM.removeAttribute.rboolean = /^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)$/i;
    DOM.removeAttribute.propFix = {
        tabindex: "tabIndex",
        readonly: "readOnly",
        "for": "htmlFor",
        "class": "className",
        maxlength: "maxLength",
        cellspacing: "cellSpacing",
        cellpadding: "cellPadding",
        rowspan: "rowSpan",
        colspan: "colSpan",
        usemap: "useMap",
        frameborder: "frameBorder",
        contenteditable: "contentEditable"
    };
}

if (typeof (DOM.setTBODYInnerHTML) === "undefined") {

    /**
     * Correctly sets the innerHTML of a TBODY element cross-browser
     * @name setTBODYInnerHTML
     * @param [HTMLElement] tbody - reference to the tbody element to fill in.
     * @param [String] html - html string to apply to the innerHTML of the tbody element.
     */
    DOM.setTBODYInnerHTML = function(tbody, html) {
        if (navigator && navigator.userAgent.match(/MSIE/i)) {

            // fix MS Internet Exploder’s lameness
            var temp = DOM.setTBODYInnerHTML.temp;
            temp.innerHTML = "<table><tbody>" + html + "</tbody></table>";
            tbody.parentNode.replaceChild(temp.firstChild.firstChild, tbody);
        } else {
            tbody.innerHTML = html;
        }
    };

    DOM.setTBODYInnerHTML.temp = document.createElement("div");
}

/**
 * Click hander for initiating a table sorting via the server.
 * @name onSortClick
 * @param [EventArg] e -
 */

function onSortClick(e) {

    // Filter
    var searchregex = DOM.get("search-regex");

    // Sort
    var sort_column = DOM.get("search-sort-column");
    var sort_reverse = DOM.get("search-sort-reverse");

    var th = e.currentTarget;

    // Gather the new state
    var column_name = th.getAttribute("sort-column");
    var reverse = "1";
    if (sort_column.value === column_name) {
        if (sort_reverse.value === "0") {
            reverse = "1";
        } else {
            reverse = "0";
        }
    } else {
        if (column_name === "domain") {
            reverse = "0";
        } else {
            reverse = "1";
        }

    }

    // Update the parameters
    CPANEL.ui.widgets.pager.setParameters("DEFAULT", {
        api2_sort_column: column_name,
        api2_sort_reverse: reverse,
        fragment: 1
    });

    // Get the related query string
    var postData = CPANEL.ui.widgets.pager.getQuery("DEFAULT");

    var parts = window.location.href.split("/");
    parts.pop();
    parts.pop();
    var rootUrl = parts.join("/");
    var sUrl = rootUrl + "/mail/archive_table.html?" + postData;

    var callback = {
        success: onSortSuccess,
        failure: onSortFailure,
        argument: [{
            sort_column_name: column_name,
            sort_reverse: reverse
        }]
    };

    cpDOM.show("spinner_sorting");

    // And submit
    var request = YAHOO.util.Connect.asyncRequest("GET", sUrl, callback);
}

/**
 * What to do in a sort callback success
 * @name onSortSuccess
 * @param [AsyncCallbackObject] o - callback argument object.
 */

function onSortSuccess(o) {
    var table = DOM.get("emailarchtbl");
    if (!table) {
        return;
    }

    // Clear the array and allow new code to fill it.
    archive_domains = [];

    var tbody = table.getElementsByTagName("tbody")[0];

    var scripts = [];
    var fragement = document.createElement("div");
    var html = o.responseText;
    fragement.innerHTML = "<table><tbody>" + html + "</tbody></table>";
    var regex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gim;
    scripts = html.match(regex);

    html = html.replace(regex, "");
    DOM.setTBODYInnerHTML(tbody, html);

    window.setTimeout(function() {

        var strip = /<script\b[^>]*?>([^<]*?)<\/script>/mi;
        var block = null;
        for (var i = 0; i < scripts.length; i++) {
            try {
                block = scripts[i].match(strip);
                if (block && block.length > 1 && block[1]) {
                    eval(block[1]);
                }
            } catch (e) {

                // Ignore these for now.
                alert(e);
            }
        }

        // Reinitialize the events on the new rows.
        for (var i = 0, l = archive_domains.length; i < l; i++) {
            register_archive_domain(archive_domains[i]);
        }
    });

    cpDOM.hide("spinner_sorting");

    // Set the new state
    DOM.get("search-sort-column").value = o.argument[0].sort_column_name;
    DOM.get("search-sort-reverse").value = o.argument[0].sort_reverse;

    var parameters = {
        api2_sort_column: o.argument[0].sort_column_name,
        api2_sort_reverse: o.argument[0].sort_reverse
    };

    CPANEL.ui.widgets.pager.setParameters("DEFAULT", parameters);
}

/**
 * What to do in a sort callback failure.
 * @name onSortFailure
 * @param [AsyncCallbackObject] o - callback argument object.
 */

function onSortFailure(o) {
    cpDOM.hide("spinner_sorting");
}

/**
 * Initialize the drop down state to the correct value. This is primarly used if users
 * navigate back and then forward again on browsers that have weird caching rules.
 * @name initialize_archive_domain
 * @param [String] domain - domain name to initialize.
 */

function initialize_archive_domain(domain) {
    for (var archive_type in archive_types) {
        var val = DOM.get("custom_archive_" + archive_type + "_retain_days_" + domain).value;
        var dropdown = DOM.get("archive_" + archive_type + "_retain_days_" + domain);
        if (dropdown.val != val) {
            var index = -1;
            var customIndex = -1;
            for (ii = 0, ll = dropdown.options.length; ii < ll; ii++) {
                if (dropdown.options[ii].value == val) {
                    index = ii;
                    break;
                }
                if (dropdown.options[ii].value === "") {
                    customIndex = ii;
                }
            }

            if (index != -1) {

                // Found a match
                dropdown.selectedIndex = index;
            } else {

                // Its a custom one.
                dropdown.selectedIndex = customIndex;
            }
        }
    }
}

/**
 * Initialize the page
 * @global
 */
(function() {
    EVENT.addListener(window, "load", function() {
        for (var i = 0, l = archive_domains.length; i < l; i++) {
            register_archive_domain(archive_domains[i]);
            initialize_archive_domain(archive_domains[i]);
        }

        register_archive_domain("GLOBAL", true);

        // Setup the show/hide
        EVENT.addListener("save_and_apply_default_config", "click", onSaveAndApplyDefaultConfiguration);

        // Sets up the handler for the clear button.
        EVENT.addListener(DOM.get("search-clear"), "click", onSearchClear);

        // Setup the before unload handler.
        EVENT.addListener(window, "beforeunload", onBeforeUnload);

        // Sets the focus to the first visible element
        setDefaultFocus();

        // If the page reloads before an AJAX call returned,
        // the browser might still have some form elements disabled on load.
        CPANEL.Y.all("input, select").forEach(function(el) {
            el.disabled = false;
        });
    });
})();
