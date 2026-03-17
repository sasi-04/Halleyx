const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmail(to, subject, text) {
  try {
    console.log("SENDING EMAIL TO:", to);

    const info = await transporter.sendMail({
      from: `"Halleyx" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });

    console.log("EMAIL SENT SUCCESS:", info.response);
  } catch (err) {
    console.error("EMAIL ERROR FULL:", err);
  }
}

module.exports = sendEmail;

