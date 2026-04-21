import Ticket from '../models/Ticket.js';
import mongoose from 'mongoose';

export const getNextTicketId = async (guildId) => {
    try {
        const lastTicket = await Ticket.findOne({ guildId }).sort({ ticketId: -1 });
        return (lastTicket?.ticketId || 0) + 1;
    } catch (error) {
        console.error('❌ DB Error in getNextTicketId:', error.message);
        return 1; // Fallback
    }
};


export const createTicket = async (data) => {
    console.log('🔄 Creating ticket with data:', data);
    try {
        const ticket = new Ticket(data);
        await ticket.save();
        console.log('✅ Ticket created ID:', ticket.ticketId);
        return ticket;
    } catch (error) {
        console.error('❌ Create ticket failed:', error.message);
        return null;
    }
};



export const getUserOpenTicket = async (userId, guildId) => {
    console.log('🔄 Checking open ticket for user', userId, 'in guild', guildId);
    try {
        const ticket = await Ticket.findOne({ userId, guildId, status: 'open' });
        console.log('Query result:', ticket);
        console.log('Open ticket found?', !!ticket);
        return ticket;
    } catch (error) {
        console.error('❌ DB Error in getUserOpenTicket:', error.message);
        return null;
    }
};



export const getTicketByChannelId = async (channelId) => {
    return await Ticket.findOne({ channelId });
};

export const updateTicketStatus = async (channelId, status, updaterId, logData = {}) => {
    return await Ticket.findOneAndUpdate(
        { channelId },
        { 
            status, 
            ...(status === 'closed' && { closedBy: updaterId, closedAt: new Date() }),
            logData 
        },
        { new: true }
    );
};

export const claimTicket = async (channelId, claimerId) => {
    return await Ticket.findOneAndUpdate(
        { channelId, claimedBy: null },
        { claimedBy: claimerId, claimedAt: new Date() },
        { new: true }
    );
};

