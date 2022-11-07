require('dotenv').config();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const express = require("express");
const session = require('express-session');
const passport = require("passport");
const LocalStrategy = require("passport-local");//docs decia que no hacia falta declarar pero si o sino da error undefined
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(express.static("public"));


app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'Our little secret.', //long string, we save it in the .env file
  resave: false,
  saveUninitialized: false,
  cookie: {}
}));

app.use(passport.initialize());//for authentication
app.use(passport.session());//prepare the session

main().catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb://localhost:27017/userDB');
  
  // use `await mongoose.connect('mongodb://user:password@localhost:27017/test');` if your database has auth enabled
}


const userSchema = new mongoose.Schema({
	email: String,
	password: String,
	googleId: String,
	username: String,
	secret: String
});

userSchema.plugin(passportLocalMongoose);//hashea y saltea los passwords
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

// use static authenticate method of model in LocalStrategy
passport.use(new LocalStrategy(User.authenticate()));


//serializa y deserializa distintas auth no solo locales
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({username: profile.emails[0].value, googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
	res.render("home");
});

app.get("/auth/google",
	passport.authenticate("google", { scope: ["profile", "email"] })//passportjs docs
);

app.get("/auth/google/secrets", //redirect from google. has to match with tue URI we provided into Google Cloud Dev
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect secret page.
    res.redirect("/secrets");
  });


app.get("/login", function(req, res){
	res.render("login");
});

app.get("/register", function(req, res){
	res.render("register");
});

app.get("/secrets", function(req, res){
	User.find({"secret": {$ne: null}}, function(err, foundUsers){
		if (err){
			console.log(err);
		} else {
			if (foundUsers) {
				res.render("secrets", {usersWithSecrets: foundUsers});
			}
		}
	});
});


app.get("/submit", function(req, res){
	if (req.isAuthenticated()){
		res.render("submit");
	} else {
		res.redirect("/login");
	}
});


app.post("/submit", function(req, res){
	const submittedSecret = req.body.secret;
	User.findById(req.user.id, function(err, foundUser){
		if (err){
			console.log(err);
		} else {
			if (foundUser) {
				foundUser.secret = submittedSecret;
				foundUser.save(function(){
					res.redirect("/secrets");
				});
			}
		}
	});
});


app.get('/logout', function(req, res, next) {//https://www.passportjs.org/tutorials/password/logout/
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});


app.post("/register", function(req, res){
	//EXAMPLE User.register({username:'username', active: false}, 'password', function(err, user) {
	User.register({username: req.body.username}, req.body.password, function(err, user){
		if (err){
			console.log(err);
			res.redirect("/register");//for try again
		} else {
			passport.authenticate("local")(req, res, function(){//si llego hasta aca es pq ya esta auth y con una cookie
				res.redirect("/secrets");
			})
		}
	})
});

app.post("/login", function(req, res){
	const user = new User({
		username: req.body.username,
		password: req.body.password
	});
	req.login(user, function(err){
		if (err) {
			console.log(err);
		} else {
				passport.authenticate("local")(req, res, function(){
				res.redirect("/secrets");
			});
		}
	})
});


app.listen(3000, function(){
	console.log("Server started on port 3000...");
});