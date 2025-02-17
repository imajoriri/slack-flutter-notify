const { WebClient } = require("@slack/web-api");
const slack = new WebClient(process.env.SLACK_TOKEN);
const githubtoken = process.env.PVT_GITHUB_TOKEN;

const fetchGitHubIssues = async () => {
  // ラベルの配列
  const labels = [
    "f: cupertino",
    "f: material design",
    "a: animation",
    "p: animations",
    "c: proposal",
  ];
  const now = Date.now();
  // 1時間前
  const diffHours = 1;
  const oneHourAgo = new Date(
    now - diffHours * 60 * 60 * 1000 + 9 * 60 * 60 * 1000
  ).toISOString();

  let issues = [];
  for (const label of labels) {
    const singleLabelUrl = `https://api.github.com/repos/flutter/flutter/issues?labels=${encodeURIComponent(
      label
    )}&since=${oneHourAgo}`;
    try {
      const response = await fetch(singleLabelUrl, {
        headers: {
          Authorization: `Bearer ${githubtoken}`,
        },
      });
      if (response.ok) {
        console.log(singleLabelUrl);
        const labelIssues = await response.json();
        issues = [...issues, ...labelIssues];
      } else {
        console.log(response);
        // エラーをthrow
        throw new Error("GitHub API request failed");
      }
    } catch (error) {
      console.error("Error fetching GitHub issues:", error);
    }
  }

  // 重複を除去
  issues = [...new Set(issues.map((issue) => JSON.stringify(issue)))].map(
    (str) => JSON.parse(str)
  );

  console.log(issues.length);
  // 新規作成されたissueをSlackに投稿;
  for (const issue of issues) {
    const isPR = issue.pull_request ? "PR" : "Issue";
    const time = new Date(issue.created_at).toLocaleString();
    const message = `[Created][${isPR}] ${time} - #${issue.number}: ${issue.title} ${issue.html_url}`;

    try {
      console.log(message);
      // await slack.chat.postMessage({
      //   channel: "#flutter",
      //   text: message,
      // });
    } catch (error) {
      console.error("Error posting to Slack:", error);
    }
  }
};

fetchGitHubIssues();
