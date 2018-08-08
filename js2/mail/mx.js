/* globals LANG:false */

var MXCHECK_UPDATING = 0;

var toggle_info_for = function(routing_option) {
    var more_link = document.getElementById(routing_option + "_toggle_more");
    var less_link = document.getElementById(routing_option + "_toggle_less");
    var toggle_details = document.getElementById("mxcheck_" + routing_option + "_desc");
    if (/less/.test(toggle_details.className)) {
        more_link.style.display = "none";
        less_link.style.display = "inline";
        toggle_details.className = toggle_details.className.replace(/(?:^|\s)less(?!\S)/g, "");
    } else {
        toggle_details.className += " less";
        less_link.style.display = "none";
        more_link.style.display = "inline";
    }
};

var show_routing_form = function() {
    document.getElementById("mx_input_and_table").style.display = "inline";
};

var hide_routing_form = function() {
    document.getElementById("mx_input_and_table").style.display = "none";
};

var show_error_message = function(message) {
    if (message) {
        document.getElementById("error_message_box").style.display = "block";
        document.getElementById("error_message_text").innerHTML = message;
    }
};

var hide_error_message = function() {
    document.getElementById("error_message_box").style.display = "none";
    document.getElementById("error_message_text").innerHTML = "";
};

var deselect_mxcheck_ui = function() {
    document.getElementById("mxcheck_auto").checked = false;
    document.getElementById("mxcheck_local").checked = false;
    document.getElementById("mxcheck_secondary").checked = false;
    document.getElementById("mxcheck_remote").checked = false;

    document.getElementById("mxcheck_auto_label").style["font-weight"] = "normal";
    document.getElementById("mxcheck_local_label").style["font-weight"] = "normal";
    document.getElementById("mxcheck_secondary_label").style["font-weight"] = "normal";
    document.getElementById("mxcheck_remote_label").style["font-weight"] = "normal";

    document.getElementById("mxcheck_auto_current_setting").innerHTML = "";
    document.getElementById("mxcheck_detected_state_local").innerHTML = "";
    document.getElementById("mxcheck_detected_state_secondary").innerHTML = "";
    document.getElementById("mxcheck_detected_state_remote").innerHTML = "";
};

var get_mxcheck_for_domain_state_ui = function() {
    var mxcheck_state = document.getElementById("mxcheck_state").value;
    var detected_state = document.getElementById("detected_state").value;

    document.getElementById("change_mxcheck_button").disabled = false;
    deselect_mxcheck_ui();
    if (mxcheck_state === "auto" || mxcheck_state === "local" || mxcheck_state === "secondary" || mxcheck_state === "remote") {
        document.getElementById("mxcheck_" + mxcheck_state).checked = true;
        document.getElementById("mxcheck_" + mxcheck_state + "_label").style["font-weight"] = "bold";

        if (mxcheck_state === "auto") {
            if (detected_state === "secondary") {
                document.getElementById("mxcheck_auto_current_setting").innerHTML = ": " + LANG.MX_Backup;
            } else if (detected_state === "remote") {
                document.getElementById("mxcheck_auto_current_setting").innerHTML = ": " + LANG.MX_Remote;
            } else {
                document.getElementById("mxcheck_auto_current_setting").innerHTML = ": " + LANG.MX_Local;
            }
            if (detected_state !== "auto") {
                document.getElementById("mxcheck_detected_state_" + detected_state).innerHTML = "(" + LANG.MX_current_detected_setting + ")";
            }
        }
    }
};

var update_mx_state_from_checkmx = function(checkmx) {
    document.getElementById("mxcheck_state").value = checkmx.mxcheck;
    document.getElementById("detected_state").value = checkmx.detected;
    document.getElementById("mxcheck_status").innerHTML = "";
    get_mxcheck_for_domain_state_ui();
};

var send_api_request = function(api_call_url, callback) {
    var mxcheck_request = new XMLHttpRequest();
    mxcheck_request.onreadystatechange = function() {
        if (mxcheck_request.readyState === 4 ) {
            if (mxcheck_request.status === 200) {
                callback.success(mxcheck_request);
            } else {
                callback.failure();
            }
        }
    };
    mxcheck_request.open("GET", api_call_url, true);
    mxcheck_request.send();
};

