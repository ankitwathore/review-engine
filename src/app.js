import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import session from 'express-session';

import indexRouter from './routes/index.js';
import usersRouter from './routes/users.js';
import reviewsRouter from './routes/reviews.js';
import shopifyAuthRouter from './auth/shopifyAuth.js';
import judgemeAuthRouter from './auth/judgemeAuth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/auth', shopifyAuthRouter);
app.use('/auth', judgemeAuthRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  if (req.app.get('env') === 'development') {
    res.json({
      message: err.message,
      error: err
    });
  } else {
    res.json({
      message: err.message,
      error: {}
    });
  }
});

export default app;
