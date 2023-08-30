import SteamID from "steamid";
import fetch from "node-fetch";
import fs from "fs";

export const scrape = async (id: string) => {
  const result = <SteamProfile>{};

  if (!new SteamID(id).isValid()) {
    throw new Error("Invalid SteamId");
  }

  const html = await fetch(`https://steamcommunity.com/profiles/${id}/friends`);
  const text = (await html.text()).replace(/\t/g, "").replace(/\n/g, "");
  result.friends = [...text.matchAll(/data-steamid="(.*?)"/g)].map((m) => m[1]);

  const matches = [...text.matchAll(/var g_rgProfileData = (.*?)"};/g)];
  if (matches.length < 1) {
    console.log(`------- FAILED -------`);
    console.log(matches);
    process.exit(0);
    throw new Error(
      `Failed to scrape profile ${`https://steamcommunity.com/profiles/${id}/`}`,
    );
  }

  const json = JSON.parse(`${matches[0][1]}"}`) as SteamProfileResponse;
  result.personaname = json.personaname;
  result.steamid = json.steamid;
  result.url = json.url;
  const parseAvatar = [
    ...text.matchAll(
      /<a href="https:\/\/steamcommunity\.com\/(?:profiles|id)\/.*?" ><img src="https:\/\/(?:avatars\.cloudflare\.steamstatic\.com\/|cdn\.cloudflare\.steamstatic\.com\/steamcommunity\/public\/images\/items\/)(.*?)"><\/a>/g,
    ),
  ];

  if (!parseAvatar || parseAvatar[0].length < 1) {
    console.log(`------- FAILED -------`);
    fs.writeFileSync(`${id}.html`, text);
  }

  result.img = parseAvatar[0][1] ?? "";
  return result;
};
