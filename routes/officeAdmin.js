const express = require('express');

const officeAdminController = require('../controllers/officeAdmin');

const officeAdminProtected = require('../middlewares/protectedRoutes').officeAdminProtected;

const router = express.Router();

router.get('/dashboard', officeAdminProtected, officeAdminController.getDashboard);

router.get('/add-office', officeAdminProtected, officeAdminController.getAddOffice);
router.post('/add-office', officeAdminProtected, officeAdminController.postAddOffice);

router.get('/offices', officeAdminProtected, officeAdminController.getOffices);

router.get('/reports', officeAdminProtected, officeAdminController.getReports);

router.get('/reports-by-date', officeAdminProtected, officeAdminController.getReportsByDate);

router.get('/offices/:officeUserId', officeAdminProtected, officeAdminController.getOfficeUserData);

router.get('/settings', officeAdminProtected, officeAdminController.getSettings);

router.post('/edit-office-details', officeAdminProtected, officeAdminController.postEditOfficeDetails);

router.post('/change-password', officeAdminProtected, officeAdminController.postChangePassword);

router.get('/generate-office-report/:officeUserId', officeAdminProtected, officeAdminController.generateOfficeReport);

router.get('/generate-combined-report', officeAdminProtected, officeAdminController.generateCombinedReport);

router.get('/generate-combined-report-by-date', officeAdminProtected, officeAdminController.generateCombinedReportByDate);

router.get('/generated-reports', officeAdminProtected, officeAdminController.getGeneratedReports);

router.get('/download-pdf/:reportId', officeAdminProtected, officeAdminController.getPDFReport);

module.exports = router;