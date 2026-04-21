import { registerRoleLogs } from './SystemLogs/role.log.js';
import { Client, GatewayIntentBits, PermissionFlagsBits } from 'discord.js';  
import config from './config/config.js';  
import guildMemberAdd from './events/guildMemberAdd.js';  
import voiceStateUpdate from './events/voiceStateUpdate.js';
import interactionCreate from './events/interactionCreate.js';
import 'dotenv/config';
import connectDB from './db/connectdb.js';
import AdminCommand from './models/AdminCommand.js';
import GuildSettings from './models/GuildSettings.js';
import User from './models/User.js';
import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Ticket System
import { initTicketSystem } from './ticket/initTicketSystem.js';

// Command Imports
import mas7Command from './text-commands/admins/mas7.js';
import nicknameCommand from './text-commands/admins/nickname.js';
import banUnbanCommand from './text-commands/admins/ban&unban.js';
import { registerMessageLogs } from './SystemLogs/messages.log.js';
import { registerNicknameLogs } from './SystemLogs/nickname.log.js';
import { registerPictureLogs } from './SystemLogs/picture.log.js';

// Route Imports
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5174', 'https://bot.railway.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.static(path.join(__dirname, 'public')));

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

(async () => {
    await connectDB();
    
    // --- INITIAL COMMAND SETUP ---
    const setupCommand = async (name, users, roles) => {
        const exists = await AdminCommand.findOne({ command: name });
        if (!exists) {
            await AdminCommand.create({ command: name, users, roles });
            console.log(`Added initial perms for ${name}`);
        }
    };

    await setupCommand('mas7', [{ name: 'khaled', id: '1447951012332699871' }], ['معلم', 'معلمه']);
    await setupCommand('nickname', [{ name: 'khaled', id: '1447951012332699871' }], ['معلم', 'معلمه']);
    await setupCommand('adi', [{ name: 'khaled', id: '1447951012332699871' }], ['معلم', 'معلمه']);
    await setupCommand('ban', [{ name: 'khaled', id: '1447951012332699871' }], ['معلم', 'معلمه']);
    await setupCommand('unban', [{ name: 'khaled', id: '1447951012332699871' }], ['معلم', 'معلمه']);
    await setupCommand('warn', [{ name: 'khaled', id: '1447951012332699871' }], ['معلم', 'معلمه']);
    await setupCommand('unwarn', [{ name: 'khaled', id: '1447951012332699871' }], ['معلم', 'معلمه']);
    await setupCommand('kick', [{ name: 'khaled', id: '1447951012332699871' }], ['اونر']);
    await setupCommand('time', [{ name: 'khaled', id: '1447951012332699871' }], ['اونر']);
    await setupCommand('untime', [{ name: 'khaled', id: '1447951012332699871' }], ['اونر']);

    // --- FORCE ADMIN SEEDING ---
    const adminPhone = '01202236396';
    const adminPass = '4542065k';
    const adminUser = await User.findOne({ phone: adminPhone });
    
    if (!adminUser) {
        const hashedPassword = await bcrypt.hash(adminPass, 10);
        await User.create({ 
            phone: adminPhone, 
            password: hashedPassword, 
            role: 'admin', 
            name: 'الأدمن الرئيسي',
            allowedGuilds: [],
            permissions: { canManageUsers: true, canToggleBot: true, canManageCommands: true }
        });
        console.log('✅ Admin user created');
    } else {
        let changed = false;
        if (adminUser.role !== 'admin') { adminUser.role = 'admin'; changed = true; }
        if (!adminUser.permissions?.canManageUsers) { 
            adminUser.permissions = { canManageUsers: true, canToggleBot: true, canManageCommands: true };
            changed = true;
        }
        if (changed) await adminUser.save();
    }

    registerMessageLogs(client, '1494164522498261125');
    registerPictureLogs(client, '1494164522498261126');
    registerNicknameLogs(client, '1494164522498261128');
    registerRoleLogs(client, '1494164522666164387');

    // --- SEED TICKET ROLES ---
    const allGuilds = await GuildSettings.find();
    for (const guild of allGuilds) {
        if (!guild.allowedTicketRoles || guild.allowedTicketRoles.length === 0) {
            guild.allowedTicketRoles = config.allowedTicketRoles;
            await guild.save();
            console.log(`✅ Seeded ticket roles for guild: ${guild.guildId}`);
        }
    }
})();

client.on('guildMemberAdd', guildMemberAdd);
client.on('voiceStateUpdate', voiceStateUpdate);
client.on('interactionCreate', interactionCreate);
client.on('channelDelete', (await import('./events/channelDelete.js')).default);

client.once('ready', async () => {
    console.log(`✅ Bot ready as ${client.user.tag}`);
    await initTicketSystem(client, config);
});


// Command Mappings (Arabic -> Technical)
const COMMAND_MAP = {
    'مسح': 'mas7',
    'سمي': 'nickname',
    'ادي': 'adi',
    'ban': 'ban',
    'unban': 'unban',
    'mas7': 'mas7',
    'nickname': 'nickname',
    'adi': 'adi',
    'warn': 'warn',
    'unwarn': 'unwarn',
    'ورن': 'warn',
    'انورن': 'unwarn',
    'kick': 'kick',
    'كيك': 'kick',
    'time': 'time',
    'تايم': 'time',
    'untime': 'untime',
    'انتايم': 'untime'
};

