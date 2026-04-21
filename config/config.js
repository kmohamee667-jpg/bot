import dotenv from 'dotenv'; 
dotenv.config();

const config = {
    token: process.env.BOT_TOKEN,
    welcomeChannel: '1494164521038905397',
    // Ticket System Config
    ticketChannelId: '1494164521885892735',
    openCategoryId: '1494164521885892734',
    closedCategoryId: '1494164522259452085',
    logsChannelId: '1495997835387076729',
    allowedTicketRoles: [
        '1494164520015499399', // study here bot
        '1494164520015499398', // ℘
        '1494164520015499396', // dev eloper
        // Dynamic: OWNER, trial mod, staff support, access tickets
    ]
};

export default config;  