const { Client, Intents, MessageActionRow, MessageEmbed, MessageButton } = require("discord.js");
const { REST } = require('@discordjs/rest');
const { Routes, ApplicationCommandOptionType } = require('discord-api-types/v9');
const VintedMoniteur = require("vinted-moniteur");
const { token, moniteur } = require("./config.js");
const Discord = require('discord.js');
const { v4: uuidv4 } = require('uuid');

const fs = require('fs');

const client = new Client({
  intents: Object.values(Intents.FLAGS),
  restTimeOffset: 0,
  partials: ["USER", "CHANNEL", "GUILD_MEMBER", "MESSAGE", "REACTION"]
});

const commands = [
  {
    name: 'abonner',
    description: 'Abonnez-vous à une URL de recherche',
    options: [
      {
        name: 'url',
        description: 'L\'URL de la recherche Vinted',
        type: ApplicationCommandOptionType.String,
        required: true
      },
      {
        name: 'channel',
        description: 'Le salon dans lequel vous souhaitez envoyer les notifications',
        type: ApplicationCommandOptionType.Channel,
        required: true
      }
    ]
  },
  {
    name: 'désabonner',
    description: 'Désabonnez-vous d\'une URL de recherche',
    options: [
      {
        name: 'id',
        description: 'L\'identifiant de l\'abonnement (/abonnements)',
        type: ApplicationCommandOptionType.String,
        required: true
      }
    ]
  },
  {
    name: 'abonnements',
    description: 'Accèdez à la liste de tous vos abonnements',
    options: []
  }
];

const rest = new REST({ version: '9' }).setToken(token);

client.on("ready", async () => {
    
  try {
    const { id: userId, username } = await rest.get(Routes.user());
    console.log(`👋 Connected as ${username}!`);

    const [ { id: guildId, name: guildName } ] = await rest.get(Routes.userGuilds());
    console.log(`💻 Connected to ${guildName}!`);

    await rest.put(Routes.applicationGuildCommands(userId, guildId), { body: commands });
    console.log(`💻 Commands have been registered on ${guildName}!`);

    for (const urlObj of moniteur.urls) {
      const salon = client.channels.cache.get(urlObj?.salon);
      if (salon) {
        const moni = new VintedMoniteur({
          url: urlObj?.url,
          interval: moniteur?.interval,
          debug: moniteur?.debug,
          //proxy: ["ip", "ip:port", "username:password"]
        });
        moni.on("error", (err) => console.log(err));
        moni.on("item", (item) => {
          console.log("Item Send to", salon.id);
          try {
            
            const row = new MessageActionRow()
              .addComponents(new MessageButton().setEmoji('➕').setLabel("Plus d'info").setURL(item.url.info).setStyle("LINK"))
              .addComponents(new MessageButton().setEmoji('💬').setLabel("Envoyer un message").setURL(item.url.sendmsg).setStyle("LINK"))
              .addComponents(new MessageButton().setEmoji('💸').setLabel("Acheter").setURL(item.url.buy).setStyle("LINK"));
            const embed = new MessageEmbed()
              .setAuthor({ name: item.vendeur.name, iconURL: item.vendeur.pp, url: item.vendeur.url})
              .setTitle(item.title)
              .setURL(item.url.info)
              .setImage(item.pp)
              .setTimestamp(item.thumbnails)
              .setFooter({ text: 'Nistro', iconURL: 'https://cdn.discordapp.com/attachments/1114712958891737118/1115690013506682912/Blue_and_White_Modern_Cleaning_Service_Logo.png' })
              .setColor(item.color)
              .setTimestamp()

              .addFields(
                { name: '`💸` Prix', value: `\`${item.prix}\``, inline: true },
                { name: '`🏷️` Marque', value: `\`${item.marque}\``, inline: true },
                { name: '`📏` Taille', value: `\`${item.taille}\``, inline: true },
                //{ name: 'Stats', value: `Favori: ${item.stats.favori}\nVue: \`${item.stats.vue}\``, inline: true },
                { name: '`📆` Date du post', value: `<t:${item.timestamp}:R>`, inline: true }
              );
            salon.send({
              embeds: [embed],
              components: [row]
            });
          } catch (error) {
            console.log(error);
          }
        });
      }
    }
  } catch (error) {
    console.error(error);
  }
});

client.on('interactionCreate', async interaction => {
    const config = require('./config.js');
    const { moniteur } = require('./config.js');
    if (!interaction.isCommand()) return;
      
    const { commandName, options } = interaction;
      
    if (commandName === 'abonner') {
        const url = options.getString('url');
        const channel = options.getChannel('channel');
        const uniqueId = uuidv4().slice(0, 5);
        config.moniteur.urls.push({ id: uniqueId, url: url, salon: channel.id });
        const newConfig = `module.exports = ${JSON.stringify(config, null, 2)};`;
        fs.writeFile('./config.js', newConfig, (err) => {
          if (err) {
            console.error(err);
            interaction.reply('Une erreur s\'est produite lors de l\'ajout de l\'abonnement.');
          } else {
            console.log('URL ajoutée avec succès.');
            interaction.reply(`L'URL a été ajoutée avec succès. Identifiant unique: ${uniqueId}`);
          }
        });
    }else if (commandName === 'désabonner') {

        const id = options.getString('id');
        const index = moniteur.urls.findIndex((u) => u.id === id);
        if (index !== -1) {
          moniteur.urls.splice(index, 1);
          fs.writeFileSync('./config.js', `module.exports = ${JSON.stringify({ token: config.token, moniteur }, null, 2)};`);
          interaction.reply(`Vous avez été désabonné de l'URL de recherche avec l'identifiant unique ${id}.`);
        } else {
          interaction.reply(`L'identifiant unique spécifié n'a pas été trouvé.`);
        }
    }else if (commandName === 'abonnements') {
        const { moniteur } = require('./config.js');

        const abonnements = moniteur.urls.map(({ id, url, salon }) => `**ID:** ${id}\n  **URL:** ${url}\n  **Salon:** ${interaction.guild.channels.cache.get(salon).toString()}`).join('\n\n');
        const embed = new Discord.MessageEmbed()
          .setTitle('Liste des abonnements')
          .setDescription(abonnements)
          .setFooter({ text: 'Nistro', iconURL: 'https://cdn.discordapp.com/attachments/1114712958891737118/1115690013506682912/Blue_and_White_Modern_Cleaning_Service_Logo.png' })
          .setColor('#00000')
          .setTimestamp();
        interaction.reply({ embeds: [embed] });
      }
});

client.login(token);
