const express = require('express');

const authController = require('../controllers/auth');

const authRoutesProtection = require('../middlewares/protectedRoutes').authRoutesProtection;

const router = express.Router();

router.get('/login', authRoutesProtection, authController.getLogin);
router.post('/login', authRoutesProtection, authController.postLogin);

router.post('/logout', authController.postLogout);

module.exports = router;