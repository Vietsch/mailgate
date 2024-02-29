const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require("helmet");
const creds = require('./config');
const fs = require('fs');
const path = require('path');

// Pfad zur Log-Datei definieren
const logFilePath = path.join(__dirname, 'app.log');

// log file function
function writeLog(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;

    console.log(message);

    // Asynchrones Schreiben in die Log-Datei
    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) {
            console.error('Fehler beim Schreiben in die Log-Datei:', err);
        }
    });
}

// delete log file
fs.unlink(logFilePath, (err) => {
  if (err && err.code !== 'ENOENT') {
      // ENOENT bedeutet, dass die Datei nicht existiert und ist in diesem Fall in Ordnung
      console.error('Error deleting log file:', err);
  } else {
      console.log('Log file has been deleted');
  }
});

const app = express();
app.use(
  express.urlencoded({
    extended: true
  })
);

const corsOptions = {
  origin: function (origin, callback) {
    // Erlaubte Ursprünge ohne Protokoll
    const allowedOrigins = ['triggerfish.dev', 'localhost'];

    // Überprüfen, ob der Ursprung der Anfrage erlaubt ist
    if (!origin) {
      // Erlaube Server-zu-Server-Anfragen oder nicht browserbasierte Anfragen
      callback(null, true);
    } else {
      // URL-Objekt aus dem Ursprung erstellen, um die Hostname-Überprüfung zu vereinfachen
      const originUrl = new URL(origin);
      if (allowedOrigins.includes(originUrl.hostname)) {
        // Ursprung ist erlaubt
        callback(null, true);
      } else {
        // Ursprung ist nicht erlaubt
        callback(new Error('CORS nicht erlaubt für diesen Ursprung'), false);
      }
    }
  }
};

app.use(cors(corsOptions));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(helmet());
app.use(express.json());

var transport = {
    host: 'mail.triggerfish.dev', // Don’t forget to replace with the SMTP host of your provider
    port: 465,
    auth: {
    user: creds.USER,
    pass: creds.PASS
  },
  tls: {rejectUnauthorized: true},
  debug:true
}

var transporter = nodemailer.createTransport(transport)

transporter.verify((error, success) => {
  if (error) {
    writeLog(error);
  } else {
    writeLog('Server is ready to take messages');
  }
});

app.post('/send',function(req,res){

  if(req.get('origin') != "www.triggerfish.dev" && req.get('origin') != "triggerfish.dev" && (!req.body.authToken || req.body.authToken != creds.TOKEN))
  {
    res.json({
		status: 'failure',
		message: 'Not authorized'
	});
    return next();
  }

  var name = req.body.name;
  var email = req.body.email;
  var subject = req.body.subject ? ': ' + req.body.subject : '';
  var message = req.body.message;
  var lang = req.body.lang;
  var successmessage, successsubject;
  
//  writeLog('lang: ' + lang);
  

    subject = 'Message From TriggerFish Website: ' + subject;
    successmessage = 'Thank you for contacting us!\n\nDetails';
    successsubject = 'Your submission to triggerfish.dev was successful';
    messagesent = 'Yout message has been sent';

  var mail = {
    from: name + '<' + email +'>',
    to: 'support@triggerfish.dev',  // Change to email address that you want to receive messages on
    subject: subject,
    text: message
  }

  transporter.sendMail(mail, (err, data) => {
    if (err) {
      res.json({
        status: 'failure'
      })
    } else {
      res.json({
       status: 'success',
       lang: lang
      });
      transporter.sendMail({
          from: "support@triggerfish.dev",
          to: email,
          subject: "Your submission to triggerfish.dev was successful",
          text: successmessage + `\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
      }, function(error, info){
        if(error) {
            writeLog(error);
			res.json({
				status: 'error',
				message: info.response,
    	       lang: lang
			});
        } else {
            writeLog( messagesent + ': ' + info.response);
			res.json({
				status: 'failure',
				message: info.response,
    	        lang: lang
			});
        }
      });
    }
  })
});


/*
router.post('/send', (req, res, next) => {

  var name = req.body.name;
  var email = req.body.email;
  var message = req.body.message;
  var content = `name: ${name} \n email: ${email} \n message: ${message}`;
  

  res.send('Hi');

  var mail = {
    from: name,
    to: 'support@launchradar.io',  // Change to email address that you want to receive messages on
    subject: 'New Message from Contact Form',
    text: content
  }

  transporter.sendMail(mail, (err, data) => {
    if (err) {
      res.json({
        status: 'fail'
      })
    } else {
      res.json({
       status: 'success'
      });
      transporter.sendMail({
          from: "creds.USER",
          to: email,
          subject: "Submission was successful",
          text: `Thank you for contacting us!\n\nForm details\nName: ${name}\n Email: ${email}\n Message: ${message}`
      }, function(error, info){
        if(error) {
            writeLog(error);
        } else {
            writeLog('Message sent: ' + info.response);
        }
      });
    }
  })
});
  */

app.use('/', router);

app.get('/test',function(req,res){
    res.send('Test is running');
});

app.get('*',function(req,res){
    res.send('Welcome To Triggerfish Mailgate :-)');
});

app.post('*',function(req,res){
    res.send('Welcome To Triggerfish Mailgate :-)');
});

writeLog(new Date() + ':\t' + 'Mailgate started successfully.');
// writeLog(new Date() + ':\t' + 'The mail gateway is listening at port 3002.');
writeLog('----------------------------------------------------------------');

app.listen();
// app.listen(3002, '127.0.0.1');
