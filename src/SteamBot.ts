import SteamID from "steamid";
import fetch from "node-fetch";
import { SteamProfile } from "./types";

export default class SteamBot {

  constructor() {

  }

  async scrape(id: string): Promise<SteamProfile> {
    if (!new SteamID(id).isValid()) {
      throw new Error("Invalid SteamId");
    }

    const html = await fetch(`https://steamcommunity.com/profiles/${id}/`);
    const text = await html.text();
    const matches = [...text.replace(/\s/g, "").matchAll(/g_rgProfileData=(.*?);\$J\(function\(\)/g)];
    if (matches.length < 1) {
      throw new Error(`Failed to scrape profile ${`https://steamcommunity.com/profiles/${id}/`}`);
    }

    try {
      const json = JSON.parse(matches[0][1]) as SteamProfile;
      if (text.includes(`<span class="count_link_label">Friends</span>`)) {
        json.publicFriends = true;
      }

      return json;
    } catch {
      throw new Error("Failed to parse profile");
    }
  }

  async scrapeFriends(id: string): Promise<string[]> {
    if (!new SteamID(id).isValid()) {
      throw new Error("Invalid SteamId");
    }

    const html = await fetch(`https://steamcommunity.com/profiles/${id}/friends`);
    const text = await html.text();
    const matches = [...text.matchAll(/data-steamid="(.*?)"/g)].map(m => m[1]);
    return matches;
  }


}