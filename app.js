const express = require("express");
const request = require('request');
const mongoose = require("mongoose");
require("dotenv").config();
const app = express();

app.use(express.static("public"));
app.set("view engine", 'ejs');

const DB_URL = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.porxc.mongodb.net/followersDB?retryWrites=true&w=majority`;

mongoose.connect(DB_URL, {
    useNewUrlParser: true
});

const followerSchema = new mongoose.Schema({
    array: {
        type: Array,
        required: true
    }
});

const PrFollower = mongoose.model("PrFollower", followerSchema),
    GlFollow = mongoose.model("GlFollow", followerSchema),
    GlUnFollow = mongoose.model("GlUnFollow", followerSchema),
    FoDetail = mongoose.model("FoDetail", followerSchema),
    UnFoDetail = mongoose.model("UnFoDetail", followerSchema);

function errFn(err, docs) {
    err ? console.log(err) : console.log("Updated Docs : ", docs);
}

var optns = {
    upsert: true
};

var prevFollowers = [],
    globalFollows = [],
    globalUnFollows = [],
    followersDetails = [],
    unFollowersDetails = [];

PrFollower.find({}).then(d => {
    prevFollowers = d.length !== 0 ? d[0].array : [];
});

GlFollow.find({}).then(d => {
    globalFollows = d.length !== 0 ? d[0].array : [];
});

GlUnFollow.find({}).then(d => {
    globalUnFollows = d.length !== 0 ? d[0].array : [];
});

FoDetail.find({}).then(d => {
    followersDetails = d.length !== 0 ? d[0].array : [];
});

UnFoDetail.find({}).then(d => {
    unFollowersDetails = d.length !== 0 ? d[0].array : [];
});

function getUserDetails(idArray, flag) {
    if (!Array.isArray(idArray) || idArray.length === 0)
        return [];

    var userIds = idArray.toString();
    var options = {
        'method': 'GET',
        'url': `${process.env.ID_URL}${userIds}`,
        'headers': {
            'Authorization': `Bearer ${process.env.BEARER}`,
            'Cookie': `guest_id=${process.env.GUEST_ID}`
        }
    };
    request(options, function (error, response) {
        if (error)
            throw new Error(error);
        var results = JSON.parse(response.body).data;

        if (flag == 1) { //followers
            followersDetails = results;
        }
        if (flag == 2) { //unfollowers
            unFollowersDetails = results;
        }
    });
}

function diffFollowers(first, second) { //pc = F || cp = U
    if (!Array.isArray(first) || !Array.isArray(second) || first.length === 0 || second.length === 0)
        return [];

    return second.filter(x => !first.includes(x));
}

function getData() {
    var options = {
        'method': 'GET',
        'url': process.env.URL,
        'headers': {
            'Authorization': `Bearer ${process.env.BEARER}`,
            'Cookie': `guest_id=${process.env.GUEST_ID}`
        }
    };
    request(options, function (error, response) {
        if (error)
            throw new Error(error);
        var followers = [];
        var followers0 = [];
        followers0 = JSON.parse(response.body).data;
        if (!Array.isArray(followers0) || followers0.length === 0) {
            console.log(`Twitter Errors on ::  ` + response.body);
            return;
        }

        followers = followers0.map((element) => element.id);

        var newFollower = []; //New Followers
        newFollower = diffFollowers(prevFollowers, followers);
        var unFollower = []; //unFollower
        unFollower = diffFollowers(followers, prevFollowers);

        if (newFollower.length !== 0) {
            globalFollows.push(...newFollower);
            getUserDetails(globalFollows, 1);
        }
        if (unFollower.length !== 0) {
            globalUnFollows.push(...unFollower);
            getUserDetails(globalUnFollows, 2);
        }

        prevFollowers = followers;

        PrFollower.updateOne({}, {
            array: prevFollowers
        }, optns, errFn);

        GlFollow.updateOne({}, {
            array: globalFollows
        }, optns, errFn);

        GlUnFollow.updateOne({}, {
            array: globalUnFollows
        }, optns, errFn);

        FoDetail.updateOne({}, {
            array: followersDetails
        }, optns, errFn);

        UnFoDetail.updateOne({}, {
            array: unFollowersDetails
        }, optns, errFn);
    });
}

getData();

setInterval(() => {
    getData();
}, 60000);

app.get("/", (req, res) => {
    res.render("index", {
        followersDetails,
        unFollowersDetails
    });
});

app.listen(process.env.PORT, () =>
    console.log(`Server started on port ${process.env.PORT}`)
);