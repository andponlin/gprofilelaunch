/*
 * Copyright 2020, Andrew Lindesay. All Rights Reserved.
 * Distributed under the terms of the MIT License.
 *
 * Authors:
 *              Andrew Lindesay, apl@lindesay.co.nz
 */

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Shell = imports.gi.Shell;
const {St, Clutter} = imports.gi;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Mozilla = Me.imports.mozilla;
const Chrome = Me.imports.chrome;
const Terminal = Me.imports.terminal;

const PANEL_BUTTON_CODE = 'profilelaunch';

const APP_ID_FIREFOX = 'firefox.desktop';
const APP_ID_THUNDERBIRD = 'thunderbird.desktop';
const APP_ID_GOOGLE_CHROME = 'google-chrome.desktop';
const APP_ID_GNOME_TERMINAL = 'org.gnome.Terminal.desktop';

function createPanelButton() {

    function maybeSetupForApplication(app_id, setupFn) {
        let app = appSystem.lookup_app(app_id);
        if (app) {
            log('application [' + app_id + '] is installed');
            setupFn(app.get_app_info());
        }
        else {
            log('application [' + app_id + '] is not installed');
        }
    }

    function createPopupMenuItem(desktopAppInfo, label) {
        let stIcon = new St.Icon({ gicon: desktopAppInfo.get_icon(), style_class : "popup-menu-icon", icon_size: 16 });
        let stLabel = new St.Label({ text: label });
        let item = new PopupMenu.PopupBaseMenuItem();
        item.add(stIcon);
        item.add(stLabel);
        return item;
    }

    function setupForMozilla(desktopAppInfo) {
        Mozilla.deriveProfileNames(desktopAppInfo).forEach(profileName => {
            let popupMenuItem = createPopupMenuItem(desktopAppInfo, profileName);
            popupMenuItem.connect('activate', function() {
                Mozilla.launchWithProfile(desktopAppInfo, profileName);
            });
            panelButton.menu.addMenuItem(popupMenuItem);
        });
    }

    function setupForChrome(desktopAppInfo) {
        Chrome.deriveUserDataDirectories().forEach(userDataDirectory => {
            let popupMenuItem = createPopupMenuItem(desktopAppInfo, userDataDirectory.name);
            popupMenuItem.connect('activate', function() {
                Chrome.launchWithUserDataDirectory(desktopAppInfo, userDataDirectory.path);
            });
            panelButton.menu.addMenuItem(popupMenuItem);
        });
    }

    function setupForTerminal(desktopAppInfo) {
        Terminal.deriveProfiles().forEach(profile => {
            let popupMenuItem = createPopupMenuItem(desktopAppInfo, profile.name);
            popupMenuItem.connect('activate', function() {
                Terminal.launchWithProfileId(desktopAppInfo, profile.id);
            });
            panelButton.menu.addMenuItem(popupMenuItem);
        });
    }

    let appSystem = Shell.AppSystem.get_default();

    let panelButton = new PanelMenu.Button(0.0);
    let panelButtonIcon = new St.Icon({
        gicon: Gio.icon_new_for_string(Me.path + "/profilelaunch.svg"),
        style_class : "system-status-icon"
    });

    panelButton.add_actor(panelButtonIcon);

    maybeSetupForApplication(APP_ID_FIREFOX, setupForMozilla);

    if (!panelButton.menu.isEmpty()) {
        panelButton.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    }

    maybeSetupForApplication(APP_ID_THUNDERBIRD, setupForMozilla);

    if (!panelButton.menu.isEmpty()) {
        panelButton.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    }

    maybeSetupForApplication(APP_ID_GOOGLE_CHROME, setupForChrome);

    if (!panelButton.menu.isEmpty()) {
        panelButton.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    }

    maybeSetupForApplication(APP_ID_GNOME_TERMINAL, setupForTerminal);

    return panelButton;
}

/**
 * This is a standard function that needs to be implemented for the extension
 * to work.
 * This seems to be invoked when the extension is created.
 */

function init () {
}

/**
 * This is a standard function that needs to be implemented for the extension
 * to work.
 * This seems to be invoked on login as well as when the screen is unlocked.
 */

function enable () {
    Main.panel.addToStatusArea(PANEL_BUTTON_CODE, createPanelButton());
}

/**
 * This is a standard function that needs to be implemented for the extension
 * to work.
 * This seems to be invoked on logout as well as when the screen is locked.
 */

function disable () {
    Main.panel.statusArea[PANEL_BUTTON_CODE].destroy();
}
