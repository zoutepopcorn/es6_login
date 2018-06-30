import express from 'express';
const bodyParser = require('body-parser')
const app = express()
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
app.use(cookieParser())
app.use(bodyParser.urlencoded({
  extended: false
}))
app.use(bodyParser.json())

const PORT = 9000;
const SECRET = "appelsap";

// --> Classes
class Db {
  constructor() {}
  getHash(password) {
    return password + "Hash1234"; // TODO incl hash lib
  }
  addUser(user) {
    user.password = this.getHash(user.password)
  }
  getUser(username) {

  }
  removeUser(username) {

  }
  generateToken(username) {
    return jwt.sign({
      username
    }, SECRET, {
      expiresIn: '1000000000h'
    });
  }
  login(username, password) {
    const user = this.getUser("johny")
    let isLogin = false;
    if (user) {
      isLogin = this.getHash(password) == user.password;
    }
    return isLogin;
  }
}
class LiveDb extends Db {
  constructor() {
    super();
    this.users = new Set();
    this.tokens = new Set();
    this.registerTokens = new Set();
  }
  addUser(user) {
    super.addUser(user);
    // add it to the set
    this.users.add(user);
  }
  getUser(username = "") {
    let user;
    console.log(username);
    for (let item of this.users) {
      if (username == item.username) {
        user = item;
      }
    }
    return user;
  }
  removeUser(username) {
    return this.users.delete(this.getUser(username));
  }
  addToken(token) {
    this.tokens.add(token)
  }
  hasToken(token) {
    return this.tokens.has(token)
  }
  addRegisterToken(token) {
    this.registerTokens.add(token)
  }
  hasRegisterToken(token) {
    return this.registerTokens.has(token)
  }
}
class User {
  constructor(username, password) {
    this.username = username;
    this.password = password;
  }

  getJson() {
    return this;
  }

  static create(username, password) {
    let user;
    if (username && password && username.length > 4 && password.length > 4) {
      // TODO: hash password
      user = new User(username, password)
    } else {
      user = null;
    }
    return user;
  }
}

// --> Instance
const db = new LiveDb();

// --> Functions
const register = (username, password) => {
  let user;
  if (!db.getUser(username)) {
    user = User.create(username, password);
    db.addUser(user);
  }
  return user;
}

// --> Test
const testAdd = () => {
  if (register('johny', 'password')) {
    console.log('added johny');
  } else {
    console.log('oh no, failed to add johny');
  }
}
const testRem = () => {
  if (db.removeUser('johny')) {
    console.log('yes removed johny');
  } else {
    console.log('oh no johny is not removed');
  }
}
const testLogin = () => {
  const log = db.login("johny", "password");
  console.log(`login: ${log}`);
}
const test = () => {
  testAdd(); // Trying to register johny
  // testRem(); // Remove johny
  // testAdd(); // 2nd time it failed..
  testLogin();
}
test();

// Express part
const checkLogin = (req, res, next) => {
  console.log(req.cookies)
  if (db.hasToken(req.cookies.token)) {
    next();
  } else {
    res.json({
      "status": "fail"
    })
  }
}

app.post('/post/:post', function(req, res) {
  let RESPONSE = {
    "status": "false"
  };
  if (req.params.post == "login") {
    console.log(req.body);
    const LOGIN = db.login(req.body.username, req.body.password)
    console.log(`>> login ${LOGIN}`)
    if (LOGIN) {
      const TOKEN = db.generateToken(req.body.username)
      db.addToken(TOKEN)
      RESPONSE = {
        "status": "ok",
        "token": TOKEN
      }
    }
  }
  if (req.params.post == "register") {
    const REG_TOKEN = req.body.token
    console.log(register)
    console.log(REG_TOKEN);
    if (db.hasRegisterToken(REG_TOKEN)) {
      if (!db.getUser(req.body.username)) {
        db.addUser({
          username: req.body.username,
          password: req.body.password
        })
        const TOKEN = db.generateToken(req.body.username)
        db.addToken(TOKEN)
        RESPONSE = {
          "status": "ok",
          "token": TOKEN
        }
      }
    }
  }
  res.json(RESPONSE)
})

app.use('/', express.static('public'))

app.use('/token', checkLogin, (req, res) => {
  res.json({
    "status": "ok"
  });
})

app.use('/gettoken', (req, res) => {
  const TOKEN = Math.random().toString();
  db.addRegisterToken(TOKEN)
  res.end(`<a href="/register.html?token=${TOKEN}">Nieuwe token</a>`);
})

app.use('/private', checkLogin, express.static('private'))

app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`))