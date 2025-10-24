require('dotenv').config();
const { createOrder } = require('./lib/paypalService');

async function testGuestCheckout() {
    console.log('🚀 Testing PayPal Guest Checkout Configuration...\n');
    
    try {
        const result = await createOrder(
            'basic', 
            'http://localhost:3000/api/paypal/return',
            'http://localhost:3000/api/paypal/cancel'
        );
        
        console.log('✅ Order created successfully!');
        console.log('Order ID:', result.id);
        console.log('Status:', result.status);
        console.log('Approval URL:', result.approvalUrl);
        
        console.log('\n🔗 Test this URL in your browser:');
        console.log(result.approvalUrl);
        console.log('\n💡 Look for "Pay with Debit or Credit Card" option on the PayPal page');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testGuestCheckout();