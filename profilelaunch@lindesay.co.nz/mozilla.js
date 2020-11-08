/*
 * Copyright 2020, Andrew Lindesay. All Rights Reserved.
 * Distributed under the terms of the MIT License.
 *
 * Authors:
 *              Andrew Lindesay, apl@lindesay.co.nz
 */

/**
 * This logic deals with identifying Firefox/Thunderbird profiles as well
 * as starting Firefox/Thunderbird with a specific profile.  Firefox/Thunderbird
 * maintains a list of profiles in an `.ini` file in the home directory.  This
 * `.ini` file is parsed and the profiles are derived from this.
 */

const GLib = imports.gi.GLib;
const Util = imports.misc.util;
const ByteArray = imports.byteArray;

class IniSection {
    constructor(name) {
        this.name = name;
        this.data = new Map();
    }
}

function launchWithProfile(desktopAppInfo, profileName) {
    log('launching [' + desktopAppInfo.get_id() + '] with profile [' + profileName + ']');
    Util.spawn([desktopAppInfo.get_executable(), '-P', profileName]);
}

function deriveProfileNames(desktopAppInfo) {

    function parseIniFile(filename) {

        function parseIniLines(lines) {

            function isCommentLine(line) {
                return line && (line.startsWith(';') || line.startsWith('#'));
            }

            function toSectionName(line) {
                let m = line.match(/^\[(.+)]$/);
                return m ? m[1] : undefined;
            }

            function toKeyValuePair(line) {
                let pair = [''];
                let escape = false;

                for (var i = 0; i < line.length; i++) {
                    let c = line.charAt(i);
                    if (escape) {
                        pair[pair.length - 1] += c;
                        escape = false;
                    }
                    else {
                        switch (c) {
                            case '\\':
                                escape = true;
                                break;
                            case '=':
                                pair.push('');
                                break;
                            default:
                                pair[pair.length - 1] += c;
                                break;
                        }
                    }
                }

                if (pair.length === 2 && pair[0] && pair[1]) {
                    return pair;
                }

                return undefined;
            }

            return lines
                .map(l => l.trim())
                .filter(l => l && !isCommentLine(l))
                .reduce(
                    (sections, l) => {
                        let sectionName = toSectionName(l);
                        if (sectionName) {
                            return sections.concat([new IniSection(sectionName)]);
                        }
                        let keyValuePair = toKeyValuePair(l);
                        if (keyValuePair && sections.length) {
                            sections[sections.length - 1].data.set(keyValuePair[0], keyValuePair[1]);
                            return sections;
                        }
                        log('bad line [' + l + ']');
                        return sections;
                    },
                    []
                );
        }

        let payloadString = ByteArray.toString(GLib.file_get_contents(filename)[1]);
        return parseIniLines(payloadString.split(/[\r\n]+/));
    }

    function getProfilesIniSections() {

        function getProfilesFile(appId) {
            switch (appId) {
                case 'firefox.desktop':
                    return GLib.build_filenamev([homeDir, '.mozilla', 'firefox', 'profiles.ini']);
                case 'thunderbird.desktop':
                    return GLib.build_filenamev([homeDir, '.thunderbird', 'profiles.ini']);
                default:
                    throw Error('unknown mozilla application [' + appId + ']');
            }
        }

        let homeDir = GLib.get_home_dir();

        if (!homeDir) {
            log('the home directory was not available');
            return [];
        }

        let profilesFile = getProfilesFile(desktopAppInfo.get_id());

        if (!profilesFile) {
            log('the profiles file [' + profilesFile + '] was not able to be formulated');
            return [];
        }

        if (!GLib.file_test(profilesFile, GLib.FileTest.IS_REGULAR)) {
            log('the profiles file [' + profilesFile + '] does not exist');
            return [];
        }

        return parseIniFile(profilesFile);
    }

    return getProfilesIniSections()
        .filter(s => s.name.startsWith('Profile'))
        .filter(s => s.data.has('Name'))
        .map(s => s.data.get('Name'))
        .filter(n => n)
        .sort((n1, n2) => n1.toLowerCase().localeCompare(n2.toLowerCase()));
}
