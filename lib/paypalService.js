const { Client, Environment, LogLevel, OrdersController } = require('@paypal/paypal-server-sdk');

// PayPal configuration
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

// Initialize PayPal client and controllers
let paypalClient = null;
let ordersController = null;

function getPayPalClient() {
    if (!paypalClient) {
        if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
            throw new Error('PayPal credentials not configured');
        }

        const environment = PAYPAL_MODE === 'live' 
            ? Environment.Production
            : Environment.Sandbox;

        paypalClient = new Client({
            clientCredentialsAuthCredentials: {
                oAuthClientId: PAYPAL_CLIENT_ID,
                oAuthClientSecret: PAYPAL_CLIENT_SECRET
            },
            timeout: 0,
            environment: environment,
            logging: {
                logLevel: PAYPAL_MODE === 'sandbox' ? LogLevel.Info : LogLevel.Error,
                logRequest: {
                    logBody: true
                },
                logResponse: {
                    logHeaders: true
                }
            }
        });
        
        // Initialize OrdersController with the client
        ordersController = new OrdersController(paypalClient);
    }
    return paypalClient;
}

function getOrdersController() {
    if (!ordersController) {
        getPayPalClient(); // This will initialize both client and controller
    }
    return ordersController;
}

// Package configurations
const PACKAGES = {
    basic: {
        coins: 200,
        price: 2.50,
        name: 'Basic Package',
        description: '200 coins'
    },
    standard: {
        coins: 500,
        price: 6.25,
        name: 'Standard Package',
        description: '500 coins'
    },
    premium: {
        coins: 800,
        price: 10.00,
        name: 'Premium Package',
        description: '800 coins'
    },
    ultimate: {
        coins: 1500,
        price: 15.00,
        name: 'Ultimate Package',
        description: '1500 coins - Best Value!',
        discount: '25% OFF'
    }
};

/**
 * Create a PayPal order
 * @param {string} packageId - Package identifier (basic, standard, premium, ultimate)
 * @param {string} returnUrl - URL to return after payment
 * @param {string} cancelUrl - URL to return if payment is cancelled
 * @returns {Promise<Object>} Order details with approval URL
 */
async function createOrder(packageId, returnUrl, cancelUrl) {
    try {
        const pkg = PACKAGES[packageId];
        if (!pkg) {
            throw new Error('Invalid package selected');
        }

        const controller = getOrdersController();
        
        const collect = {
            body: {
                intent: 'CAPTURE',
                purchaseUnits: [
                    {
                        amount: {
                            currencyCode: 'USD',
                            value: pkg.price.toFixed(2)
                        },
                        description: `${pkg.name} - ${pkg.description}`
                    }
                ],
                applicationContext: {
                    returnUrl: returnUrl,
                    cancelUrl: cancelUrl,
                    brandName: 'Void V4 Enterprise',
                    landingPage: 'NO_PREFERENCE',
                    userAction: 'PAY_NOW'
                }
            }
        };

        const { body, ...httpResponse } = await controller.createOrder(collect);
        
        console.log('PayPal response:', JSON.stringify(body, null, 2));
        console.log('HTTP response status:', httpResponse.statusCode);
        console.log('Body type:', typeof body);
        console.log('Raw body:', body);
        
        // Parse the response if it's a string
        const responseData = typeof body === 'string' ? JSON.parse(body) : body;
        
        // Find approval URL
        const approvalUrl = responseData.links?.find(link => link.rel === 'approve')?.href;
        
        return {
            success: true,
            id: responseData.id,
            orderId: responseData.id,
            status: responseData.status,
            approvalUrl,
            package: pkg
        };
    } catch (error) {
        console.error('PayPal order creation error:', error);
        throw new Error(`Failed to create PayPal order: ${error.message}`);
    }
}

/**
 * Capture payment for an order
 * @param {string} orderId - PayPal order ID
 * @returns {Promise<Object>} Capture details
 */
async function captureOrder(orderId) {
    try {
        const controller = getOrdersController();
        
        const collect = {
            id: orderId
        };

        const { body, ...httpResponse } = await controller.captureOrder(collect);
        
        // Parse the response if it's a string
        const responseData = typeof body === 'string' ? JSON.parse(body) : body;
        
        return {
            success: true,
            captureId: responseData.purchaseUnits[0].payments.captures[0].id,
            status: responseData.status,
            amount: responseData.purchaseUnits[0].payments.captures[0].amount.value,
            currency: responseData.purchaseUnits[0].payments.captures[0].amount.currencyCode
        };
    } catch (error) {
        console.error('PayPal capture error:', error);
        throw new Error(`Failed to capture PayPal payment: ${error.message}`);
    }
}

/**
 * Get order details
 * @param {string} orderId - PayPal order ID
 * @returns {Promise<Object>} Order details
 */
async function getOrderDetails(orderId) {
    try {
        const controller = getOrdersController();
        
        const collect = {
            id: orderId
        };

        const { body, ...httpResponse } = await controller.getOrder(collect);
        
        return {
            success: true,
            order: body
        };
    } catch (error) {
        console.error('PayPal get order error:', error);
        throw new Error(`Failed to get PayPal order: ${error.message}`);
    }
}

/**
 * Check if PayPal is configured
 * @returns {boolean} True if PayPal is configured
 */
function isPayPalConfigured() {
    return !!(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET);
}

module.exports = {
    PACKAGES,
    createOrder,
    captureOrder,
    getOrderDetails,
    isPayPalConfigured,
    PAYPAL_MODE
};
