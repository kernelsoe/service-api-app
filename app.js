require('dotenv').config()

var createError = require('http-errors');
var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');

const publicRouter = require('./routes/public');
const cmdRouter = require('./routes/server')
const serverRouter = require('./routes/sh')

var app = express();

// 🔥 $change origin 🔥
const corsOptions = {
  origin: 'https://postel-asia.web.app',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/', publicRouter)
app.use('/sh', serverRouter)
app.use('/cmd', cmdRouter)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json({
    status: 'error'
  });
});

module.exports = app;
