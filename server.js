require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
//Import mongoose then connect to MongoDB with URI store in secret
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });
//Create Schema then create Model
const urlSchema = new mongoose.Schema({url: String, short_url: Number});
const URL = mongoose.model('URL', urlSchema);
//Import body-paser then add middleware
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
// Basic Configuration
const port = process.env.PORT || 3000;
const dns = require('dns');

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.post('/api/shorturl', (req, res) => {
  //Get the main hostname by remove http|https:// and split any '/' in posted url
  const regex = /^https?:\/\//;
  let domain = req.body.url.replace(regex, '');
  let dom = domain.split('/');
  //Just lookup dns for the main hostname
  dns.lookup(dom[0], (err) => {
    if (err) {
      console.log(err);
      res.json({ error: 'invalid url' });
    }
    else {
      //Find if the posted url already in database
      URL.findOne({url: req.body.url}, (err, data) => {
        if (err) return console.log(err);
        //If not in database
        if (data == null) {
          //then get the biggest number in short_url field
          URL.find({}).sort('-short_url').limit(1).exec((err, doc) => {
            if (err) return console.log(err);
            //if it is the first then short_url will be 1, save data and return json
            if (doc.length == 0) {
              let short_url = 1;
              let url = new URL({url: req.body.url, short_url: short_url});
              url.save((err, data) => {
                if (err) return console.log(err);
                res.json({original_url: data.url, short_url: data.short_url});
              });
            }
            //else the biggest plus 1 for the new url, save data and return json
            else {
              let short_url = doc[0].short_url + 1;
              let url = new URL({url: req.body.url, short_url: short_url});
              url.save((err, data) => {
                if (err) return console.log(err);
                res.json({original_url: data.url, short_url: data.short_url});
              });
            }
          });
        }
        //Return the json with data in database if already have
        else {
          res.json({original_url: data.url, short_url: data.short_url});
        }
      });
    }
  });
  /* //***I use these to remove the test url that I used
  URL.deleteMany({url: req.body.url}, (err, docs) => {
    if (err) return console.log(err);
    console.log('done');
  });
  URL.find({}).exec((err, docs) => {
    if (err) return console.log(err);
    console.log(docs);
  });
  */
});

app.get('/api/shorturl/:short_url', (req, res) => {
  URL.findOne({short_url: req.params.short_url}, (err, doc) => {
    if (err) return console.log(err);
    if (doc == null) {
      res.send(`No url correspond to this short url: ${req.params.short_url}`);
    }
    else {
      res.redirect(doc.url);
    }
  });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
