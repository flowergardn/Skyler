import 'reflect-metadata';

import { importx } from '@discordx/importer';
import { Client } from 'discordx';
import { Database } from "bun:sqlite";
import { env } from '~/env/server';
import {IntentsBitField} from "discord.js";
import path from "node:path";
import * as fs from "node:fs";

export const client = new Client({
	intents: [
		IntentsBitField.Flags.GuildMembers,
		IntentsBitField.Flags.GuildMessages,
		IntentsBitField.Flags.MessageContent,
		IntentsBitField.Flags.Guilds
	],
	silent: false
});

export let db: Database;

try {
	const dataDir = path.join(process.cwd(), "data");
	if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

	db = new Database(path.join(dataDir, "data.sqlite"), { create: true });
	console.log("Created database connection.");
} catch (err) {
	console.error("Failed to connect to database.");
	console.error(err);
}

client.on('ready', async () => {
	await client.clearApplicationCommands();
	await client.initApplicationCommands();

	console.log('> Bot online, logged in as: ' + client.user!!.tag);
});

client.on('interactionCreate', (interaction) => {
	client.executeInteraction(interaction);
});

(async () => {
	await importx(__dirname + '/commands/*.{js,ts}');
	await client.login(env.TOKEN);

	if (!db) {
		console.log("Database connection failed, exiting.");
		process.exit(1);
	}

	db.run(`
		CREATE TABLE IF NOT EXISTS "tickets" (
			"id" TEXT PRIMARY KEY,
			"createdBy" TEXT NOT NULL,
			"type" TEXT NOT NULL,
			"fields" TEXT NOT NULL
		);
	`
	)
})()
