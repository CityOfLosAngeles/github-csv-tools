const createIssue = (octokit, issueInfo, state = false) => {
  return new Promise((resolve, reject) => {
    octokit.issues.create(issueInfo).then(
      (res) => {
        // console.log("res", res);
        if (res.status === 201) {
          if (state === false) {
            // Success creating the issue and we do not have to close the issue, so we're done.
            resolve(res);
          } else {
            // need to close the issue!
            const issueNumber = res.data.number;
            octokit.issues
              .update({
                owner: issueInfo.owner,
                repo: issueInfo.repo,
                issue_number: issueNumber,
                state,
              })
              .then(
                (editRes) => {
                  resolve(editRes);
                },
                (err) => {
                  reject(err);
                }
              );
          }
        } else {
          // error creating the issue
          reject(res);
        }
      },
      (err) => {
        reject(err);
      }
    );
  });
};

const createPullRequest = (octokit, pullRequestInfo, state = false) => {
  return new Promise((resolve, reject) => {
    octokit.pulls.create({ //https://octokit.github.io/rest.js/v18#pulls-create
      owner: pullRequestInfo.owner,
      repo: pullRequestInfo.repo,
      title: pullRequestInfo.title,
      head: pullRequestInfo.head,
      base: pullRequestInfo.base,
      body: pullRequestInfo.body
    }).then((res) => {
      if(res.status === 201) {
        const issueNumber = res.data.number;
        
        let payload = {
          owner: pullRequestInfo.owner,
          repo: pullRequestInfo.repo,
          issue_number: issueNumber
        }

        let intialNumOfPayloadKeys = Object.keys(payload).length;
        
        if(state !== false) {
          payload.state = state;
        }

        if(pullRequestInfo.labels) {
          payload.labels = pullRequestInfo.labels;
        }

        if(pullRequestInfo.milestone) {
          payload.milestone = pullRequestInfo.milestone;
        }

        if(pullRequestInfo.assignees) {
          payload.assignees = pullRequestInfo.assignees;
        }

        let newNumOfPayloadKeys = Object.keys(payload).length;

        if(newNumOfPayloadKeys > intialNumOfPayloadKeys) {
          octokit.issues // behind the scenes pull requests are issues
              .update(payload) // https://octokit.github.io/rest.js/v18#issues-update
              .then((editRes) => {
                resolve(editRes); // success creating and updating the pull request
              }, 
              (err) => {
                  reject(err); // failed updating pull request
              });
        } else {
          resolve(res); // success creating the pull request and do not have to do anything else
        }

      } else {
        // error creating the pull request
        reject(res);
      }
    },
    (err) => {
      reject(err);
    });
  });
}

module.exports = { createIssue, createPullRequest };
