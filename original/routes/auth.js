const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');

const db = require('../models');
const { isLoggedIn, isNotLoggedIn } = require('./middlewares');

const router = express.Router();

router.post('/join', isNotLoggedIn, async (req, res, next) => {
    try {
        const exUser = await db.User.findOne({ where: { email: req.body.email } });
        if (exUser) {
            req.flash('이미 가입된 이메일입니다.');
            return res.redirect('/');
        }
        const hash = await bcrypt.hash(req.body.password, 12);
        await db.User.create({
            email: req.body.email,
            nick: req.body.nick,
            password: hash,
            money: req.body.money,
        });
        return res.redirect('/');
    }
    catch (e) {
        console.error(e);
        next(e);
    }
});

router.post('/login', isNotLoggedIn, async (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error(err);
            return next(err);
        }
        if (info) {
            req.flash('loginError', info.message);
            return res.redirect('/');
        }
        return req.login(user, (loginError) => {
            if (loginError) {
                console.error(loginError);
                return next(loginError);
            }
            return res.redirect('/');
        });
    })(req, res, next);
});

router.get('/logout', isLoggedIn, (req, res) => {
    req.logout();
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;