// utils/pdfGenerator.js
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

/**
 * Generate and save PDF certificate
 * @param {Object} options
 * @param {String} options.userId
 * @param {String} options.userName
 * @param {Number} options.score
 * @returns {String} file path or URL
 */
exports.generateCertificatePDF = ({ userId, userName = "Learner", score }) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
      });

      const fileName = `certificate-${userId}-${Date.now()}.pdf`;
      const filePath = path.join(__dirname, "../certificates", fileName);
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Style
      doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).stroke();

      doc.fontSize(28).text("Certificate of Completion", {
        align: "center",
        underline: true,
      });

      doc.moveDown();
      doc.fontSize(20).text(`This certifies that`, { align: "center" });

      doc.moveDown();
      doc.fontSize(26).text(`${userName}`, {
        align: "center",
        bold: true,
      });

      doc.moveDown();
      doc.fontSize(18).text(`has successfully passed the ElevateX Certification Test`, {
        align: "center",
      });

      doc.moveDown();
      doc.fontSize(16).text(`Score: ${score}%`, {
        align: "center",
      });

      doc.moveDown();
      const issuedDate = new Date().toLocaleDateString();
      doc.fontSize(14).text(`Issued on ${issuedDate}`, { align: "center" });

      // Footer
      doc.moveTo(200, 400).lineTo(600, 400).stroke();
      doc.text("ElevateX Career Platform", 0, 410, { align: "center" });

      doc.end();

      stream.on("finish", () => {
        resolve(`/certificates/${fileName}`); // return relative path (or absolute if needed)
      });
    } catch (err) {
      reject(err);
    }
  });
};
