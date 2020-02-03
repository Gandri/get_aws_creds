#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const colors = require("colors");
const yargs = require("yargs");
const exec = require("child_process").exec;

const argv = yargs.option("profile", {
    alias: "p",
    describe: "Profile to update credentials for (should be the same as in your .oktaws file). If no profile is specified all profiles defined will be updated"
}).options("default", {
    alias: "d",
    boolean: true,
    describe: "Updates the default credentials in your aws .credentials file"
}).argv;

function clearDefaultIfPresent(credentials) {
    const credentialParts = credentials.split(/(?=\[\w+\])/);

    return credentialParts.reduce((newCredentials, credentialPart) => {
        if(credentialPart.indexOf("[default]") < 0) {
            return newCredentials + credentialPart;
        }
        return newCredentials;
    }, "");
}

function writeAwsCredentials() {
    const credentialPath = path.join(process.env.HOME, ".aws/credentials");
    let credentials = fs.readFileSync(credentialPath).toString();
    credentials = clearDefaultIfPresent(credentials);
    const credentialParts = credentials.split(/(?<=\[\w+\])/);
    let newCredentials = "";

    for(let i = 0; i < credentialParts.length; i++) {
        if(credentialParts[i] === `[${argv.profile}]`) {
            const credentialContents = credentialParts[i + 1];
            newCredentials = `[default]${credentialContents}${credentials}`;
            break;
        }
    }

    fs.writeFileSync(credentialPath, newCredentials || credentials);
}

function callOktaws() {
    return new Promise((resolve, reject) => {
        exec(`oktaws ${argv.profile}`, (err) => {
            if (err) {
                reject(err);
            }

            resolve();
        });
    });
}

function sourceBashProfile() {
    return new Promise((resolve, reject) => {
        const bashProfilePath = path.join(process.env.HOME, ".bash_profile");
        exec(`source ${bashProfilePath}`, (err) => {
            if (err) {
                reject(err);
            }

            resolve();
        });
    });
}

async function getAwsCredentials() {
    try {
        await callOktaws();
        const profile = argv.profile || "all profiles";
        console.log(colors.green(`Successfully updated aws credentials for ${profile}`));

        if (argv.default) {
            if (!argv.profile) {
                console.log(colors.yellow("Can only update default if you have specified a profile"));
            } else if (argv.profile === "default") {
                console.log(colors.yellow("Profile is already default"));
            } else {
                console.log(colors.cyan("Updating default credentials"));
                writeAwsCredentials();
            }
        }

        await sourceBashProfile();

        console.log(colors.green("Updated current shell environment"));
    } catch (err) {
        console.log(colors.red(err));
    }
}

getAwsCredentials();

