var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session');
const dotenv = require('dotenv');
const passport = require('passport');
const flash = require('connect-flash');

const db = require('./models');
const passportConfig = require('./passport');
var indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const sse = require('./sse');
const socket = require('./socket');
const checkAuction = require('./checkAuction');

var app = express();
dotenv.config();
passportConfig();
db.sequelize.sync();
checkAuction();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('port', process.env.PORT || '8010');

app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/img', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: process.env.COOKIE_SECRET,
  cookie: {
    httpOnly: true,
    secure: false,
  },
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use('/', indexRouter);
app.use('/auth', authRouter);

app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
})

app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

const server = app.listen(app.get('port'), () => {
  console.log(app.get('port'), '번 포트에서 대기중');
});

socket(server, app);
sse(server);