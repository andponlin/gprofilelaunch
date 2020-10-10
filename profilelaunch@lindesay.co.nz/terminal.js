/*
 * Copyright 2020, Andrew Lindesay. All Rights Reserved.
 * Distributed under the terms of the MIT License.
 *
 * Authors:
 *              Andrew Lindesay, apl@lindesay.co.nz
 */

/**
 * This logic deals with getting profiles for the Gnome Terminal application.  The
 * profiles for Gnome Terminal are stored in the Gnome settings.  This logic
 * searches the settings to find the profiles.  It is able to start Gnome
 * Terminal with the user's nominated profile.
 */

const Util = imports.misc.util;
const Gio = imports.gi.Gio;

const TERMINAL_SETTINGS_PROFILES_LIST_SCHEMA = "org.gnome.Terminal.ProfilesList";
const TERMINAL_SETTINGS_PROFILE_SCHEMA = "org.gnome.Terminal.Legacy.Profile";

class TerminalProfile {
    constructor(name, id) {
        this.name = name;
        this.id = id;
    }
}

function launchWithProfileId(desktopAppInfo, profileId) {
    log('launching [' + desktopAppInfo.get_id() + '] with profile [' + profileId + ']');
    Util.spawn([desktopAppInfo.get_executable(), '--window-with-profile-internal-id=' + profileId ]);
}

function deriveProfiles() {

    function deriveDefaultProfileId() {
        let settings = Gio.Settings.new(TERMINAL_SETTINGS_PROFILES_LIST_SCHEMA);
        return settings ? settings.get_string("default") : undefined;
    }

    function deriveProfileIds() {
        let settings = Gio.Settings.new(TERMINAL_SETTINGS_PROFILES_LIST_SCHEMA);
        return settings ? settings.get_strv("list") : undefined;
    }

    let profileIds = deriveProfileIds();
    let defaultProfileId = deriveDefaultProfileId();

    function createTerminalProfileForId(id) {

        function deriveProfileName(id, name) {
            if ((!name || name === 'Unnamed') && id === defaultProfileId) {
                return 'default';
            }
            return name ? name : '???';
        }

        let path = '/org/gnome/terminal/legacy/profiles:/:' + id + '/';
        let settings = Gio.Settings.new_with_path(TERMINAL_SETTINGS_PROFILE_SCHEMA, path);
        let name = settings ? settings.get_string("visible-name") : undefined;
        return new TerminalProfile(deriveProfileName(id, name), id);
    }

    log("did find " + profileIds.length + " terminal profile ids");

    if (defaultProfileId) {
        log("the default terminal profile is [" + defaultProfileId + "]");
    }

    return deriveProfileIds()
        .map(id => createTerminalProfileForId(id))
        .sort((tp1, tp2) => tp1.name.toLowerCase().localeCompare(tp2.name.toLowerCase()));
}
