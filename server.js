const express = require("express"); //Framework
const logger = require("morgan"); //Logger
const mongoose = require("mongoose"); //Tool for database connectivity
const exphbs = require('express-handlebars'); //Tool for front end website develop
const axios = require("axios");  // Our scraping tool: Axios is a promised-based http library, similar to jQuery's Ajax method. It works on the client and on the server
const cheerio = require("cheerio"); //Our scraping tool: Targets websites and pulls data. 


// Require all models
const db = require("./models"); //Require Articles, Index and Notes models located in the Models folder. 

// Configure Port
const PORT = process.env.PORT || 3000; //This is the port that will be used to navigate to our site. 

// Initialize Express
var app = express();

// ===============================================================================================================
// CONFIGURE MIDDLEWARE

// Use morgan logger for logging requests
app.use(logger("dev"));

// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Make public a static folder
// app.use(express.static("public"));
app.use("/public", express.static("public"));

// Initialized Handlebars
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

// If deployed, use the deployed database. Otherwise use the local mongoHeadlines database
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// ===================================================================================================================

// ROUTES

// A GET route for the Index page.
app.get('/', function (req, res) {
  res.render('index'); //Searches for the home page in the views folder.
});

app.get('/clear', function (req, res) {
  res.render('clear');
});

// A GET route for scraping the echoJS website
app.get("/scrape", function (req, res) {


  // First, we grab the body of the html with axios
  axios.get("https://www.mlb.com/mets").then(function (response) {


    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every contentIem within an article tag, and do the following:
    $("li.p-headline-stack__headline").each(function (i, element) {


      // Save an empty result object
      var result = {};


      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
        .find("a")
        .text();
      result.link = $(this)
        .find("a")
        .attr("href");
      console.log("Result", result);



      //Takes the data that was scrapped and creates a record on the database (Mongo)
      if (result.title && result.link) {

        // Create a new Article using the `result` object built from scraping
        db.Article.create(result)
          .then(function (dbArticle) {
            // View the added result in the console
            console.log(dbArticle);
          })
          .catch(function (err) {
            // If an error occurred, log it
            console.log(err);
          });

      }
    });

    // Send a message to the client
    console.log("Scrape Complete");
    res.render('index'); //Searches for the home page in the views folder.
  });
});

// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function (dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    .then(function (dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function (dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function (dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
  console.log("Click on this URL: http://localhost:" + PORT)
});
