const express = require('express');

const officeUserController = require('../controllers/officeUser');

const officeUserProtected = require('../middlewares/protectedRoutes').officeUserProtected;

const router = express.Router();

router.get('/dashboard', officeUserProtected, officeUserController.getDashboard);

router.get('/add-report', officeUserProtected, officeUserController.getAddReport);
router.post('/add-report', officeUserProtected, officeUserController.postAddReport);

router.get('/reports', officeUserProtected, officeUserController.getReports);

router.get('/settings', officeUserProtected, officeUserController.getSettings);

router.post('/edit-office-details', officeUserProtected, officeUserController.postEditOfficeDetails);

router.post('/change-password', officeUserProtected, officeUserController.postChangePassword);

router.get('/generate-report', officeUserProtected, officeUserController.generateReport);

router.get('/generated-reports', officeUserProtected, officeUserController.getGeneratedReports);

router.get('/download-pdf/:reportId', officeUserProtected, officeUserController.getPDFReport);

module.exports = router;