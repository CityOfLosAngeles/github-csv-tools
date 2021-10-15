const csv = require("csv");
const fs = require("fs");

const { createIssue, createPullRequest } = require("./helpers.js");

const importFile = (octokit, file, values) => {
  fs.readFile(file, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading file.");
      process.exit(1);
    }
    csv.parse(
      data,
      {
        trim: true,
      },
      (err, csvRows) => {
        if (err) throw err;
        var cols = csvRows[0].map(col => col.toLowerCase());
        csvRows.shift();

        // get indexes of the fields we need
        var titleIndex = cols.indexOf("title");
        var bodyIndex = cols.indexOf("body");
        var labelsIndex = cols.indexOf("labels");
        var milestoneIndex = cols.indexOf("milestone");
        var assigneeIndex = cols.indexOf("assignee");
        var stateIndex = cols.indexOf("state");

        if (titleIndex === -1) {
          console.error("Title required by GitHub, but not found in CSV.");
          process.exit(1);
        }
        const createPromises = csvRows.map((row) => {
          var sendObj = {
            owner: values.userOrOrganization,
            repo: values.repo,
            title: row[titleIndex],
          };

          // if we have a body column, pass that.
          if (bodyIndex > -1) {
            sendObj.body = row[bodyIndex];
          }

          // if we have a labels column, pass that.
          if (labelsIndex > -1 && row[labelsIndex] !== "") {
            sendObj.labels = row[labelsIndex].split(",");
          }

          // if we have a milestone column, pass that.
          if (milestoneIndex > -1 && row[milestoneIndex] !== "") {
            sendObj.milestone = row[milestoneIndex];
          }

          // if we have an assignee column, pass that.
          if (assigneeIndex > -1 && row[assigneeIndex] !== "") {
            sendObj.assignees = row[assigneeIndex].replace(/ /g, "").split(",");
          }

          // console.log("sendObj", sendObj);
          let state = false;
          if (stateIndex > -1 && row[stateIndex] === "closed") {
            state = row[stateIndex];
          }

          // if we are importing pull requests
          if(values.importPullRequests) {
            
            var headIndex = cols.indexOf("head");
            var baseIndex = cols.indexOf("base");

            if(headIndex === -1 || baseIndex === -1) {
              console.error("'head and 'base' is required while importing pull requests, but not found in CSV.");
              process.exit(1);
            }

            if(headIndex > -1 && row[headIndex] === "") {
              console.log(row[headIndex]);
              console.error("'head value is required for every single row while importing pull requests, but found empty value(s) for the 'head' column of the CSV file.");
              process.exit(1);
            }

            if(baseIndex > -1 && row[baseIndex] === "") {
              console.log(row[baseIndex]);
              console.error("'base value is required for every single row while importing pull requests, but found empty value(s) for the 'base' column of the CSV file.");
              process.exit(1);
            }

            sendObj.head = row[headIndex];
            sendObj.base = row[baseIndex];
            return createPullRequest(octokit, sendObj, state);
          }

          return createIssue(octokit, sendObj, state);
        });

        Promise.all(createPromises).then(
          (res) => {
            const successes = res.filter((cr) => {
              return cr.status === 200 || cr.status === 201;
            });
            const fails = res.filter((cr) => {
              return cr.status !== 200 && cr.status !== 201;
            });

            console.log(
              `Created ${successes.length} issues / pull requests, and had ${fails.length} failures.`
            );
            console.log(
              "❤ ❗ If this project has provided you value, please ⭐ star the repo to show your support: ➡ https://github.com/gavinr/github-csv-tools"
            );

            if (fails.length > 0) {
              console.log(fails);
            }

            process.exit(0);
          },
          (err) => {
            console.error("Error");
            console.error(err);
            process.exit(0);
          }
        );
      }
    );
  });
};

module.exports = { importFile };
