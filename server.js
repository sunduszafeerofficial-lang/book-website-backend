const crypto = require("crypto");
require("dotenv").config();

const express = require("express");
const Razorpay = require("razorpay");
const nodemailer = require("nodemailer");
const twilio = require("twilio");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// =======================
// STATIC FILES
// =======================
app.use("/image", express.static(path.join(__dirname, "image")));

// =======================
// MIDDLEWARE
// =======================
app.use(cors());
app.use(express.json());

// =======================
// FILE STORAGE
// =======================
const ordersFile = path.join(__dirname, "orders.json");
const getOrders = () =>
  fs.existsSync(ordersFile)
    ? JSON.parse(fs.readFileSync(ordersFile))
    : [];
const saveOrders = (orders) =>
  fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));

// =======================
// EMAIL SETUP
// =======================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.CONTACT_EMAIL,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Verify transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email configuration error:", error);
  } else {
    console.log("✅ Email service ready");
  }
});

// =======================
// WHATSAPP SETUP (TWILIO)
// =======================
const client = new twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH
);

// =======================
// SEND EMAIL TO CUSTOMER
// =======================
function sendCustomerEmail(order) {
  const customerHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; background-color: #fff; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 30px 20px; }
        .order-info { background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #4CAF50; border-radius: 4px; }
        .order-info h3 { margin-top: 0; color: #4CAF50; }
        .id-box { background-color: #e8f5e9; border: 2px solid #4CAF50; padding: 15px; border-radius: 4px; margin: 20px 0; text-align: center; }
        .id-box strong { color: #2e7d32; font-size: 16px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        table td { padding: 10px; border-bottom: 1px solid #ddd; }
        table td:first-child { font-weight: bold; color: #4CAF50; width: 40%; }
        .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; border-top: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>📚 Order Confirmation</h1></div>
        <div class="content">
          <p>Dear <strong>${order.name}</strong>,</p>
          <p>Thank you for your order!</p>
          <div class="id-box">
            <p style="margin: 0; font-size: 14px; color: #666;">Your Order Reference ID</p>
            <strong style="font-size: 22px; display: block; margin-top: 5px;">${order.id}</strong>
          </div>
          <div class="order-info">
            <h3>📖 Order Details:</h3>
            <table>
              <tr><td>Order ID:</td><td>${order.id}</td></tr>
              <tr><td>Book Title:</td><td>${order.book}</td></tr>
              <tr><td>Price:</td><td>₹${order.price}</td></tr>
              <tr><td>Payment Method:</td><td>${order.payment}</td></tr>
              <tr><td>Order Status:</td><td><strong style="color: #4CAF50;">${order.status}</strong></td></tr>
            </table>
          </div>
          <div class="order-info">
            <h3>📍 Delivery Address:</h3>
            <p>${order.address}<br>${order.city || ''} ${order.pincode || ''}</p>
          </div>
          <p><strong>⏱️ Expected Delivery:</strong> 5-7 business days</p>
        </div>
        <div class="footer">
          <p>&copy; 2026 Sundus Books. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  transporter.sendMail({
    from: process.env.CONTACT_EMAIL,
    to: order.email,
    subject: `✅ Order Confirmation [ID: ${order.id}] - ${order.book}`,
    html: customerHTML
  }, (err) => {
    if (err) console.error("❌ Customer email error:", err);
    else console.log("✅ Customer email sent to: " + order.email);
  });
}

// =======================
// SEND EMAIL TO ADMIN
// =======================
function sendOrderEmail(order) {
  const adminHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; background-color: #fff; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #FF6B6B 0%, #ee5a52 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 30px 20px; }
        .order-info { background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #FF6B6B; border-radius: 4px; }
        .order-info h3 { margin-top: 0; color: #FF6B6B; }
        .id-box { background-color: #ffe8e8; border: 2px solid #FF6B6B; padding: 15px; border-radius: 4px; margin: 20px 0; text-align: center; }
        .id-box strong { color: #c62828; font-size: 16px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        table td { padding: 10px; border-bottom: 1px solid #ddd; }
        table td:first-child { font-weight: bold; color: #FF6B6B; width: 40%; }
        .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; border-top: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>🔔 NEW ORDER RECEIVED</h1></div>
        <div class="content">
          <div class="id-box">
            <p style="margin: 0; font-size: 14px; color: #666;">Order Reference ID</p>
            <strong style="font-size: 22px; display: block; margin-top: 5px;">${order.id}</strong>
          </div>
          <div class="order-info">
            <h3>📦 Order Information:</h3>
            <table>
              <tr><td>Order ID:</td><td><strong>${order.id}</strong></td></tr>
              <tr><td>Book Title:</td><td>${order.book}</td></tr>
              <tr><td>Price:</td><td>₹${order.price}</td></tr>
              <tr><td>Payment Method:</td><td>${order.payment}</td></tr>
              <tr><td>Status:</td><td>${order.status}</td></tr>
            </table>
          </div>
          <div class="order-info">
            <h3>👤 Customer Details:</h3>
            <table>
              <tr><td>Name:</td><td>${order.name}</td></tr>
              <tr><td>Phone:</td><td>${order.phone || order.mobile}</td></tr>
              <tr><td>Email:</td><td>${order.email || 'N/A'}</td></tr>
              <tr><td>Address:</td><td>${order.address}</td></tr>
              <tr><td>City:</td><td>${order.city || 'N/A'}</td></tr>
              <tr><td>Pincode:</td><td>${order.pincode || 'N/A'}</td></tr>
            </table>
          </div>
        </div>
        <div class="footer">
          <p>&copy; 2026 Sundus Books Admin Panel.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  transporter.sendMail({
    from: process.env.CONTACT_EMAIL,
    to: process.env.CONTACT_EMAIL,
    subject: `🔔 NEW ORDER [ID: ${order.id}] – ${order.payment} - ${order.book}`,
    html: adminHTML
  }, (err) => {
    if (err) console.error("❌ Admin email error:", err);
    else console.log("✅ Admin email sent | Order ID: " + order.id);
  });
}

// =======================
// SEND WHATSAPP
// =======================
function sendWhatsApp(order) {
  const msg = `📚 NEW BOOK ORDER\n\n🆔 Order ID: ${order.id}\n📖 Book: ${order.book}\n💰 Amount: ₹${order.price}\n👤 Name: ${order.name}\n📱 Phone: ${order.phone || order.mobile}\n📍 Address: ${order.address}`;

  client.messages.create({
    from: process.env.TWILIO_WHATSAPP,
    to: process.env.MY_WHATSAPP,
    body: msg
  })
  .then(() => console.log("✅ WhatsApp sent"))
  .catch(err => console.error("❌ WhatsApp error:", err));
}

// =======================
// COD ORDER
// =======================
app.post("/order-cod", (req, res) => {
  try {
    const { name, phone, mobile, email, address, city, pincode, book, price } = req.body;

    if (!name || !(phone || mobile) || !address || !book) {
      return res.status(400).json({ success: false, message: "Required fields missing" });
    }

    const order = {
      id: Date.now(),
      name,
      phone: phone || mobile,
      mobile: mobile || phone,
      email: email || null,
      address,
      city: city || null,
      pincode: pincode || null,
      book,
      payment: "COD",
      price: price || 299,
      status: "Pending",
      createdAt: new Date().toISOString()
    };

    const orders = getOrders();
    orders.push(order);
    saveOrders(orders);

    sendOrderEmail(order);
    if (email) sendCustomerEmail(order);
    sendWhatsApp(order);

    res.json({ success: true, message: "Order placed!", orderId: order.id });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error placing order", error: error.message });
  }
});

// =======================
// RAZORPAY SETUP
// =======================
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// =======================
// CREATE RAZORPAY ORDER
// =======================
app.post("/create-order", async (req, res) => {
  try {
    const { amount, bookName } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: "Valid amount required" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: { book: bookName || "Unknown" }
    });

    res.json({ success: true, orderId: order.id, amount: order.amount, ...order });
  } catch (err) {
    res.status(500).json({ success: false, error: "Razorpay error", details: err.message });
  }
});

// =======================
// VERIFY PAYMENT
// =======================
app.post("/verify-payment", (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing payment details" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      res.json({ success: true, message: "Payment verified" });
    } else {
      res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Verification failed" });
  }
});

// =======================
// PAYMENT SUCCESS
// =======================
app.post("/payment-success", (req, res) => {
  try {
    const { payment_id, name, email, mobile, phone, address, city, pincode, book, price } = req.body;

    if (!payment_id || !name || !(mobile || phone) || !address) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const order = {
      id: Date.now(),
      name,
      email: email || null,
      mobile: mobile || phone,
      phone: phone || mobile,
      address,
      city: city || null,
      pincode: pincode || null,
      book,
      payment: "ONLINE",
      price: price || 299,
      payment_id,
      status: "Paid",
      createdAt: new Date().toISOString()
    };

    const orders = getOrders();
    orders.push(order);
    saveOrders(orders);

    sendOrderEmail(order);
    if (email) sendCustomerEmail(order);
    sendWhatsApp(order);

    res.json({ success: true, message: "Payment successful!", orderId: order.id });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error", error: error.message });
  }
});

// =======================
// ADMIN ENDPOINTS
// =======================
app.get("/orders", (req, res) => {
  try {
    const orders = getOrders();
    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: "Error fetching orders" });
  }
});

app.get("/orders/:id", (req, res) => {
  try {
    const orders = getOrders();
    const order = orders.find(o => o.id === parseInt(req.params.id));
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, error: "Error" });
  }
});

app.get("/search-orders", (req, res) => {
  try {
    const { name, email, phone } = req.query;
    const orders = getOrders();
    let results = orders;
    if (name) results = results.filter(o => o.name.toLowerCase().includes(name.toLowerCase()));
    if (email) results = results.filter(o => o.email && o.email.toLowerCase().includes(email.toLowerCase()));
    if (phone) results = results.filter(o => (o.phone || o.mobile).includes(phone));
    res.json({ success: true, count: results.length, orders: results });
  } catch (error) {
    res.status(500).json({ success: false, error: "Error searching" });
  }
});

app.put("/orders/:id", (req, res) => {
  try {
    const { status } = req.body;
    const orders = getOrders();
    const orderIndex = orders.findIndex(o => o.id === parseInt(req.params.id));
    if (orderIndex === -1) return res.status(404).json({ success: false, message: "Not found" });
    if (!["Pending", "Processing", "Shipped", "Delivered", "Cancelled"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    orders[orderIndex].status = status;
    saveOrders(orders);
    res.json({ success: true, message: "Updated", order: orders[orderIndex] });
  } catch (error) {
    res.status(500).json({ success: false, error: "Error updating" });
  }
});

app.delete("/orders/:id", (req, res) => {
  try {
    const orders = getOrders();
    const filtered = orders.filter(o => o.id !== parseInt(req.params.id));
    if (filtered.length === orders.length) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    saveOrders(filtered);
    res.json({ success: true, message: "Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Error deleting" });
  }
});

// =======================
// HEALTH CHECK
// =======================
app.get("/health", (req, res) => {
  res.json({ status: "✅ Server running", timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// =======================
// ERROR HANDLING
// =======================
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ success: false, error: "Internal error", message: err.message });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: "Endpoint not found" });
});

// =======================
// START SERVER
// =======================
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🔥 SERVER RUNNING SUCCESSFULLY 🔥    ║
╚════════════════════════════════════════╝
📍 URL: http://localhost:${PORT}
📧 Email: Sunduszafeerofficial@gmail.com
⏰ Started at: ${new Date().toLocaleString()}
  `);
});

module.exports = app;