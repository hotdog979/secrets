const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const express = require("express");
const encrypt = require("mongoose-encryption");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(express.static("public"));


main().catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb://localhost:27017/userDB');
  
  // use `await mongoose.connect('mongodb://user:password@localhost:27017/test');` if your database has auth enabled
}

app.get("/", function(req, res){
	res.render("home");
});

app.get("/login", function(req, res){
	res.render("login");
});

app.get("/register", function(req, res){
	res.render("register");
});


const userSchema = new mongoose.Schema({
	email: String,
	password: String
});


//DECLARACION DE UNA VARIABLE CON UN STRING LARGO PARA COMENZAR A CIFRAR LA BD
var secret = "Thisismylittlesecret.";
userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password']  });//se excluye el campo password para encriptar.
//ES IMPORTANTE Y OBLIGATORIO ESCRIBIR EL userSchema.plugin..... ANTES DEL mongoose.model PARA PODER PASARLE YA TODO CIFRADO el userSChema.

const User = mongoose.model("User", userSchema);


app.post("/register", function(req, res){
	const newUser = new User ({
		email: req.body.username,
		password: req.body.password
	});
	newUser.save(function(err){
		if (err){
			console.log(err);
		} else {
			res.render("secrets");
		}
	});
});

app.post("/login", function(req, res){
	const username = req.body.username;
	const password = req.body.password;
	User.findOne({email: username}, function(err, foundUser){
		if (err){
			console.log(err);
		} else {
			if (foundUser) {
				if(foundUser.password === password) {
					res.render("secrets");
				} else {
					res.send("contraseña invalida");
				}
			}
		}
	});
});




app.listen(3000, function(){
	console.log("Server started on port 3000...");
});