const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const { spawn } = require('child_process');

const config = require('./config.json');
const path = './issuedCodes.json';
try {
    fs.accessSync(path, fs.constants.F_OK);
} catch (e) {
    fs.writeFileSync(path, JSON.stringify({}));
}
const issuedCodes = require(path);

const logStream = fs.createWriteStream('bot.log', { flags: 'a' });
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const usedCodes = new Set();
const sauce = 'codes_test.txt';
const roleID = '1028402099282776175';
const adminID = '902955345524187176';
const logChanID = '999022224512127056';
// const chanID = '1232782665212498051';
let inviteCodes = [];

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;
    logStream.write(logMessage);
    console.log(logMessage);
}

function logError(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ERROR: ${message}\n`;
    logStream.write(logMessage);
    console.error(logMessage);
}

fs.readFile(sauce, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading the codes file:', err);
        return;
    }
    inviteCodes = data.split('\n').filter(line => line.trim() !== '');
});

client.once('ready', () => {
    log('Echo Bot loaded');
    log(`Using source file: ${sauce}`);
    // const channel = client.channels.cache.get(chanID); 
    // if (channel) channel.send("ok I'm good to go");
    // else console.log("Could not find the channel to send the startup message.");
    try {
        fs.accessSync('./issuedCodes.json', fs.constants.F_OK);
    } catch (e) {
        fs.writeFileSync('./issuedCodes.json', JSON.stringify({}));
    }

    const deployCommands = spawn('node', ['commanddeployer.js'], { stdio: 'inherit' });
    deployCommands.on('close', (code) => {
        log(`commanddeployer.js exited with code ${code}`);
    });
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const logChannel = client.channels.cache.get(logChanID); 
    const embedLog = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Action Log')
        .setTimestamp();

    if (interaction.commandName === 'echocode') {
        log(`Command used by ${interaction.user.username}: ${interaction.commandName}`);

        const requiredRole = roleID; 
        if (!interaction.member.roles.cache.has(requiredRole)) {
            await interaction.reply({ content: 'You do not have the required role to request an invite.', ephemeral: true });
            log(`Role check failed for ${interaction.user.username}`);
            embedLog.setDescription(`Role check failed for ${interaction.user.username}`);
            logChannel.send({ embeds: [embedLog] });
            return;
        }

        const userId = interaction.user.id;
        const username = interaction.user.username; 
        if (issuedCodes[userId]) {
            await interaction.reply({ content: `You have already received an Echo Code from FeistyDAO. Your invite code was: ${issuedCodes[userId].code}`, ephemeral: true });
            log(`Already issued to ${interaction.user.username}: ${issuedCodes[userId]}`);
            embedLog.setDescription(`Already issued to ${interaction.user.username}: ${issuedCodes[userId]}`);
            logChannel.send({ embeds: [embedLog] });
            return;
        }

        if (inviteCodes.length > 0) {
            const code = inviteCodes.shift();
            issuedCodes[userId] = { username: username, code: code };
            fs.writeFileSync('./issuedCodes.json', JSON.stringify(issuedCodes, null, 4)); // write human readable username

            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('Here is your Echo invite, courtesy of FeistyDAO:')
                .setDescription(code);

            await interaction.reply({ embeds: [embed], ephemeral: true });
            embedLog.setDescription(`Code provided to ${interaction.user.username}: ${code}`);
            logChannel.send({ embeds: [embedLog] });
            log(`Code provided to ${interaction.user.username}: ${code}`);

            fs.writeFile(sauce, inviteCodes.join('\n'), err => {
                if (err) console.error('Error updating the codes file:', err);
            });
        } else {
            await interaction.reply({ content: 'No more invite codes available.', ephemeral: true });
            log('No more codes available');
            embedLog.setDescription('No more codes available');
            logChannel.send({ embeds: [embedLog] });
        }
    } else if (interaction.commandName === 'resetcode') {
        const userIdToReset = interaction.options.getUser('user').id;

        if (delete issuedCodes[userIdToReset]) {
            fs.writeFileSync('./issuedCodes.json', JSON.stringify(issuedCodes, null, 4)); // write human readable username again
            await interaction.reply({ content: `Reset complete. User can now request a code again.`, ephemeral: true });
            log(`Reset performed for user ID: ${userIdToReset}`);
            embedLog.setDescription(`Reset performed for user ID: ${userIdToReset}`);
            logChannel.send({ embeds: [embedLog] });
        } else {
            await interaction.reply({ content: `This user hasn't requested a code or was already reset.`, ephemeral: true });
            log(`No reset needed for user ID: ${userIdToReset}`);
            embedLog.setDescription(`No reset needed for user ID: ${userIdToReset}`);
            logChannel.send({ embeds: [embedLog] });
        }
    } else if (interaction.commandName === 'echolist') {
        if (!interaction.member.roles.cache.has(adminID)) {
            await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            return;
        }
    
        const issuedCodesList = Object.entries(issuedCodes).map(([userId, { username, code }]) => `${username} : ${code}`).join('\n');
        if (issuedCodesList.length > 0) {
            await interaction.reply({ content: `List of issued codes:\n${issuedCodesList}`, ephemeral: true });
        } else {
            await interaction.reply({ content: 'No codes have been issued yet.', ephemeral: true });
        }
    }
});

client.login(config.token);
