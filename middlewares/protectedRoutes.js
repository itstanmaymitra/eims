exports.authRoutesProtection = (req, res, next) => {
    if (!req.session.isAuthenticated) {
        next();
    } else {
        if (req.session.userType === 'Administrator') {
            res.redirect('/admin/dashboard');
        } else if (req.session.userType === 'OfficeAdmin') {
            res.redirect('/office-admin/dashboard');
        } else if (req.session.userType === 'OfficeUser') {
            res.redirect('/office-user/dashboard');
        } else {
            next();
        }
    }
}

exports.officeUserProtected = (req, res, next) => {
    if (req.session.isAuthenticated && req.session.userType) {
        if (req.session.userType === 'OfficeUser') {
            next();
        } else {
            if (req.session.userType === 'Administrator') {
                res.redirect('/admin/dashboard');
            } else if (req.session.userType === 'OfficeAdmin') {
                res.redirect('/office-admin/dashboard');
            } else {
                res.redirect('/login');
            }
        }
    } else {
        res.redirect('/login');
    }
}

exports.officeAdminProtected = (req, res, next) => {
    if (req.session.isAuthenticated && req.session.userType) {
        if ( req.session.userType === 'OfficeAdmin') {
            next();
        } else {
            if (req.session.userType === 'Administrator') {
                res.redirect('/admin/dashboard');
            } else if (req.session.userType === 'OfficeUser') {
                res.redirect('/office-user/dashboard');
            } else {
                res.redirect('/login');
            }
        }
    } else {
        res.redirect('/login');
    }
}

exports.adminProtected = (req, res, next) => {
    if (req.session.isAuthenticated && req.session.userType) {
        if (req.session.userType === 'Administrator') {
            next();
        } else {
            if (req.session.userType === 'OfficeAdmin') {
                res.redirect('/office-admin/dashboard');
            } else if (req.session.userType === 'OfficeUser') {
                res.redirect('/office-user/dashboard');
            } else {
                res.redirect('/login');
            }
        }
    } else {
        res.redirect('/login');
    }
}