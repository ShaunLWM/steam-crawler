import "dotenv/config";
import "source-map-support/register";

import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { Queue, QueueOptions, Worker } from "bullmq";
import express from "express";
import mongoose from "mongoose";
import Profile from "./models/Profile.model";
import Relationship from "./models/Relationship.model";
import { scrape } from "./SteamBot";

mongoose.set("strictQuery", true);

const BASE_ID = "76561198160318546";
const QUEUE_CONFIG: QueueOptions = {
  connection: {
    port: Number(process.env.REDIS_PORT as string),
    host: process.env.REDIS_HOST,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
  },
};

async function start() {
  console.log("Connecting to MongoDB...");
  console.log(process.env.MONGO_DB);
  await mongoose.connect(process.env.MONGO_DB as string);
  console.log("Connected to MongoDB");

  const app = express();
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/ui");

  const pQueue = new Queue("Profile", QUEUE_CONFIG);
  const rQueue = new Queue("Relationship", QUEUE_CONFIG);

  new Worker<{ id: string }>(
    "Profile",
    async ({ data, name }) => {
      if (name !== "profile") return;
      const existingProfile = await Profile.findOne({
        steamId: data.id,
      }).exec();

      if (existingProfile) {
        // TODO: add lastUpdated checks so can update friendship
        // return console.log(`[profile] ${data.id} already exists`);
        return;
      }

      const profile = await scrape(data.id);
      console.log(`[profile] ${profile.personaname} (${profile.steamid})`);
      await Profile.create({
        steamId: profile.steamid,
        name: profile.personaname,
        img: profile.img,
      });

      profile?.friends?.map((item) => {
        pQueue.add("profile", { id: item }, { jobId: `${item}_0` });
        rQueue.add("relationship", { id1: data.id, id2: item });
      });
    },
    QUEUE_CONFIG,
  );

  new Worker<{ id1: string; id2: string }>(
    "Relationship",
    async (job) => {
      if (job.name !== "relationship") return;
      const existingRelationship = await Relationship.find()
        .or([
          { id1: job.data.id1, id2: job.data.id2 },
          { id1: job.data.id2, id2: job.data.id1 },
        ])
        .exec();
      if (existingRelationship.length > 0) {
        return console.log(
          `[relationship] ${job.data.id1} and ${job.data.id2} already exists`,
        );
      }

      await Relationship.create({ id1: job.data.id1, id2: job.data.id2 });
      // console.log(`[relationship] ${job.data.id1} and ${job.data.id2} created`);
    },
    Object.assign({}, QUEUE_CONFIG, { concurrency: 50 }),
  );

  createBullBoard({
    queues: [new BullMQAdapter(pQueue), new BullMQAdapter(rQueue)],
    serverAdapter,
  });

  app.use("/ui", serverAdapter.getRouter());

  app.listen(3000, () => {
    pQueue.add("profile", { id: BASE_ID });
    console.log("Running on 3000...");
    console.log("For the UI, open http://localhost:3000");
  });
}

async function demo() {
  try {
    const friends = await scrape(BASE_ID);
    console.log(friends);
  } catch (error) {
    console.log(error);
  }
  return;
}

// demo();
start();