var get_mxcheck_for_domain = function() {
    if (MXCHECK_UPDATING) {
        return;
    }

    hide_error_message();

    MXCHECK_UPDATING = 1;
    var mxcheck_domain = document.getElementById("domain").value;

    var api2_call = {
        "cpanel_jsonapi_version": 2,
        "cpanel_jsonapi_module": "Email",
        "cpanel_jsonapi_func": "listmx",
        "show_a_records": 1,
        "domain": mxcheck_domain
    };

    var callback = {
        success: function(o) {
            MXCHECK_UPDATING = 0;
            try {
                var results = JSON.parse(o.responseText);
                var routing_option = {};
                var data = results.cpanelresult.data[0] || {
                    "mxcheck": "",
                    "detected": "",
                };
                routing_option.mxcheck = data.mxcheck;
                routing_option.detected = data.detected;
                update_mx_state_from_checkmx(routing_option);
            } catch (error) {
                show_error_message(LOCALE.maketext("JSON parse failed."));
            }
            get_mxcheck_for_domain_state_ui();
        },
        failure: function() {
            MXCHECK_UPDATING = 0;
            show_error_message(LOCALE.maketext("AJAX Error") + ": " + LOCALE.maketext("Please refresh the page and try again."));
        }
    };

    // send the AJAX request
    send_api_request(CPANEL.urls.json_api(api2_call), callback);
    document.getElementById("change_mxcheck_button").disabled = true;
    document.getElementById("mxcheck_status").innerHTML = LOCALE.maketext("Loading …");
    deselect_mxcheck_ui();
};

var change_mxcheck = function() {

    // don't submit the request if the state hasn't changed
    var mxcheck_state_el = document.getElementById("mxcheck_state");
    var mxcheck = CPANEL.util.get_radio_value("mxcheck", "mxcheck_options_div");
    if (mxcheck_state_el.value === mxcheck) {
        return true;
    }

    hide_error_message();

    var api2_call = {
        "cpanel_jsonapi_version": 2,
        "cpanel_jsonapi_module": "Email",
        "cpanel_jsonapi_func": "setmxcheck",
        "domain": document.getElementById("domain").value,
        "mxcheck": mxcheck
    };

    // callback
    var callback = {
        success: function(o) {
            try {
                var data = JSON.parse(o.responseText);
                if (data.cpanelresult.error) {
                    show_error_message(data.cpanelresult.error);
                } else if (data.cpanelresult.data[0].status === 1) {
                    mxcheck_state_el.value = data.cpanelresult.data[0].mxcheck;
                    document.getElementById("detected_state").value = data.cpanelresult.data[0].detected;
                    document.getElementById("mxcheck_status").innerHTML = "";
                } else {
                    show_error_message(data.cpanelresult.data[0].statusmsg);
                }
            } catch (e) {
                show_error_message(LOCALE.maketext("JSON parse failed."));
            }
            get_mxcheck_for_domain_state_ui();
        },
        failure: function()  {
            show_error_message(LOCALE.maketext("AJAX Error") + ": " + LOCALE.maketext("Please refresh the page and try again."));
            get_mxcheck_for_domain_state_ui();
        }
    };

    // send the request
    send_api_request(CPANEL.urls.json_api(api2_call), callback);

    document.getElementById("change_mxcheck_button").disabled = true;
    document.getElementById("mxcheck_status").innerHTML = CPANEL.icons.ajax + " " + LANG.MX_changing;
};

var toggle_domain = function() {
    var domain = document.getElementById("domain").value;
    if (domain === "_select_") {
        hide_routing_form();
    } else {
        get_mxcheck_for_domain();
        show_routing_form();
    }
};

var init_page = function() {
    var domain_el = document.getElementById("domain");

    // attach event listeners here instead of in template
    if (domain_el.tagName === "SELECT") {
        domain_el.addEventListener("change", toggle_domain);
    }

    document.getElementById("change_mxcheck_button").addEventListener("click", change_mxcheck);

    document.getElementById("mxcheck_auto_toggle").addEventListener("click", function() {
        toggle_info_for("auto");
    }, false);

    document.getElementById("mxcheck_remote_toggle").addEventListener("click", function() {
        toggle_info_for("remote");
    }, false);

    document.getElementById("mxcheck_secondary_toggle").addEventListener("click", function() {
        toggle_info_for("secondary");
    }, false);

    document.getElementById("mxcheck_local_toggle").addEventListener("click", function() {
        toggle_info_for("local");
    }, false);

    if (domain_el.value === "_select_") {
        hide_routing_form();
    } else {
        get_mxcheck_for_domain();
        show_routing_form();
    }
};

document.addEventListener("DOMContentLoaded", init_page);
