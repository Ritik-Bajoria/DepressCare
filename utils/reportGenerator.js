const ExcelJS = require('exceljs');
const PdfPrinter = require('pdfmake');
const fs = require('fs');
const path = require('path');
const sequelize = require('sequelize');
const { User, Appointment, DepressionForm, Psychiatrist, PatientPayment, PsychiatristSalary, FormQuestion,FormResponse } = require('../models');
const moment = require('moment');
const { Op } = require('sequelize');

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
        { 
          model: User,
          as: 'PatientUser',
          attributes: ['full_name', 'email']
        },
        { 
          model: User,
          as: 'PsychiatristUser',
          attributes: ['full_name', 'email']
        }
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
        { 
          model: User, 
          as: 'Patient', // Must match the alias in your association
          attributes: ['full_name', 'email'] 
        }
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
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    // Add title
    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value = title;
    worksheet.getCell('A1').font = { size: 16, bold: true };

    // Add metadata
    worksheet.addRow(['Generated at', new Date().toLocaleString()]);
    worksheet.addRow(['Time range', reportData.metadata?.timeRange || 'All time']);

    // Add data-specific headers and rows
    if (reportData.users) {
      // User Stats Report
      worksheet.addRow(['User Statistics']);
      worksheet.addRow(['Total Users', 'Total Patients', 'Total Psychiatrists']);
      worksheet.addRow([
        reportData.metadata?.total_users || 0,
        reportData.metadata?.total_patients || 0,
        reportData.metadata?.total_psychiatrists || 0
      ]);

      worksheet.addRow([]);
      worksheet.addRow(['User Details']);
      worksheet.addRow(['ID', 'Name', 'Email', 'Role', 'Created At']);

      (reportData.users || []).forEach(user => {
        worksheet.addRow([
          user.user_id,
          user.full_name,
          user.email,
          user.role,
          moment(user.created_at).format('YYYY-MM-DD HH:mm')
        ]);
      });
    } 
    else if (reportData.appointments) {
      // Appointment Stats Report - FIXED
      worksheet.addRow(['Appointment Statistics']);
      worksheet.addRow(['Total Appointments', 'Completed', 'Scheduled', 'Cancelled']);
      worksheet.addRow([
        reportData.metadata?.total_appointments || 0,
        reportData.metadata?.completed || 0,
        reportData.metadata?.scheduled || 0,
        reportData.metadata?.cancelled || 0
      ]);

      worksheet.addRow([]);
      worksheet.addRow(['Appointment Details']);
      worksheet.addRow(['ID', 'Patient', 'Psychiatrist', 'Scheduled Time', 'Status']);

      (reportData.appointments || []).forEach(appt => {
        worksheet.addRow([
          appt.appointment_id,
          appt.PatientUser?.full_name || 'N/A',  // Changed from Patient to PatientUser
          appt.PsychiatristUser?.full_name || 'N/A',  // Changed from Psychiatrist to PsychiatristUser
          moment(appt.scheduled_time).format('YYYY-MM-DD HH:mm'),
          appt.status
        ]);
      });
    }
    else if (reportData.assessments) {
      // Assessment Report - FIXED
      worksheet.addRow(['Assessment Statistics']);
      worksheet.addRow(['Total Assessments', 'Average Score', 'Max Score', 'Min Score']);
      worksheet.addRow([
        reportData.metadata?.total_assessments || 0,
        reportData.metadata?.average_score ? Math.round(reportData.metadata.average_score * 100) / 100 : 0,
        reportData.metadata?.max_score || 0,
        reportData.metadata?.min_score || 0
      ]);

      worksheet.addRow([]);
      worksheet.addRow(['Assessment Details']);
      worksheet.addRow(['ID', 'Patient', 'Score', 'Date Taken']);

      (reportData.assessments || []).forEach(assessment => {
        worksheet.addRow([
          assessment.form_id,
          assessment.Patient?.full_name || 'N/A',  // Changed from User to Patient
          assessment.total_score,
          moment(assessment.filled_at).format('YYYY-MM-DD')
        ]);
      });
    }

    // Auto-size columns
    worksheet.columns.forEach(column => {
      const header = column.header || '';
      column.width = Math.max(15, header.length < 20 ? 20 : header.length + 5);
    });

    // Generate file
    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filePath = path.join(reportsDir, `${filename}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    const file = await workbook.xlsx.writeBuffer();

    return {
      file,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${filename}.xlsx`,
      filePath
    };
  } catch (error) {
    console.error('Excel report generation error:', error);
    throw error;
  }
};

