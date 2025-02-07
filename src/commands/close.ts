import {
	ActionRowBuilder,
	ApplicationCommandOptionType,
	ButtonBuilder,
	ButtonStyle,
	CommandInteraction,
	EmbedBuilder,
	GuildTextBasedChannel,
	userMention
} from 'discord.js';
import { Discord, Slash, SlashOption } from 'discordx';
import { client, db } from '~/index';
import Colors from '~/constants/Colors';
import dayjs from 'dayjs';
import axios from 'axios';
import { env } from '~/env/server';

type Ticket = {
	id: string;
	createdBy: string;
	type: string;
	fields: string;
};

type Field = {
	name: string;
	value: string;
};

@Discord()
class Close {
	async createTranscript(channel: GuildTextBasedChannel, fields: Field[]) {
		let msgs = await channel.messages.fetch();
		msgs = msgs.reverse();

		let formatted = msgs.map((msg) => {
			const time = dayjs(msg.createdAt).format('MM/DD/YYYY HH:mm:ss');
			return `[${time}] ` + msg.author.username + ': ' + msg.cleanContent;
		});

		const messages = formatted.join('\n')
		const fmtFields = fields.map((field) => `${field.name}:\n${field.value}`).join('\n')
		const fullMessage = `${fmtFields}\n\n${messages}}`

		const hasteResponse: {
			data: {
				key: string;
			};
		} = await axios.post(`https://hst.sh/documents`, fullMessage);

		return `https://hst.sh/${hasteResponse.data.key}`;
	}

	@Slash({ description: 'Close a ticket' })
	async close(
		@SlashOption({
			description: 'Reason for closing this ticket',
			name: 'reason',
			required: false,
			type: ApplicationCommandOptionType.String
		})
		reason: string,
		interaction: CommandInteraction
	) {
		await interaction.deferReply();

		const query = db.prepare(`SELECT * FROM tickets WHERE id = ?1;`);
		const ticket = query.get(interaction.channel.id) as Ticket | null;

		if (!ticket) {
			await interaction.editReply({
				content: 'This ticket does not exist!'
			});
			return;
		}

		const fields = JSON.parse(ticket.fields) as {
			name: string;
			value: string;
		}[]

		const creator = await client.users.fetch(ticket.createdBy);
		const closedEmbed = new EmbedBuilder()
			.setColor(Colors.purple)
			.setTitle('Ticket closed')
			.setFields({
				name: 'Reason',
				value: reason ?? 'No reason specified'
			});

		const transcript = await this.createTranscript(interaction.channel, fields);
		const button = new ButtonBuilder()
			.setStyle(ButtonStyle.Link)
			.setURL(transcript)
			.setLabel('View Transcript');
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

		try {
			await creator.send({
				embeds: [closedEmbed],
				components: [row]
			});
		} catch (err) {
			console.log(`Failed to send ticket log to ${creator.id}.`);
		}

		const logChannel = (await interaction.guild.channels.fetch(
			env.LOGS_CHANNEL
		)) as GuildTextBasedChannel;
		closedEmbed.setDescription(`Closed by ${userMention(interaction.user.id)}`).setFooter({
			text: `Ticket ID: ${interaction.channel.id}`
		});
		await logChannel.send({
			embeds: [closedEmbed],
			components: [row]
		});

		await interaction.editReply({
			content: 'Closed ticket!'
		});

		interaction.channel.delete(`Ticket closed by ${interaction.user.username}`);
	}
}
