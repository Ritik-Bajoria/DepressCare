const ExcelJS = require('exceljs');
const PdfPrinter = require('pdfmake');
const fs = require('fs');
const path = require('path');
const { User, Appointment, DepressionForm, Psychiatrist, PatientPayment, PsychiatristSalary } = require('../models');
const moment = require('moment');

/**
 * Generate reports in various formats (PDF, Excel, JSON)
 * @param {string} reportType - Type of report (UserStats, AppointmentStats, AssessmentSummary)
 * @param {object} options - { format: 'pdf'|'excel'|'json', startDate, endDate }
 * @returns {Promise<object>} - { file, contentType, filename, filePath, data }
 */
const generateReport = async (reportType, options = {}) => {
  const { format = 'pdf', startDate, endDate } = options;
  const dateFilter = createDateFilter(startDate, endDate);
  const reportDate = moment().format('YYYY-MM-DD_HH-mm-ss');

  try {
    let reportData;
    let filename;
    let title;

    switch (reportType) {
      case 'UserStats':
        title = 'User Statistics Report';
        reportData = await generateUserStatsReport(dateFilter);
        filename = `User_Stats_${reportDate}`;
        break;

      case 'AppointmentStats':
        title = 'Appointment Statistics Report';
        reportData = await generateAppointmentStatsReport(dateFilter);
        filename = `Appointment_Stats_${reportDate}`;
        break;

      case 'AssessmentSummary':
        title = 'Depression Assessment Summary';
        reportData = await generateAssessmentSummaryReport(dateFilter);
        filename = `Assessment_Summary_${reportDate}`;
        break;

      default:
        throw new Error('Invalid report type');
    }

    if (format === 'json') {
      return {
        data: reportData,
        contentType: 'application/json',
        filename: `${filename}.json`,
        filePath: null,
        file: null
      };
    }

    if (format === 'excel') {
      return generateExcelReport(title, reportData, filename);
    }

    // Default to PDF
    return generatePdfReport(title, reportData, filename);
  } catch (error) {
    console.error('Report generation error:', error);
    throw error;
  }
};

// Helper function to create date filter
const createDateFilter = (startDate, endDate) => {
  const filter = {};
  if (startDate) filter[Op.gte] = new Date(startDate);
  if (endDate) filter[Op.lte] = new Date(endDate);
  return Object.keys(filter).length ? filter : null;
};

// Report Data Generators
const generateUserStatsReport = async (dateFilter) => {
  const where = dateFilter ? { created_at: dateFilter } : {};
  
  const [users, stats] = await Promise.all([
    User.findAll({
      where,
      attributes: ['user_id', 'full_name', 'email', 'role', 'created_at'],
      order: [['created_at', 'DESC']]
    }),
    User.findAll({
      where,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('user_id')), 'total_users'],
        [sequelize.literal('SUM(CASE WHEN role = "Patient" THEN 1 ELSE 0 END)'), 'total_patients'],
        [sequelize.literal('SUM(CASE WHEN role = "Psychiatrist" THEN 1 ELSE 0 END)'), 'total_psychiatrists'],
      ],
      raw: true
    })
  ]);

  return {
    metadata: {
      generatedAt: new Date(),
      timeRange: dateFilter ? `${dateFilter[Op.gte]?.toISOString()} to ${dateFilter[Op.lte]?.toISOString()}` : 'All time',
      ...stats[0]
    },
    users
  };
};

const generateAppointmentStatsReport = async (dateFilter) => {
  const where = dateFilter ? { scheduled_time: dateFilter } : {};
  
  const [appointments, stats] = await Promise.all([
    Appointment.findAll({
      where,
      include: [
        { model: User, as: 'Patient', attributes: ['full_name', 'email'] },
        { model: User, as: 'Psychiatrist', attributes: ['full_name', 'email'] }
      ],
      order: [['scheduled_time', 'DESC']]
    }),
    Appointment.findAll({
      where,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('appointment_id')), 'total_appointments'],
        [sequelize.literal('SUM(CASE WHEN status = "Completed" THEN 1 ELSE 0 END)'), 'completed'],
        [sequelize.literal('SUM(CASE WHEN status = "Scheduled" THEN 1 ELSE 0 END)'), 'scheduled'],
        [sequelize.literal('SUM(CASE WHEN status = "Cancelled" THEN 1 ELSE 0 END)'), 'cancelled'],
      ],
      raw: true
    })
  ]);

  return {
    metadata: {
      generatedAt: new Date(),
      timeRange: dateFilter ? `${dateFilter[Op.gte]?.toISOString()} to ${dateFilter[Op.lte]?.toISOString()}` : 'All time',
      ...stats[0]
    },
    appointments
  };
};

