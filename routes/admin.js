const express = require('express');

const adminController = require('../controllers/admin');

const adminProtected = require('../middlewares/protectedRoutes').adminProtected;

const router = express.Router();

router.get('/dashboard', adminProtected, adminController.getDashboard);

router.get('/add-office', adminProtected, adminController.getAddOffice);
router.post('/add-office', adminProtected, adminController.postAddOffice);

router.get('/offices', adminProtected, adminController.getOffices);

module.exports = router;