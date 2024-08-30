/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { Constants, FluxDispatcher, Menu, RestAPI, SelectedChannelStore } from "@webpack/common";

const settings = definePluginSettings({
    soundGuildId: {
        description: "Guild ID of sound source",
        type: OptionType.STRING
    },
    soundId: {
        description: "ID of sound",
        type: OptionType.STRING
    }
});

interface Sound {
    soundId: string;
    guildId: string;
}

const SoundButtonContext: NavContextMenuPatchCallback = (children, data: { sound: Sound; }) => {
    children.splice(1, 0, (
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="set-global-exit"
                label="Set as global exit sound"
                action={() => {
                    settings.store.soundGuildId = data.sound.guildId;
                    settings.store.soundId = data.sound.soundId;
                }}
            />
        </Menu.MenuGroup>
    ));
};

export default definePlugin({
    name: "ExitSounds",
    description: "Play noises when you disconnect or swap channels.",
    authors: [{ name: "niko", id: 341377368075796483n }],
    settings,

    contextMenus: {
        "sound-button-context": SoundButtonContext
    },

    patches: [
        {
            find: "this.selectVoiceChannel",
            replacement: {
                // kill me for this patch. this can't be right ??
                match: /(selectVoiceChannel\()(\i)\)(\{.*}),/,
                replace: "$1$2){$self.handleChannelChange($2,()=>$3)},"
            }
        }
    ],

    handleChannelChange(id: string, callback: (id: string) => void) {
        const voiceID = SelectedChannelStore.getVoiceChannelId();
        if (voiceID && (SelectedChannelStore.getVoiceChannelId() != id)) {
            const guildID = settings.store.soundGuildId;
            const soundboardID = settings.store.soundId;

            RestAPI.post({
                url: Constants.Endpoints.SEND_SOUNDBOARD_SOUND(voiceID),
                body: {
                    sound_id: soundboardID,
                    source_guild_id: guildID,
                },
            }).finally(() => { callback(id); });
        } else {
            callback(id);
        }
    }
});
