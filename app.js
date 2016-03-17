var express = require('express');
var MongoClient = require('mongodb').MongoClient;
var engines = require('jade');
var assert= require('assert');
var bodyParser = require('body-parser');

app = express();

app.set('view engine', 'jade');
app.set('views', __dirname + '/views');

//bodyParser needed to enable routes to extract request body, used in POST requests
app.use(bodyParser.urlencoded({ extended : true }));

app.use(express.static('public'))

//Attempt to connect to MongoDB.
MongoClient.connect('mongodb://localhost:27017/garden', function(err, db){

  assert.equal(null, err);  //This will crash the app if there is an error.

  console.log('Connected to MongoDB');

  //routes - this is for the home page
  app.get('/', function(req, res){
    // Make query for unique colors, to populate the dropdown box
    db.collection('flowers').distinct('color', function(err, colorDocs) {
      if (err) { return res.sendStatus(500); }

      //If selecting a color and clicked the colorButton, this has a value
      if (req.query.colorButton) {
        var color = req.query.colorDropDown;    //What color was selected?
        //Get all of the flowers of the desired color.
        db.collection('flowers').find({'color': color}).toArray(function(err, flowerDocs) {
          if (err) { return res.sendStatus(500); }
          //Optional - turn 'red' into 'Red' for display
          var displayColor = color.slice(0,1).toUpperCase() + color.slice(1, color.length)
          //return res.render statement inside a callback to prevent further processing of response
          return res.render('allflowers',
             { 'flowers' : flowerDocs, 'currentColor' : displayColor, 'flowerColors' : colorDocs } );
        });
      }

    //If visiting the home page, or clicking the clear button, then fetch all of the flowers
      else {
        db.collection('flowers').find().toArray(function(err, flowerDocs){
          if (err) { return res.sendStatus(500); }
          return res.render('allFlowers', { 'flowers' : flowerDocs, 'flowerColors' : colorDocs } );
        });
      }
    });
  });


  app.get('/details/:flower', function(req, res) {
      var flowerName = req.params.flower;
      //Find document with this flower's name. Only expecting one result so can
      //use limit(1) function to minimise work for DB
      db.collection('flowers').find( {'name' : flowerName } ).limit(1).toArray(function(err, docs) {
        if (err) { console.log(err); return res.sendStatus(500); }
        //If other than 1 result, no results. Send 404 not found
        if (docs.length != 1) { console.log(docs);  return res.sendStatus(404); }
        return res.render('flowerDetails', docs[0]);
      });

  });


  app.post("/addNewFlower", function(req, res) {
     db.collection("flowers").insert(req.body, function(err, result){
       if (err) { return res.sendStatus(500); }
       return res.redirect('/'); //todo send success/fail back to client.
     });
  });

  app.put("/updateColor", function(req, res) {
    //Filter is the flower with the given name
    console.log(req.body);
    var filter = { "name" : req.body.name }
    var update = { $set : req.body } ;
    //By default, findOneAndUpdate replaces the record with the update.
    //So, here, need to use $set parameter to specify we want to update only the fields given.
    db.collection("flowers").findOneAndUpdate(filter, update, function(err, result) {
      if (err) {
        console.log("Error when updating color " + err);
        return res.sendStatus(500);
      } else {
        console.log("Updated - result: " + result)
        return res.send({"color" : req.body.color});
        //Send the updated color back. AJAX is expecting a response.
      }
    });
  });

  
  //All other requests, return 404 not found
  app.use(function(req, res){
    res.sendStatus(404);
  });

  //And start the server
  var server = app.listen(3050, function(){
    var port = server.address().port;
    console.log('Server listening on port '+ port);
  });

});  //End of MongoClient callback
