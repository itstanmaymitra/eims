require("dotenv").config({
	path: "./config/config.env",
});

// Import Packages and modules
const path = require("path");

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBSession = require("connect-mongodb-session")(session);
const bcrypt = require("bcryptjs");
const flash = require("connect-flash");
const helmet = require("helmet");

// Import Models
const Admin = require("./models/admin");

// Environment Variables
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// initialize app
const app = express();

// View Engine Setup
app.set("view engine", "ejs");
app.set("views", "views");

// Routes import
const publicRoutes = require("./routes/public");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const officeAdminRoutes = require("./routes/officeAdmin");
const officeUserRoutes = require("./routes/officeUser");

// Middleware for bodyparser and express Static
app.use(
	helmet({
		contentSecurityPolicy: false,
	})
);
app.use(
	express.urlencoded({
		extended: true,
	})
);

app.use(express.static(path.join(__dirname, "public")));

// MongoDBSession init and Middleware for session
const store = new MongoDBSession({
	uri: MONGO_URI,
	collection: "sessions",
});

app.use(
	session({
		secret: "somehardsecret",
		resave: false,
		saveUninitialized: false,
		store: store,
	})
);

// Initialize Connect-flash
app.use(flash());

// Routes Using
app.use(publicRoutes);
app.use(authRoutes);
app.use("/admin", adminRoutes);
app.use("/office-admin", officeAdminRoutes);
app.use("/office-user", officeUserRoutes);

// Page not found(404)
app.use((req, res, next) => {
	res.status(404).render("error/404", {
		pageTitle: "Page not found!",
		errorMessage: [],
		successMessage: [],
	});
});

// Error Handling Middleware
app.use((error, req, res, next) => {
	console.log(error);
	res.status(500).render("error/500", {
		pageTitle: "Error 500",
		errorMessage: [],
		successMessage: [],
	});
});

mongoose
	.connect(MONGO_URI, {})
	.then(async (result) => {
		try {
			const admin = await Admin.findOne({
				email: ADMIN_EMAIL,
			});

			if (!admin) {
				const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

				const newAdmin = new Admin({
					username: "admin",
					email: ADMIN_EMAIL,
					password: hashedPassword,
				});

				await newAdmin.save();
			}
		} catch (error) {
			console.log(error);
		}

		app.listen(PORT, (err) => {
			if (err) {
				console.log(err);
			} else {
				console.log(`Server is running on PORT ${PORT}`);
			}
		});
	})
	.catch((err) => {
		console.log(err);
	});
