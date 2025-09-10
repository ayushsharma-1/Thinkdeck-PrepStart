// Test script to check individual service connections
require('dotenv').config();
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { connectRabbitMQ } = require('./config/rabbitmq');
const logger = require('./utils/logger');

async function testConnections() {
    console.log('Testing service connections...');
    
    // Test MongoDB
    try {
        console.log('Testing MongoDB connection...');
        await connectDB();
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.log('❌ MongoDB connection failed:', error.message);
    }
    
    // Test Redis
    try {
        console.log('Testing Redis connection...');
        await connectRedis();
        console.log('✅ Redis connected successfully');
    } catch (error) {
        console.log('❌ Redis connection failed:', error.message);
    }
    
    // Test RabbitMQ
    try {
        console.log('Testing RabbitMQ connection...');
        await connectRabbitMQ();
        console.log('✅ RabbitMQ connected successfully');
    } catch (error) {
        console.log('❌ RabbitMQ connection failed:', error.message);
    }
    
    console.log('Connection tests completed');
    process.exit(0);
}

testConnections();
