require('dotenv').config();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const express = require("express");
const session = require('express-session');
const passport = require("passport");
const LocalStrategy = require("passport-local");//docs decia que no hacia falta declarar pero si o sino da error undefined
const passportLocalMongoose = require("passport-local-mongoose");


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
	password: String
});

userSchema.plugin(passportLocalMongoose);//hashea y saltea los passwords

const User = mongoose.model("User", userSchema);

// use static authenticate method of model in LocalStrategy
passport.use(new LocalStrategy(User.authenticate()));

// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get("/", function(req, res){
	res.render("home");
});

app.get("/login", function(req, res){
	res.render("login");
});

app.get("/register", function(req, res){
	res.render("register");
});

app.get("/secrets", function(req, res){//para verificar si el user esta o no autenticado para ingresar con los passports
	if (req.isAuthenticated()){
		res.render("secrets");
	} else {
		res.redirect("/login");
	}
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