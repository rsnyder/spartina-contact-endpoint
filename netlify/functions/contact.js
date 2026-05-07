const nodemailer = require("nodemailer");

const THANKS_URL = "https://www.spartina.io/thanks/";
const ERROR_URL = "https://www.spartina.io/contact-error";

function parseFormBody(body) {
  const params = new URLSearchParams(body || "");
  return {
    name: (params.get("name") || "").trim(),
    email: (params.get("email") || "").trim(),
    subject: (params.get("subject") || "").trim(),
    message: (params.get("message") || "").trim(),
    company: (params.get("company") || "").trim() // honeypot field
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function redirect(location, statusCode = 303) {
  return {
    statusCode,
    headers: {
      Location: location,
      "Cache-Control": "no-store"
    },
    body: ""
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        Allow: "POST"
      },
      body: "Method Not Allowed"
    };
  }

  const { name, email, subject, message, company } = parseFormBody(event.body);

  // Honeypot: if filled, pretend success but do not send.
  if (company) {
    return redirect(THANKS_URL);
  }

  if (!name || !email || !message || !isValidEmail(email)) {
    return redirect(ERROR_URL);
  }

  const {
    ZOHO_SMTP_USER,
    ZOHO_SMTP_PASS,
    CONTACT_TO,
    CONTACT_FROM
  } = process.env;

  if (!ZOHO_SMTP_USER || !ZOHO_SMTP_PASS || !CONTACT_TO || !CONTACT_FROM) {
    console.error("Missing required environment variables.");
    return redirect(ERROR_URL);
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.com",
    port: 465,
    secure: true,
    auth: {
      user: ZOHO_SMTP_USER,
      pass: ZOHO_SMTP_PASS
    }
  });

  try {
    await transporter.sendMail({
      from: `Spartina Website <${CONTACT_FROM}>`,
      to: CONTACT_TO,
      replyTo: email,
      subject: subject,
      text: message
    });

    return redirect(THANKS_URL);
  } catch (error) {
    console.error("Mail send failed:", error);
    return redirect(ERROR_URL);
  }
};