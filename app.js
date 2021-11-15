var express = require("express"),
    mongoose = require("mongoose"),
    flash = require("connect-flash"),
    passport = require("passport"),
    bodyParser = require("body-parser"),
    app = express(),
    LocalStrategy = require("passport-local"),
    passportLocalMongoose = require("passport-local-mongoose"),
    multer = require("multer"),
    User = require("./models/user")

var middlewareObj = {}

const fs = require('fs');
const { promisify } = require('util');

const methodOverride = require('method-override');
const unlinkAsync = promisify(fs.unlink);

const path = require("path");
app.use(flash());

app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));
app.set("view engine", "ejs");
app.use(require("express-session")({
	secret: "This is a secret Page!",
	resave: false,
	saveUninitialized: false
}));

app.use(bodyParser.urlencoded({extended: true}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

mongoose.connect("mongodb://localhost:27017/new_db", {
	useNewUrlParser: true,
	useCreateIndex: true,
	useUnifiedTopology: true
});

//==========
//For Using Flash
//==========

app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});



// mongoose.connect("mongodb+srv://sadiq:sadiq123@cluster0.k7bak.mongodb.net/new_db?retryWrites=true&w=majority", {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
// });

//==========
//File Schema
//==========

var fileSchema = mongoose.Schema({
	user: String,
	image: String,
	description: String
});

var File = mongoose.model("File", fileSchema);

var storage = multer.diskStorage({
	destination: function(req, res, cb){
		cb(null, './public/uploads/')
	},
	filename: function(req, file, cb){
		cb(null, Date.now() + file.originalname)
	}
});

var upload = multer({storage: storage });

//==========
//Upload Routes
//==========

app.get("/posts/new", isloggedIn, function(req, res){
	res.render("newpost");
});

app.post("/upload", isloggedIn, upload.single('file'), function(req, res, next){
    var fileinfo = req.file.filename;
    var name = req.user.username;
    var description = req.body.description;
    var newUser = {user: name, image: fileinfo, description: description};
    File.create(newUser, function(err, newlyCreated){
        if(err){
            console.log(err);
            res.redirect("/posts/new");
        } else {
            console.log(newlyCreated);
            res.redirect("/show");
        }
    });
});

app.post("/delete/:id", upload.single("file"), async function(req, res){
	const file = await File.findById(req.params.id);
	File.findByIdAndDelete(req.params.id, async function(err){
		if(err){
			console.log(err);
		} else {
			fs.unlink("public/uploads/"+file.image, (err) => {
				if(err){
					console.log("failed to delete local image: ");
					console.log(err);
				} else {
					res.redirect("back");
				}
			});
		}
	});
});

app.get("/show", function(req, res){
	var currentUser = req.user;
	File.find({}, function(err, allFiles){
		if(err){
			console.log(err);
		} else {
			res.render("show", {files: allFiles, currentUser: currentUser});
		}
	});
});


//==========
//Authentication Routes
//==========


//==========
//Register Route
//==========

app.get("/register", function(req, res){
	res.render("register");
});

app.post("/register", function(req, res){

    var newUser = new User(
    {
    	username: req.body.username,
    	firstName: req.body.firstName,
    	lastName: req.body.lastName,
    	email: req.body.email
    });

	User.register(newUser, req.body.password, function(err, user){
		if(err){
			req.flash("error", err.message);
			console.log(err.message);
			res.redirect("/register");
		} else {
			passport.authenticate("local")(req, res, function(){
				req.flash("success", "Welcome to the show page  " + user.username);
				res.redirect("/");
			});
		}
	});
});

//==========
//Login Route
//==========

app.get("/login", function(req, res){
	res.render("login");
});

app.post("/login", passport.authenticate("local", {
	successRedirect: "/show",
	failureRedirect: "/register"

}), function(req, res){
	console.log(req.user.username);
});

app.get("/user/:id", function(req, res){
	User.findById(req.params.id, function(err, foundUser){
		if(err){
			console.log(err);
		} else {

			File.find({}, function(err, allFiles){
		        if(err){
			        console.log(err);
		        } else {
			        res.render("showuser", {files: allFiles, currentUser: foundUser});
		        }
	        });
		}
	});
});

app.get("/logout", function(req, res){
	req.logout();
	req.flash("success", "logged you out!");
	res.redirect("/");
});

//==========
//Routes
//==========

app.get("/", function(req, res){
	var currentUser = req.user;
	File.find({}, function(err, allFiles){
		if(err){
			console.log(err);
		} else {
			res.render("home", {currentUser: currentUser, files: allFiles});
		}
	});
});

//==========
//MiddleWare
//==========

function isloggedIn(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}
	req.flash("error", "you need to be logged in to do that!");
	res.redirect("/login");
}

app.listen("3000", function(){
	console.log("SERVER HAS STARTED.....");
});
