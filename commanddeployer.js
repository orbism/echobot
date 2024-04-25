const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, guildId, token } = require('./config.json');

const commands = [
    {
        name: 'echocode',
        description: 'Request an invite code'
    },
    {
        name: 'resetcode',
        description: 'Reset a user\'s ability to request an invite code',
        options: [
            {
                type: 6, // USER type
                name: 'user',
                description: 'The user to reset',
                required: true
            }
        ]
    },
    {
        name: 'echolist',
        description: 'List requestees and their codes'
    }
];

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();