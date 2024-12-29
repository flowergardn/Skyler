import 'reflect-metadata';

import { importx } from '@discordx/importer';
import { Client } from 'discordx';
import { Database } from "bun:sqlite";
import { env } from './env/server';
import {IntentsBitField} from "discord.js";

export const client = new Client({
	intents: [
		IntentsBitField.Flags.GuildMembers,
		IntentsBitField.Flags.GuildMessages,
		IntentsBitField.Flags.MessageContent,
		IntentsBitField.Flags.Guilds
	],
	silent: false
});

export const db = new Database("./data.sqlite", { create: true });

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
