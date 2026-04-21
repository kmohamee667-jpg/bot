import Ticket from '../models/Ticket.js';
import mongoose from 'mongoose';

export const getNextTicketId = async (guildId) => {
    const lastTicket = await Ticket.findOne({ guildId }).sort({ ticketId: -1 });
    return (lastTicket?.ticketId || 0) + 1;
};

export const createTicket = async (data) => {
    const ticket = new Ticket(data);
    await ticket.save();
    return ticket;
};

export const getUserOpenTicket = async (userId, guildId) => {
    return await Ticket.findOne({ userId, guildId, status: 'open' });
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

