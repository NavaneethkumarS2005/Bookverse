require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const listUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({}, 'email name role');
        console.log("📂 Registered Users:");
        users.forEach(u => console.log(`- ${u.name} (${u.email}) [${u.role}]`));
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
};

listUsers();
