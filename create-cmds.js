
const { REST } = require('@discordjs/rest');
const { Routes, ApplicationCommandOptionType } = require('discord-api-types/v9');

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

const rest = new REST({ version: '9' }).setToken(require('./config.js').token);

(async () => {
    try {

        const { id: userId, username } = await rest.get(
            Routes.user()
        );

        console.log(`👋 Connexion à ${username}!`);

        const [ { id: guildId, name: guildName } ] = await rest.get(
            Routes.userGuilds()
        );

        console.log(`💻 Connécté à ${guildName}!`);

        await rest.put(
            Routes.applicationGuildCommands(userId, guildId),
            { body: commands }
        ).then(console.log);

        console.log(`💻 Commandes enregistré pour ${guildName}!`);
    } catch (error) {
        console.error(error);
    }
})();