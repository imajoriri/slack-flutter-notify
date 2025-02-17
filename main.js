const { WebClient } = require("@slack/web-api");
const slack = new WebClient(process.env.SLACK_TOKEN);
const githubtoken = process.env.PVT_GITHUB_TOKEN;

const Colors = {
  gitHubOpen: "#1f883d",
  gitHubClosed: "#8250df",
};

/// Issueのclass
class GitHubIssue {
  constructor(issue) {
    // タイトル
    this.title = issue.title;
    // 内容
    this.body = issue.body;
    // URL
    this.url = issue.html_url;
    // 番号
    this.number = issue.number;
    // Openかどうか
    this.isOpen = issue.state === "open";

    // 作成日
    this.createdAt = new Date(issue.created_at);
    // 更新日
    this.updatedAt = new Date(issue.updated_at);
    // クローズ日
    this.closedAt = issue.closed_at ? new Date(issue.closed_at) : null;

    // Pull Requestかどうか
    this.isPullRequest = issue.pull_request !== undefined;
    // ラベル
    this.labels = issue.labels.map((label) => new GitHubLabel(label));
    // 作成者
    this.user = new GitHubUser(issue.user);
  }
}

class GitHubLabel {
  constructor(label) {
    this.name = label.name;
    this.color = label.color;
  }
}

class GitHubUser {
  constructor(user) {
    this.login = user.login;
    this.avatarUrl = user.avatar_url;
  }
}

const fetchGitHubIssues = async () => {
  // ラベルの配列
  // 参考: https://github.com/flutter/flutter/issues?q=is:issue%20state:open%20label:%22f:%20cupertino%22,%22f:%20material%20design%22,%22a:%20animation%22,%22p:%20animations%22%20
  const labels = [
    "f: cupertino",
    "f: material design",
    "a: animation",
    "p: animations",
  ];
  const now = Date.now();
  // 1時間前
  const diffHours = 1;
  const oneHourAgo = new Date(
    // now - diffHours * 60 * 60 * 1000 + 9 * 60 * 60 * 1000
    now - diffHours * 60 * 60 * 1000
  );
  console.log(`Checking issues since: ${oneHourAgo}`);

  let issues = [];
  for (const label of labels) {
    const singleLabelUrl = `https://api.github.com/repos/flutter/flutter/issues?labels=${encodeURIComponent(
      label
    )}&since=${oneHourAgo.toISOString()}`;

    try {
      const response = await fetch(singleLabelUrl, {
        headers: {
          Authorization: `Bearer ${githubtoken}`,
        },
      });
      if (response.ok) {
        console.log(`Fetched from ${singleLabelUrl}`);
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

  // 新規作成されたissueをSlackに投稿;
  for (const issue of issues) {
    const githubIssue = new GitHubIssue(issue);
    // 作成日かクローズ日が`oneHourAgo`より前のものを除外
    if (
      githubIssue.createdAt < oneHourAgo ||
      (githubIssue.closedAt && githubIssue.closedAt < oneHourAgo)
    ) {
      continue;
    }
    console.log(
      "created at:",
      githubIssue.createdAt,
      githubIssue.isPullRequest,
      " ",
      githubIssue.title
    );
    continue;

    try {
      await slack.chat.postMessage({
        channel: "#flutter",
        text: "",
        attachments: [
          {
            color: githubIssue.isOpen ? Colors.gitHubOpen : Colors.gitHubClosed,
            // title
            title: githubIssue.title,
            title_link: githubIssue.url,
            // 内容
            text:
              (githubIssue.body
                ? githubIssue.body.substring(0, 300) +
                  (githubIssue.body.length > 300 ? "..." : "")
                : "") +
              "\n\n" +
              githubIssue.labels.map((label) => `\`${label.name}\``).join(" "),
            author_name: githubIssue.user.login,
            author_icon: githubIssue.user.avatarUrl,
          },
        ],
      });
    } catch (error) {
      console.error("Error posting to Slack:", error);
    }
  }
};

fetchGitHubIssues();
