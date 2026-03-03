const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f4f7f6;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%);
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      letter-spacing: 1px;
    }
    .content {
      padding: 30px;
    }
    .footer {
      background: #f1f3f4;
      color: #70757a;
      padding: 20px;
      text-align: center;
      font-size: 12px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #1a73e8;
      color: #ffffff;
      text-decoration: none;
      border-radius: 4px;
      font-weight: bold;
      margin-top: 20px;
    }
    .highlight {
      color: #1a73e8;
      font-weight: bold;
    }
    .info-box {
      background-color: #e8f0fe;
      border-left: 4px solid #1a73e8;
      padding: 15px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Dream Institute</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Dream Institute. All rights reserved.</p>
      <p>Building pillars for your success.</p>
    </div>
  </div>
</body>
</html>
`;

const sendEmail = async (to, subject, html) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log("Email credentials not set. Skipping email send.");
      console.log(`To: ${to}, Subject: ${subject}`);
      return;
    }
    await transporter.sendMail({
      from: `"Dream Institute" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

const sendStudentRegistrationEmail = async (student) => {
  const content = `
    <h2>Welcome to Dream Institute!</h2>
    <p>Dear ${student.fName} ${student.lName},</p>
    <p>Thank you for trusting us as your <span class="highlight">education partner</span>. We are thrilled to have you join our community.</p>
    <p>We wish our institute can be a pillar for your success. Good luck on your journey!</p>
    <div class="info-box">
      <p><strong>Step into your future:</strong> Your registration is complete. You can now access your profile and enroll in classes.</p>
    </div>
    <p>Please access Dream Institute's student portal for your information and updates.</p>
    <a href="#" class="button">Go to Student Portal</a>
  `;
  await sendEmail(student.email, "Welcome to Dream Institute", baseTemplate(content));
};

const sendTeacherRegistrationEmail = async (teacher) => {
  const content = `
    <h2>Welcome to the Faculty!</h2>
    <p>Dear ${teacher.title} ${teacher.fName} ${teacher.lName},</p>
    <p>We are honored to have you join the Dream Institute teaching staff. Your expertise and dedication will be instrumental in shaping our students' futures.</p>
    <p>We look forward to a successful collaboration and wish you an inspiring journey with us.</p>
    <div class="info-box">
      <p><strong>Facilitator Portal:</strong> Your profile has been created. You can soon start managing your classes and schedules.</p>
    </div>
    <p>Please log in to the teacher portal to complete your settings.</p>
    <a href="#" class="button">Teacher Dashboard</a>
  `;
  await sendEmail(teacher.email, "Welcome to Dream Institute Faculty", baseTemplate(content));
};

const sendPaymentConfirmationEmail = async (payment, student, classDoc) => {
  const content = `
    <h2>Payment Successful!</h2>
    <p>Dear ${student.fName},</p>
    <p>This is to confirm that we have successfully received your payment for the month of <span class="highlight">${payment.month.charAt(0).toUpperCase() + payment.month.slice(1)}</span>.</p>
    <div class="info-box">
      <p><strong>Class:</strong> ${classDoc.subjectId.subjectName} (Grade ${classDoc.grade})</p>
      <p><strong>Amount:</strong> Rs. ${payment.amount.toLocaleString()}</p>
      <p><strong>Date:</strong> ${new Date(payment.paymentDate).toLocaleDateString()}</p>
    </div>
    <p>Keep up the great work in your studies! Your commitment is the first step towards excellence.</p>
  `;
  await sendEmail(student.email, "Payment Confirmation - Dream Institute", baseTemplate(content));
};

const sendEnrollmentConfirmationEmail = async (student, classDoc) => {
  const content = `
    <h2>Enrollment Confirmed!</h2>
    <p>Dear ${student.fName},</p>
    <p>You have successfully enrolled in a new class at Dream Institute.</p>
    <div class="info-box">
      <p><strong>Subject:</strong> ${classDoc.subjectId.subjectName}</p>
      <p><strong>Grade:</strong> ${classDoc.grade}</p>
      <p><strong>Teacher:</strong> ${classDoc.teacherId.title} ${classDoc.teacherId.fName} ${classDoc.teacherId.lName}</p>
    </div>
    <p>We are excited to see you in class! Please stay updated with the schedule through the student portal.</p>
    <a href="#" class="button">View My Schedule</a>
  `;
  await sendEmail(student.email, "Class Enrollment Confirmation", baseTemplate(content));
};

const sendClassAssignmentEmail = async (teacher, classDoc) => {
  const content = `
    <h2>New Class Assignment</h2>
    <p>Dear ${teacher.title} ${teacher.fName},</p>
    <p>A new class has been assigned to you or successfully updated in your profile.</p>
    <div class="info-box">
      <p><strong>Subject:</strong> ${classDoc.subjectId.subjectName}</p>
      <p><strong>Grade:</strong> ${classDoc.grade}</p>
      <p><strong>Registration Date:</strong> ${new Date().toLocaleDateString()}</p>
    </div>
    <p>Please check your teacher dashboard for enrollment details and student lists.</p>
    <a href="#" class="button">Go to Teacher Portal</a>
  `;
  await sendEmail(teacher.email, "New Class Assignment - Dream Institute", baseTemplate(content));
};

module.exports = {
  sendStudentRegistrationEmail,
  sendTeacherRegistrationEmail,
  sendPaymentConfirmationEmail,
  sendEnrollmentConfirmationEmail,
  sendClassAssignmentEmail,
};
