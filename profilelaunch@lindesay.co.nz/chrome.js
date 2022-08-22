/*
 * Copyright 2020-2022, Andrew Lindesay. All Rights Reserved.
 * Distributed under the terms of the MIT License.
 *
 * Authors:
 *              Andrew Lindesay, apl@lindesay.co.nz
 */

/**
 * This logic takes responsibility for interfacing with the Chrome Browser.  Chrome
 * Browser has no concept of a completely isolated profile like Firefox does, but
 * it is possible to start it with different directories.  This logic uses an
 * environment variable to identify the different variables.
 */

const GLib = imports.gi.GLib;
const Util = imports.misc.util;

const ENV_SEARCH_PATHS = 'PROFILELAUNCH_CHROME_USER_DATA_DIRS'

class UserDataDirectory {
    constructor(name, path) {
        this.name = name;
        this.path = path;
    }
}

function launchWithUserDataDirectory(desktopAppInfo, directory) {
    log('launching [' + desktopAppInfo.get_id() + '] with user data directory [' + directory + ']');
    Util.spawn([desktopAppInfo.get_executable(), '--user-data-dir=' + directory]);
}

function deriveUserDataDirectories() {

    function getStandardUserDataDirectory() {
        let homeDir = GLib.get_home_dir();

        if (!homeDir) {
            log('the home directory was not available');
            return undefined;
        }

        let chromeUserDir = GLib.build_filenamev([homeDir, '.config', 'google-chrome' ]);

        if (!GLib.file_test(chromeUserDir, GLib.FileTest.IS_DIR)) {
            log('the chrome standard profile directory [' + chromeUserDir + '] does not exist');
            return undefined;
        }

        return new UserDataDirectory('default', chromeUserDir);
    }

    function getOtherUserDataDirectories() {

        function deriveName(path) {
            let basename = GLib.path_get_basename(path);

            if (!basename || basename.startsWith('.')) {
                return '???';
            }

            switch (basename) {
                case 'chrome':
                case 'google-chrome':
                    return deriveName(GLib.path_get_dirname(path));
                default:
                    return basename;
            }
        }

        let env = GLib.get_environ();
        let val = GLib.environ_getenv(env, ENV_SEARCH_PATHS);
        if (val) {
            log('will look for chrome user data dirs in [' + val + ']');
        }
        else {
            log('there are no chrome user data dirs configured');
        }
        return (val || '').split(':')
            .filter(path => path)
            .map(path => new UserDataDirectory(deriveName(path), path))
    }

    let stdDir = getStandardUserDataDirectory();
    return (stdDir ? [ stdDir ] : [])
            .concat(getOtherUserDataDirectories())
        .sort((udd1, udd2) => udd1.name.toLowerCase().localeCompare(udd2.name.toLowerCase()));
}
