const DB = require("./db");

function isAllowedEmail(email) {
    const allowedDomains = process.env.ALLOWED_EMAIL ? process.env.ALLOWED_EMAIL.split(",") : "gmail.com";
    const tokens = email.split("@");
    if (tokens.length > 2) {
        return false;
    }
    try {
        return allowedDomains.some((v => v.toLowerCase() === tokens[1].toLowerCase()))
    } catch (e) {
        console.log(e)
    }
    return false;
}

async function getUserProfile(data) {
    const {
        email
    } = data;
    const accounts = await DB.getUser(email);
    if (accounts.length > 1) {
        console.log(account);
        throw new Error(`Incorrect account count. Duplicates not allowed (${email})`);
    } else if (accounts.length === 0) {
        console.log(`${email} does not exist. Creating user...`)
        if (!isAllowedEmail(email)) {
            throw new Error(`{email} is invalid`)
        }
        try {
            const userid = await DB.insert(email, JSON.stringify(data))
        } catch (e) {

        }
    }
    return accounts.pop();
}

module.export = {
    getUserProfile
}