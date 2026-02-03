const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const uri = process.env.MONGO_URI;

console.log("Testing connection to:", uri.replace(/:([^:@]+)@/, ':****@')); // Hide password in logs

mongoose.connect(uri)
    .then(() => {
        console.log("✅ Connection Successful!");
        process.exit(0);
    })
    .catch(err => {
        console.error("❌ Connection Failed!");
        console.error("Error Name:", err.name);
        console.error("Error Message:", err.message);
        // console.error("Full Error:", err);
        process.exit(1);
    });