const generatePdfReport = (title, reportData, filename) => {
  return new Promise((resolve, reject) => {
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

    const chunks = [];
    pdfDoc.on('data', chunk => chunks.push(chunk));
    pdfDoc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const reportsDir = path.join(__dirname, '../reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      const filePath = path.join(reportsDir, `${filename}.pdf`);
      fs.writeFileSync(filePath, buffer);

      resolve({
        file: buffer,
        contentType: 'application/pdf',
        filename: `${filename}.pdf`,
        filePath
      });
    });

    pdfDoc.on('error', err => reject(err));
    pdfDoc.end();
  });
};

const createPdfDefinition = (title, reportData) => {
  const content = [
    { text: title, style: 'header' },
    { text: `Generated at: ${new Date().toLocaleString()}`, style: 'subheader' },
    { text: `Time range: ${reportData.metadata?.timeRange || 'All time'}`, style: 'subheader' },
    { text: '\n\n' }
  ];

  // Helper function to safely format dates
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return moment(date).isValid() ? moment(date).format('YYYY-MM-DD HH:mm') : 'N/A';
  };

  if (reportData.users) {
    content.push(
      { text: 'User Statistics', style: 'sectionHeader' },
      {
        table: {
          widths: ['*', '*', '*'],
          body: [
            ['Total Users', 'Total Patients', 'Total Psychiatrists'],
            [
              reportData.metadata.total_users || 0,
              reportData.metadata.total_patients || 0,
              reportData.metadata.total_psychiatrists || 0
            ]
          ]
        }
      },
      { text: '\nUser Details', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: [40, 100, 160, 80, 80],
          body: [
            ['ID', 'Name', 'Email', 'Role', 'Created At'],
            ...reportData.users.map(user => [
              user.user_id || 'N/A',
              truncate(user.full_name || 'N/A', 30),
              truncate(user.email || 'N/A', 35),
              user.role || 'N/A',
              formatDate(user.created_at)
            ])
          ]
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5
        }
      }
    );
  } else if (reportData.appointments) {
    content.push(
      { text: 'Appointment Statistics', style: 'sectionHeader' },
      {
        table: {
          widths: ['*', '*', '*', '*'],
          body: [
            ['Total', 'Completed', 'Scheduled', 'Cancelled'],
            [
              reportData.metadata.total_appointments || 0,
              reportData.metadata.completed || 0,
              reportData.metadata.scheduled || 0,
              reportData.metadata.cancelled || 0
            ]
          ]
        }
      },
      { text: '\nAppointment Details', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: [40, 100, 100, 100, 60],
          body: [
            ['ID', 'Patient', 'Psychiatrist', 'Scheduled Time', 'Status'],
            ...reportData.appointments.map(appt => [
              appt.appointment_id || 'N/A',
              truncate(appt.PatientUser?.full_name || 'N/A', 25),
              truncate(appt.PsychiatristUser?.full_name || 'N/A', 25),
              formatDate(appt.scheduled_time),
              appt.status || 'N/A'
            ])
          ]
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5
        }
      }
    );
  } else if (reportData.assessments) {
    content.push(
      { text: 'Assessment Statistics', style: 'sectionHeader' },
      {
        table: {
          widths: ['*', '*', '*', '*'],
          body: [
            ['Total', 'Avg Score', 'Max Score', 'Min Score'],
            [
              reportData.metadata.total_assessments || 0,
              reportData.metadata.average_score ? Math.round(reportData.metadata.average_score * 100) / 100 : 0,
              reportData.metadata.max_score || 0,
              reportData.metadata.min_score || 0
            ]
          ]
        }
      },
      { text: '\nAssessment Details', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: [40, 120, 60, 80],
          body: [
            ['ID', 'Patient', 'Score', 'Date Taken'],
            ...reportData.assessments.map(assessment => [
              assessment.form_id || 'N/A',
              truncate(assessment.Patient?.full_name || 'N/A', 30),
              assessment.total_score || 'N/A',
              formatDate(assessment.filled_at)
            ])
          ]
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5
        }
      }
    );
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

const truncate = (text, max = 30) => {
  if (!text) return '';
  return text.length > max ? text.substring(0, max - 3) + '...' : text;
};
module.exports = {
  generateReport
};