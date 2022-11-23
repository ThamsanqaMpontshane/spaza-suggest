import express from "express";
import bodyParser from "body-parser";
import exphbs from "express-handlebars";
import SpazaSuggest from "./spaza-suggest.js";
import flash from "express-flash";
import session from "express-session";
import pgPromise from 'pg-promise';
const app = express();
const pgp = pgPromise({});

const connectionString = process.env.DATABASE_URL || 'postgresql://codex:pg123@localhost:5432/spaza_suggest';

const config = {
    connectionString
}

if(process.env.NODE_ENV === "production"){
    config.ssl = {
        rejectUnauthorized: false
    }
}

const db = pgp(config);
const spaza = SpazaSuggest(db);

app.use(session({
    secret: "admin",
    resave: false,
    saveUninitialized: true,
    cookie: {
        sameSite: "strict"
    }
}));


app.engine("handlebars", exphbs.engine({
    defaultLayout: "main"
}));
app.set("view engine", "handlebars");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(express.static("public"));
app.use(flash());

app.get("/", async function (req, res) {
    res.render("index");
});
app.get("/register", async function (req, res) {
    res.render("register");
});
app.post("/register", async function (req, res) {
     const theName = req.body.username;
     const toUpper = theName.toUpperCase();
     const user = await spaza.getClient(toUpper);
    if(user.length === 0){
        await spaza.registerClient(toUpper);
        const shortId = await spaza.getClient(toUpper);
        req.flash('success', 'You have successfully registered');
        req.flash('theId', shortId[0].code);
        res.redirect("/register");
    }else{
        req.flash('error', 'User already exists');
        res.redirect("/register");
    }
});
app.get("/login", async function (req, res) {
    res.render("login");
});
app.post("/login", async function (req, res) {
    const theCode = req.body.code;
    const user = await spaza.clientLogin(theCode);
    if(user){
        req.session.user = user.code;
        // res.redirect("/suggest");
        res.redirect("/suggest/" + user.username);
    }else{
        req.flash('error', 'Invalid code');
        res.redirect("/login");
    }
});
app.get("/suggest/:name", async function (req, res) {
    const theName = req.params.name;
    const toUpper = theName.toUpperCase();
    const user = await spaza.getClient(toUpper);
    const userSuggestions = await spaza.suggestions(user[0].id);
    console.log(userSuggestions);
    const myAreas = await spaza.areas();
    res.render("suggest", {
        areas: myAreas,
        suggestions: userSuggestions
    });
});
app.post("/suggest/:name", async function (req, res) {
    const theName = req.params.name;
    const toUpper = theName.toUpperCase();
    const user = await spaza.getClient(toUpper);
    const theArea = req.body.area;
    const area = await spaza.findAreaByName(theArea);
    const theSuggestion = req.body.suggestion;
    const theUserId = user[0].id;
    const theAreaId = area.id;
    await spaza.suggestProduct(theAreaId, theUserId, theSuggestion);
    req.flash('success', 'You have successfully suggested a product');
    res.redirect(`/suggest/${toUpper}`);
});
app.get("/registerspaza", async function (req, res) {
    const myAreas = await spaza.areas();
    res.render("registerspaza", {
        areas: myAreas
    });
});
app.post("/registerspaza", async function (req, res) {
    const shopName = req.body.shopname;
    const toUpper = shopName.toUpperCase();
    const shopLocation = req.body.shoplocation;
    const theShop = await spaza.findAreaByName(shopLocation);
    // console.log(theShop);
    const theShopId = theShop.id;
    await spaza.registerSpaza(toUpper, theShopId);
    const theSpaza = await spaza.getSpaza(toUpper);
    req.flash('success', 'You have successfully registered a spaza');
    req.flash('theId', theSpaza[0].code);
    res.redirect("/registerspaza");
});
app.get("/loginspaza", async function (req, res) {
    res.render("loginspaza");
});
app.post("/loginspaza", async function (req, res) {
    const theCode = req.body.code;
    const theSpazaLogin = await spaza.spazaLogin(theCode);
    // console.log(spaza);
    if(theSpazaLogin){
        req.session.spaza = theSpazaLogin.code;
        const theSpazaName = theSpazaLogin.shop_name;
        console.log(theSpazaName);
        res.redirect("/spaza/" + theSpazaName);
    }else{
        req.flash('error', 'Invalid code');
        res.redirect("/loginspaza");
    }
});
app.get("/spaza/:name", async function (req, res) {
    const myAreaName = req.params.name;
    const getTheArea = await spaza.getSpaza(myAreaName);
    const theAreaId = getTheArea[0].area_id;
    const theAreaId2 = getTheArea[0].id;
    const theAreaName = await spaza.getAreaName(theAreaId);
    const getTheSuggestions = await spaza.suggestionsForArea(theAreaId);
    const getTheSuggestions2 = await spaza.acceptedSuggestions(theAreaId2);
    res.render("spaza", {
        suggestions: getTheSuggestions,
        suggestions2: getTheSuggestions2,
        spaza: theAreaName.area_name
    });
});
app.post("/spaza/:name", async function (req, res) {
    const myAreaName = req.params.name;
    const getTheArea = await spaza.getSpaza(myAreaName);
    const theAreaId = getTheArea[0].area_id;
    const theAreaId2 = getTheArea[0].id;
    const theAreaName = await spaza.getAreaName(theAreaId);
    const theSuggestion = req.body.suggestion;
    const theSuggestionId = await spaza.getTheId(theSuggestion);
    await spaza.acceptSuggestion(theSuggestionId.id, theAreaId2);
    req.flash('success', 'You have successfully accepted a product');
    res.redirect(`/spaza/${myAreaName}`);
});


app.listen(process.env.PORT || 3_666, () => {
    console.log("Server is running on port 3_666");
});

