import { setupArgosChannel } from "./utils/channel";

// Registered ahead of the user's setup files so the channel exists before any
// addon preview module captures one. See `setupArgosChannel`.
setupArgosChannel();
