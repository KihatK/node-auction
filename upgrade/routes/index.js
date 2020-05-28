var express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const schedule = require('node-schedule');

const db = require('../models');
const { isLoggedIn, isNotLoggedIn } = require('./middlewares');

var router = express.Router();

router.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

router.get('/', async (req, res, next) => {
  try {
    const goods = await db.Good.findAll({ where: { soldId: null } });
    res.render('main', {
      title: 'NodeAuction',
      goods,
      loginError: req.flash('loginError'),
    });
  }
  catch (e) {
    console.error(e);
    next(e);
  }
});

router.get('/join', isNotLoggedIn, (req, res) => {
  res.render('join', {
    title: '회원가입 - NodeAuction',
    joinError: req.flash('joinError'),
  });
});

router.get('/good', isLoggedIn, (req, res) => {
  res.render('good', { title: '상품 등록 - NodeAuction' });
});

fs.readdir('uploads', (error) => {
  if (error) {
    console.error('uploads 폴더가 없으니 uplaods 폴더를 만듭니다.');
    fs.mkdirSync('uploads');
  }
});

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, 'uploads');
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname);
      const basename = path.basename(file.originalname, ext);
      cb(null, basename + Date.now() + ext);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});
router.post('/good', isLoggedIn, upload.single('img'), async (req, res, next) => {
  try {
    const good = await db.Good.create({
      ownerId: req.user.id,
      name: req.body.name,
      img: req.file.filename,
      price: req.body.price,
      end: req.body.end,
    });
    const end = new Date();
    end.setHours(end.getHours() + good.end);
    schedule.scheduleJob(end, async () => {
      const success = await db.Auction.findOne({
        where: { goodId: good.id },
        order: [['bid', 'DESC']],
      });
      if (success) {
        await db.Good.update({ soldId: success.userId }, { where: { id: good.id } });
        await db.User.update({
          money: db.sequelize.literal(`money - ${success.bid}`),
        }, {
          where: { id: success.userId },
        });
      }
      else {
        await db.Good.update({ soldId: good.ownerId }, { where: { id: good.id } });
      }
    });
    res.redirect('/');
  }
  catch (e) {
    console.error(e);
    next(e);
  }
});
router.get('/good/:id', isLoggedIn, async (req, res, next) => {
  try {
    const [good, auction] = await Promise.all([
      db.Good.findOne({
        where: { id: req.params.id },
        include: [{
          model: db.User,
          as: 'owner',
        }],
      }),
      db.Auction.findAll({
        where: { goodId: req.params.id },
        include: { model: db.User },
        order: [['bid', 'ASC']],
      }),
    ]);
    res.render('auction', {
      title: `${good.name} - NodeAuction`,
      good,
      auction,
      auctionError: req.flash('auctionError'),
    });
  }
  catch (e) {
    console.error(e);
    next(e);
  }
});

router.post('/good/:id/bid', isLoggedIn, async (req, res, next) => {
  try {
    const good = await db.Good.findOne({
      where: { id: req.params.id },
      include: { model: db.Auction },
      order: [[{ model: db.Auction }, 'bid', 'DESC']],
    });
    if (good.ownerId === req.userid) {
      return res.status(403).send('경매 등록자는 입찰할 수 없습니다.');
    }
    if (good.price > req.body.bid) {
      return res.status(403).send('시작 가격보다 높게 입찰해야 합니다.');
    }
    if (new Date() > new Date(good.createdAt).valueOf() + (24 * 60 * 60 * 1000)) {
      return res.status(403).send('경매가 이미 종료되었습니다.');
    }
    if (good.auctions[0] && good.auctions[0].bid >= req.body.bid) {
      return res.status(403).send('이전 입찰가보다 높아야 합니다.');
    }
    const result = await db.Auction.create({
      bid: req.body.bid,
      msg: req.body.msg,
      userId: req.user.id,
      goodId: req.params.id,
    });
    req.app.get('io').to(req.params.id).emit('bid', {
      bid: result.bid,
      msg: result.msg,
      nick: req.user.nick,
    });
    return res.send('ok');
  }
  catch (e) {
    console.error(e);
    next(e);
  }
});

router.get('/list', isLoggedIn, async (req, res, next) => {
  try {
    const goods = await db.Good.findAll({
      where: { soldId: req.user.id },
      include: { model: db.Auction },
      order: [[{ model: db.Auction }, 'bid', 'DESC']],
    });
    return res.render('list', { title: '낙찰 목록 - NodeAuction', goods });
  }
  catch (e) {
    console.error(e);
    next(e);
  }
});

module.exports = router;