const generateAssessmentSummaryReport = async (dateFilter) => {
  const where = dateFilter ? { filled_at: dateFilter } : {};
  
  const [assessments, stats] = await Promise.all([
    DepressionForm.findAll({
      where,
      include: [
        { model: User, attributes: ['full_name', 'email'] },
        { model: FormResponse, include: [FormQuestion] }
      ],
      order: [['filled_at', 'DESC']]
    }),
    DepressionForm.findAll({
      where,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('form_id')), 'total_assessments'],
        [sequelize.fn('AVG', sequelize.col('total_score')), 'average_score'],
        [sequelize.fn('MAX', sequelize.col('total_score')), 'max_score'],
        [sequelize.fn('MIN', sequelize.col('total_score')), 'min_score'],
      ],
      raw: true
    })
  ]);

  return {
    metadata: {
      generatedAt: new Date(),
      timeRange: dateFilter ? `${dateFilter[Op.gte]?.toISOString()} to ${dateFilter[Op.lte]?.toISOString()}` : 'All time',
      ...stats[0]
    },
    assessments
  };
};

// Format Generators
const generateExcelReport = async (title, reportData, filename) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report');

  // Add title
  worksheet.mergeCells('A1:D1');
  worksheet.getCell('A1').value = title;
  worksheet.getCell('A1').font = { size: 16, bold: true };

  // Add metadata
  worksheet.addRow(['Generated at', reportData.metadata.generatedAt]);
  worksheet.addRow(['Time range', reportData.metadata.timeRange]);

  // Add data-specific headers and rows
  if (reportData.users) {
    worksheet.addRow(['User Statistics']);
    worksheet.addRow(['Total Users', 'Total Patients', 'Total Psychiatrists']);
    worksheet.addRow([
      reportData.metadata.total_users,
      reportData.metadata.total_patients,
      reportData.metadata.total_psychiatrists
    ]);

    worksheet.addRow([]);
    worksheet.addRow(['User Details']);
    worksheet.addRow(['ID', 'Name', 'Email', 'Role', 'Created At']);

    reportData.users.forEach(user => {
      worksheet.addRow([
        user.user_id,
        user.full_name,
        user.email,
        user.role,
        moment(user.created_at).format('YYYY-MM-DD HH:mm')
      ]);
    });
  } else if (reportData.appointments) {
    // Similar structure for appointments
    // ...
  } else if (reportData.assessments) {
    // Similar structure for assessments
    // ...
  }

  // Style the worksheet
  worksheet.columns.forEach(column => {
    column.width = column.header.length < 20 ? 20 : column.header.length;
  });

  // Generate file
  const filePath = path.join(__dirname, '../reports', `${filename}.xlsx`);
  await workbook.xlsx.writeFile(filePath);
  const file = await workbook.xlsx.writeBuffer();

  return {
    file,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `${filename}.xlsx`,
    filePath
  };
};

const generatePdfReport = (title, reportData, filename) => {
  const fonts = {
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique'
    }
  };

  const printer = new PdfPrinter(fonts);
  const docDefinition = createPdfDefinition(title, reportData);
  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  const filePath = path.join(__dirname, '../reports', `${filename}.pdf`);
  const stream = fs.createWriteStream(filePath);
  pdfDoc.pipe(stream);
  pdfDoc.end();

  return {
    file: pdfDoc,
    contentType: 'application/pdf',
    filename: `${filename}.pdf`,
    filePath
  };
};

const createPdfDefinition = (title, reportData) => {
  const content = [
    { text: title, style: 'header' },
    { text: `Generated at: ${new Date().toLocaleString()}`, style: 'subheader' },
    { text: `Time range: ${reportData.metadata.timeRange}`, style: 'subheader' },
    { text: '\n\n' }
  ];

  if (reportData.users) {
    content.push(
      { text: 'User Statistics', style: 'sectionHeader' },
      {
        table: {
          widths: ['*', '*', '*'],
          body: [
            ['Total Users', 'Total Patients', 'Total Psychiatrists'],
            [
              reportData.metadata.total_users,
              reportData.metadata.total_patients,
              reportData.metadata.total_psychiatrists
            ]
          ]
        }
      },
      { text: '\nUser Details', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: ['auto', '*', '*', 'auto', 'auto'],
          body: [
            ['ID', 'Name', 'Email', 'Role', 'Created At'],
            ...reportData.users.map(user => [
              user.user_id,
              user.full_name,
              user.email,
              user.role,
              moment(user.created_at).format('YYYY-MM-DD')
            ])
          ]
        }
      }
    );
  } else if (reportData.appointments) {
    // Similar structure for appointments
    // ...
  } else if (reportData.assessments) {
    // Similar structure for assessments
    // ...
  }

  return {
    content,
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 10]
      },
      subheader: {
        fontSize: 12,
        margin: [0, 0, 0, 10]
      },
      sectionHeader: {
        fontSize: 14,
        bold: true,
        margin: [0, 10, 0, 5]
      }
    },
    defaultStyle: {
      font: 'Helvetica'
    }
  };
};

module.exports = {
  generateReport
};