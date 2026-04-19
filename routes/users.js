import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

router.post('/', async (req, res) => {
    const { phone, password, role, name, allowedGuilds } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ 
            phone, 
            password: hashedPassword, 
            role, 
            name, 
            allowedGuilds: allowedGuilds || [] 
        });
        res.json(newUser);
    } catch (error) {
        res.status(500).json({ error: 'فشل في إضافة المستخدم (الرقم مكرر)' });
    }
});

router.patch('/:id', async (req, res) => {
    const { name, role, allowedGuilds, password } = req.body;
    try {
        const updateData = { name, role, allowedGuilds };
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }
        const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'فشل في تحديث بيانات المستخدم' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'فشل في حذف المستخدم' });
    }
});

export default router;