// --- MESSAGE HANDLER ---
client.on('messageCreate', async (message) => {
    if (!message.guild || message.author.bot) return;

    const args = message.content.trim().split(/ +/);
    const rawCommand = args[0].toLowerCase();
    const technicalName = COMMAND_MAP[rawCommand];

    if (!technicalName) return; 

    const settings = await GuildSettings.findOne({ guildId: message.guild.id });
    if (settings && settings.active === false) return;

    if (settings && settings.commandsStatus) {
        if (settings.commandsStatus.get(technicalName) === false) return;
    }

    if (technicalName === 'mas7') {
        await mas7Command(message, args.slice(1));
    } else if (technicalName === 'nickname') {
        await nicknameCommand(message, args.slice(1));
    } else if (technicalName === 'adi') {
        const adiCommand = (await import('./text-commands/admins/adi.js')).default;
        await adiCommand(message, args.slice(1));
    } else if (technicalName === 'ban' || technicalName === 'unban') {
        await banUnbanCommand(message, args);
    } else if (technicalName === 'warn') {
        const warnCommand = (await import('./text-commands/admins/warn.js')).default;
        await warnCommand(message, args.slice(1));
    } else if (technicalName === 'unwarn') {
        const unwarnCommand = (await import('./text-commands/admins/unwarn.js')).default;
        await unwarnCommand(message, args.slice(1));
    } else if (technicalName === 'kick') {
        const kickCommand = (await import('./text-commands/admins/kick.js')).default;
        await kickCommand(message, args.slice(1));
    } else if (technicalName === 'time' || technicalName === 'untime') {
        const timeoutCommand = (await import('./text-commands/admins/timeout.js')).default;
        await timeoutCommand(message, args.slice(1));
    }
});

client.login(config.token);

// --- MIDDLEWARES ---
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) return res.status(401).json({ error: 'User not found' });
        next();
    } catch (err) { res.status(401).json({ error: 'Session expired' }); }
};

const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin' && !req.user.permissions?.canManageUsers) {
        return res.status(403).json({ error: 'Permission Denied: canManageUsers' });
    }
    next();
};

const canToggle = (req, res, next) => {
    if (req.user.role !== 'admin' && !req.user.permissions?.canToggleBot) {
        return res.status(403).json({ error: 'Permission Denied: canToggleBot' });
    }
    next();
};

const canManageCmds = (req, res, next) => {
    if (req.user.role !== 'admin' && !req.user.permissions?.canManageCommands) {
        return res.status(403).json({ error: 'Permission Denied: canManageCommands' });
    }
    next();
};

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, adminOnly, userRoutes);

// --- API ---

app.get('/api/commands', authenticate, async (req, res) => {
    try {
        const commands = await AdminCommand.find();
        res.json(commands);
    } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/commands/:name', authenticate, canManageCmds, async (req, res) => {
    const { name } = req.params;
    const { users, roles } = req.body;
    try {
        const command = await AdminCommand.findOneAndUpdate(
            { command: name }, 
            { users, roles }, 
            { returnDocument: 'after', upsert: true }
        );
        res.json(command);
    } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/guilds', authenticate, async (req, res) => {
    try {
        let guilds = client.guilds.cache.map(g => ({ id: g.id, name: g.name, icon: g.iconURL() }));
        if (req.user.role === 'user') guilds = guilds.filter(g => req.user.allowedGuilds.includes(g.id));
        const settings = await GuildSettings.find();
        const response = guilds.map(g => {
            const s = settings.find(set => set.guildId === g.id);
            return { ...g, active: s ? s.active : true, commandsStatus: s ? Object.fromEntries(s.commandsStatus) : {} };
        });
        res.json(response);
    } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/guilds/:guildId/toggle', authenticate, canToggle, async (req, res) => {
    const { guildId } = req.params;
    const { active } = req.body;
    try {
        const guild = client.guilds.cache.get(guildId);
        const settings = await GuildSettings.findOneAndUpdate(
            { guildId }, 
            { active, guildName: guild ? guild.name : 'Unknown' }, 
            { returnDocument: 'after', upsert: true }
        );
        res.json(settings);
    } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/guilds/:guildId/commands/:commandName/toggle', authenticate, canManageCmds, async (req, res) => {
    const { guildId, commandName } = req.params;
    const { status } = req.body;
    try {
        const guild = client.guilds.cache.get(guildId);
        const settings = await GuildSettings.findOneAndUpdate(
            { guildId },
            { $set: { [`commandsStatus.${commandName}`]: status }, guildName: guild ? guild.name : 'Unknown' },
            { returnDocument: 'after', upsert: true }
        );
        res.json(settings);
    } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`📡 Dashboard API running at http://localhost:${PORT}`));

client.on('error', console.error);
process.on('unhandledRejection', (error) => console.error('Unhandled promise rejection:', error));