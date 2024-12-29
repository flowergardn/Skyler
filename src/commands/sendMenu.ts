import {
	APIEmbed,
	APIEmbedField,
	APITextInputComponent,
	ActionRowBuilder,
	CommandInteraction,
	EmbedBuilder,
	ModalBuilder,
	ModalSubmitInteraction,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder,
	TextInputBuilder,
	TextInputStyle,
	userMention, GuildTextBasedChannel
} from 'discord.js';
import { Discord, ModalComponent, SelectMenuComponent, Slash } from 'discordx';
import NodeCache from 'node-cache';
import Colors from '~/constants/Colors';
import { prettify } from '~/util/Text';
import { db } from '~/index';

require('toml-require').install();
const embeds: {
	menu: APIEmbed;
} = require('~/constants/embeds.toml');
const tickets = require('~/constants/tickets.toml');;

interface TicketType {
	title: string;
	category: string;
	description?: string;
	message?: string;
	forms: APITextInputComponent[];
}

const cache = new NodeCache({ stdTTL: 30 });

@Discord()
class SendMenu {
	@Slash({ description: 'Send the ticket menu', defaultMemberPermissions: 'ManageGuild', name: "send-menu" })
	async sendMenu(interaction: CommandInteraction) {
		const options: StringSelectMenuOptionBuilder[] = [];

		Object.keys(tickets).forEach((k: string) => {
			const ticketType: TicketType = tickets[k];
			const option = new StringSelectMenuOptionBuilder().setLabel(ticketType.title).setValue(k);
			if (ticketType.description != null) option.setDescription(ticketType.description);
			options.push(option);
		});

		const select = new StringSelectMenuBuilder().setCustomId('ticket-menu').addOptions(options);

		const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

		const channel = await interaction.guild.channels.fetch(interaction.channelId) as GuildTextBasedChannel;

		await channel.send({
			embeds: [embeds.menu],
			components: [row]
		});

		await interaction.reply({
			content: 'Sent embed',
			ephemeral: true
		});
	}

	@SelectMenuComponent({ id: 'ticket-menu' })
	async handle(interaction: StringSelectMenuInteraction): Promise<unknown> {
		const ticketValue = interaction.values.shift();

		const ticketInformation: TicketType = tickets[ticketValue];

		const modal = new ModalBuilder().setTitle(ticketInformation.title).setCustomId('ticket-menu');

		const forms: ActionRowBuilder<TextInputBuilder>[] = [];

		ticketInformation.forms.forEach((v) => {
			const form = TextInputBuilder.from(v).setStyle(TextInputStyle.Short);
			forms.push(new ActionRowBuilder<TextInputBuilder>().addComponents(form));
		});

		modal.addComponents(forms);

		await interaction.showModal(modal);

		cache.set(interaction.user.id, ticketValue);

		return;
	}

	@ModalComponent({ id: 'ticket-menu' })
	async handleForm(interaction: ModalSubmitInteraction): Promise<void> {
		let fields: APIEmbedField[] = [];
		interaction.fields.fields.forEach((field) => {
			fields.push({
				name: prettify(field.customId),
				value: field.value
			});
		});

		const rawFields = interaction.fields.fields.map((field) => {
			return {
				name: prettify(field.customId),
				value: field.value
			};
		});

		await interaction.deferUpdate();

		const ticketType: string = cache.get(interaction.user.id);
		const ticketInformation: TicketType = tickets[ticketType];

		const id = Math.random().toString(36).slice(2, 7);
		let ticketChannel = await interaction.guild.channels.create({
			name: `${ticketType}-${id}`,
			parent: ticketInformation.category
		});

		await ticketChannel.lockPermissions();

		await ticketChannel.permissionOverwrites.create(interaction.user.id, {
			ViewChannel: true,
			ReadMessageHistory: true,
			AttachFiles: true,
			SendMessages: true
		});

		const type = prettify(ticketType);
		const embed = new EmbedBuilder()
			.setColor(Colors.purple)
			.setTitle(`${type} Ticket`)
			.setFields(fields);

		const mention = userMention(interaction.user.id);
		let messageContent = ticketInformation.message
			? `${ticketInformation.message}\n${mention}`
			: mention;

		await ticketChannel.send({
			content: messageContent,
			embeds: [embed]
		});

		db.prepare(`INSERT INTO tickets (id, createdBy, type, fields) VALUES (?, ?, ?, ?)`, [
			ticketChannel.id,
			interaction.user.id,
			ticketType,
			JSON.stringify(rawFields),
		]).run()
	}
}
