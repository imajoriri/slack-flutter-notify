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
  ];
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

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
      }
    } catch (error) {
      console.error("Error fetching GitHub issues:", error);
    }
  }

  // 重複を除去
  issues = [...new Set(issues.map((issue) => JSON.stringify(issue)))].map(
    (str) => JSON.parse(str)
  );

  // const newIssues = await newIssuesResponse.json();
  console.log(issues.length);
  // 新規作成されたissueをSlackに投稿;
  for (const issue of issues) {
    const isPR = issue.pull_request ? "PR" : "Issue";
    const time = new Date(issue.created_at).toLocaleString();
    const message = `[Created][${isPR}] ${time} - #${issue.number}: ${issue.title} ${issue.html_url}`;

    try {
      await slack.chat.postMessage({
        channel: "#flutter",
        text: message,
      });
    } catch (error) {
      console.error("Error posting to Slack:", error);
    }
  }

  // closeされたissueの取得
  // const closedIssuesResponse = await fetch(
  //   `https://api.github.com/repos/flutter/flutter/issues?state=closed&since=${oneHourAgo}`
  // );

  // if (!closedIssuesResponse.ok) {
  //   throw new Error("GitHub API request failed for closed issues");
  // }

  // const closedIssues = await closedIssuesResponse.json();

  // closeされたissueのフィルタリング
  // const recentClosedIssues = closedIssues.filter((issue) => {
  //   return new Date(issue.closed_at) > new Date(oneHourAgo);
  // });

  // closeされたissueをSlackに投稿
  // for (const issue of recentClosedIssues) {
  //   const isPR = issue.pull_request ? 'PR' : 'Issue';
  //   const time = new Date(issue.closed_at).toLocaleString();
  //   const message = `[Closed][${isPR}] ${time} - #${issue.number}: ${issue.title} ${issue.html_url}`;

  //   try {
  //     await slack.chat.postMessage({
  //       channel: '#flutter',
  //       text: message,
  //     });
  //   } catch (error) {
  //     console.error('Error posting to Slack:', error);
  //   }
  // }

  // closeされたissueの出力
  // recentClosedIssues.forEach((issue) => {
  //   const isPR = issue.pull_request ? "PR" : "Issue";
  //   const time = new Date(issue.closed_at).toLocaleString();
  //   console.log(
  //     `[Closed][${isPR}] ${time} - #${issue.number}: ${issue.title} (${issue.html_url})`
  //   );
  // });
};

fetchGitHubIssues();
