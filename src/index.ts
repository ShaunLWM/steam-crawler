import "dotenv/config";
import { BullMQAdapter, createBullBoard, ExpressAdapter } from "@bull-board/express";
import { Queue, QueueOptions, Worker } from 'bullmq';
import express from "express";
import mongoose from "mongoose";
import Profile from "./models/Profile.model";
import Relationship from "./models/Relationship.model";
import SteamBot from "./SteamBot";

mongoose.set('strictQuery', true);

const BASE_ID = "76561198160318546";
const QUEUE_CONFIG: QueueOptions = { connection: { port: Number(process.env.REDIS_PORT as string), host: process.env.REDIS_HOST, username: process.env.REDIS_USERNAME, password: process.env.REDIS_PASSWORD } };

const bot = new SteamBot();

async function start() {
  await mongoose.connect(process.env.MONGO_DB as string);

  const app = express();
  const serverAdapter = new ExpressAdapter();

  const pQueue = new Queue('Profile', QUEUE_CONFIG);
  const fQueue = new Queue('Friends', QUEUE_CONFIG);
  const rQueue = new Queue('Relationship', QUEUE_CONFIG);

  new Worker<{ id: string }>('Profile', async job => {
    if (job.name !== "profile") return;
    const existingProfile = await Profile.findOne({ steamid: job.data.id }).exec();
    if (existingProfile) {
      // TODO: add lastUpdated checks so can update friendship
      return console.log(`[profile] ${job.data.id} already exists`);
    }

    const profile = await bot.scrape(job.data.id);
    console.log(`[profile] ${profile.personaname} (${profile.steamid})`);
    await Profile.create({ steamid: profile.steamid });
    if (profile.publicFriends) {
      fQueue.add('friends', { id: job.data.id });
    }
  }, QUEUE_CONFIG);

  new Worker<{ id: string }>('Friends', async job => {
    if (job.name !== "friends") return;
    const data = await bot.scrapeFriends(job.data.id);
    if (data.length > 0) {
      console.log(`[friends] ${data.length} friends found for ${job.data.id}`);
      pQueue.addBulk(data.map(id => ({ name: "profile", data: { id } })));
      rQueue.addBulk(data.map(id => ({ name: "relationship", data: { id1: job.data.id, id2: id } })));
    }
  }, QUEUE_CONFIG);

  new Worker<{ id1: string, id2: string }>('Relationship', async job => {
    if (job.name !== "relationship") return;
    const existingRelationship = await Relationship.find().or([{ id1: job.data.id1, id2: job.data.id2 }, { id1: job.data.id2, id2: job.data.id1 }]).exec();
    if (existingRelationship.length > 0) {
      return console.log(`[relationship] ${job.data.id1} and ${job.data.id2} already exists`);
    }

    await Relationship.create({ id1: job.data.id1, id2: job.data.id2 });
    console.log(`[relationship] ${job.data.id1} and ${job.data.id2} created`);
  }, Object.assign({}, QUEUE_CONFIG, { concurrency: 50 }));

  createBullBoard({
    queues: [new BullMQAdapter(pQueue), new BullMQAdapter(fQueue), new BullMQAdapter(rQueue)],
    serverAdapter,
  });

  app.use('/', serverAdapter.getRouter());

  app.listen(3000, () => {
    pQueue.add('profile', { id: BASE_ID });
    console.log('Running on 3000...');
    console.log('For the UI, open http://localhost:3000');
  });
}


async function demo() {
  try {
    const friends = await bot.scrapeFriends(BASE_ID);
    console.log(friends);
  } catch (error) {
    console.log(error);
  }
  return;
}

// demo();
start();

