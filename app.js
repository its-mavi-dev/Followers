const express = require("express");
const request = require('request');
require("dotenv").config();
const app = express();

app.use(express.static("public"));
app.set("view engine", 'ejs');

var prevFollowers = [],
    globalFollows = [],
    globalUnFollows = [],
    followersDetails = [],
    unFollowersDetails = [];

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

        // if (prevFollowers.length === 0)
        //     console.table(followers0);

        followers = followers0.map((element) => element.id);

        var newFollower = []; //New Followers
        newFollower = diffFollowers(prevFollowers, followers);
        var unFollower = []; //unFollower
        unFollower = diffFollowers(followers, prevFollowers);

        if (newFollower.length !== 0) {
            // console.log("New Followers");
            // console.table(newFollower);
            globalFollows.push(...newFollower);
            followersDetails = getUserDetails(globalFollows, 1);
        }
        if (unFollower.length !== 0) {
            // console.log("unFollowers");
            // console.table(unFollower);
            globalUnFollows.push(...unFollower);
            unFollowersDetails = getUserDetails(globalUnFollows, 2);
        }

        prevFollowers = followers;
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