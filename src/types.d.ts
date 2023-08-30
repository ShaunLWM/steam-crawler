interface SteamProfileResponse {
  url: string;
  steamid: string;
  personaname: string;
}

interface SteamProfile extends SteamProfileResponse {
  friends: string[];
  img: string;
}
