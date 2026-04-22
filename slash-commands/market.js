import { EmbedBuilder, MessageFlags } from 'discord.js';
import MarketRole from '../models/MarketRole.js';
import MarketManager from '../utils/MarketManager.js';

const isMarketAdmin = (interaction) => {
    const isOwner = interaction.user.id === interaction.guild.ownerId;
    const hasOwnerRole = interaction.member.roles.cache.some(r => r.name === 'OWNER');
    const hasSpecificRole = interaction.member.roles.cache.has('1496360807490125955');
    return isOwner || hasOwnerRole || hasSpecificRole;
};

export const handleAddRoleSlash = async (interaction) => {
    if (!isMarketAdmin(interaction)) {
        return interaction.reply({ content: '❌ لا تملك صلاحية تعديل رولات الماركت.', flags: [MessageFlags.Ephemeral] });
    }

    const role = interaction.options.getRole('role');
    const price = interaction.options.getInteger('price');

    try {
        await MarketRole.findOneAndUpdate(
            { roleId: role.id, guildId: interaction.guild.id },
            { price: price },
            { upsert: true }
        );
        
        await MarketManager.updateMarket(interaction.client, interaction.guild.id);
        
        return interaction.reply({ 
            content: `✅ تم إضافة الرتبة <@&${role.id}> للسوق بسعر ${price} كوين بنجاح.`, 
            flags: [MessageFlags.Ephemeral] 
        });
    } catch (err) {
        console.error(err);
        return interaction.reply({ content: '❌ حدث خطأ أثناء الإضافة.', flags: [MessageFlags.Ephemeral] });
    }
};

export const handleEditRolePriceSlash = async (interaction) => {
    if (!isMarketAdmin(interaction)) {
        return interaction.reply({ content: '❌ لا تملك صلاحية تعديل رولات الماركت.', flags: [MessageFlags.Ephemeral] });
    }

    const role = interaction.options.getRole('role');
    const price = interaction.options.getInteger('price');

    try {
        const existing = await MarketRole.findOne({ roleId: role.id, guildId: interaction.guild.id });
        if (!existing) {
            return interaction.reply({ content: '❌ هذه الرتبة ليست موجودة في السوق أصلاً.', flags: [MessageFlags.Ephemeral] });
        }

        existing.price = price;
        await existing.save();
        
        await MarketManager.updateMarket(interaction.client, interaction.guild.id);
        
        return interaction.reply({ 
            content: `✅ تم تعديل سعر الرتبة <@&${role.id}> إلى ${price} كوين بنجاح.`, 
            flags: [MessageFlags.Ephemeral] 
        });
    } catch (err) {
        console.error(err);
        return interaction.reply({ content: '❌ حدث خطأ أثناء التعديل.', flags: [MessageFlags.Ephemeral] });
    }
};

export const handleDeleteRoleSlash = async (interaction) => {
    if (!isMarketAdmin(interaction)) {
        return interaction.reply({ content: '❌ لا تملك صلاحية تعديل رولات الماركت.', flags: [MessageFlags.Ephemeral] });
    }

    const role = interaction.options.getRole('role');

    try {
        const deleted = await MarketRole.findOneAndDelete({ roleId: role.id, guildId: interaction.guild.id });
        if (!deleted) {
            return interaction.reply({ content: '❌ هذه الرتبة ليست موجودة في السوق أصلاً.', flags: [MessageFlags.Ephemeral] });
        }

        await MarketManager.updateMarket(interaction.client, interaction.guild.id);
        
        return interaction.reply({ 
            content: `✅ تم مسح الرتبة <@&${role.id}> من السوق بنجاح.`, 
            flags: [MessageFlags.Ephemeral] 
        });
    } catch (err) {
        console.error(err);
        return interaction.reply({ content: '❌ حدث خطأ أثناء المسح.', flags: [MessageFlags.Ephemeral] });
    }
};
